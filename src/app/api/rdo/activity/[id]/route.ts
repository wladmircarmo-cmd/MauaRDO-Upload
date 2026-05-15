import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const OWNER_EMAILS = new Set([
  "wladmir.carmo@estaleiromaua.ind.br",
  "alexander.araujo@estaleiromaua.ind.br",
]);

type RdoData = {
  id_rdo?: number;
  cc?: string;
  data_rdo?: string;
};

type RdoOsData = {
  id_rdo_os?: number;
  id_rdo?: number;
  os?: string;
  rdo?: RdoData | RdoData[];
};

function getStoragePathFromPublicUrl(url: string) {
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/fotos-planilhas/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;

    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const idAtividade = Number(id);

  if (!Number.isInteger(idAtividade) || idAtividade <= 0) {
    return NextResponse.json({ error: "ID da atividade invalido" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sessao expirada ou usuario nao autenticado" }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const userEmail = (user.email || "").trim().toLowerCase();

    const { data: authorizedUser } = await admin
      .from("authorized_users")
      .select("role")
      .ilike("email", userEmail)
      .maybeSingle();

    let role = authorizedUser?.role ?? null;

    if (!role && OWNER_EMAILS.has(userEmail)) {
      role = "owner";
    }

    if (role !== "admin" && role !== "owner") {
      return NextResponse.json({ error: "Apenas admin e owner podem excluir atividades" }, { status: 403 });
    }

    const { data: activity, error: activityError } = await admin
      .from("rdo_atividades")
      .select(`
        id_atividade,
        id_rdo_os,
        tarefa,
        comentario,
        rdo_os!inner (
          id_rdo_os,
          id_rdo,
          os,
          rdo!inner (
            id_rdo,
            cc,
            data_rdo
          )
        ),
        rdo_imagens (
          id_imagem,
          imagem_url
        )
      `)
      .eq("id_atividade", idAtividade)
      .maybeSingle();

    if (activityError) {
      throw activityError;
    }

    if (!activity) {
      return NextResponse.json({ error: "Atividade nao encontrada" }, { status: 404 });
    }

    const imagens = (activity.rdo_imagens || []) as { id_imagem: number | string; imagem_url: string }[];
    const storagePaths = imagens
      .map((imagem) => getStoragePathFromPublicUrl(imagem.imagem_url))
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await admin.storage
        .from("fotos-planilhas")
        .remove(storagePaths);

      if (storageError) {
        throw new Error(`Erro ao remover fotos do Storage: ${storageError.message}`);
      }
    }

    const { error: imagesDeleteError } = await admin
      .from("rdo_imagens")
      .delete()
      .eq("id_atividade", idAtividade);

    if (imagesDeleteError) {
      throw imagesDeleteError;
    }

    const { error: activityDeleteError } = await admin
      .from("rdo_atividades")
      .delete()
      .eq("id_atividade", idAtividade);

    if (activityDeleteError) {
      throw activityDeleteError;
    }

    const rdoOsData = (Array.isArray(activity.rdo_os) ? activity.rdo_os[0] : activity.rdo_os) as RdoOsData | undefined;
    const rdoData = (rdoOsData && Array.isArray(rdoOsData.rdo) ? rdoOsData.rdo[0] : rdoOsData?.rdo) as RdoData | undefined;
    const idRdoOs = activity.id_rdo_os;
    const idRdo = rdoOsData?.id_rdo;

    if (idRdoOs) {
      const { count: remainingActivities } = await admin
        .from("rdo_atividades")
        .select("id_atividade", { count: "exact", head: true })
        .eq("id_rdo_os", idRdoOs);

      if ((remainingActivities || 0) === 0) {
        const { error: rdoOsDeleteError } = await admin
          .from("rdo_os")
          .delete()
          .eq("id_rdo_os", idRdoOs);

        if (rdoOsDeleteError) {
          throw rdoOsDeleteError;
        }
      }
    }

    if (idRdo) {
      const { count: remainingOs } = await admin
        .from("rdo_os")
        .select("id_rdo_os", { count: "exact", head: true })
        .eq("id_rdo", idRdo);

      if ((remainingOs || 0) === 0) {
        const { error: rdoDeleteError } = await admin
          .from("rdo")
          .delete()
          .eq("id_rdo", idRdo);

        if (rdoDeleteError) {
          throw rdoDeleteError;
        }
      }
    }

    try {
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0] : "internal";

      await admin.from("audit_logs").insert({
        user_id: user.id,
        user_email: user.email,
        action_type: "RDO_DELETE",
        entity_id: idAtividade.toString(),
        ip_address: ip,
        details: {
          cc: rdoData?.cc,
          os: rdoOsData?.os,
          wbs: activity.tarefa,
          rdo_id: idRdo,
          comment: activity.comentario,
          photos_count: imagens.length,
          storage_paths: storagePaths,
        },
      });
    } catch (logError) {
      console.error("Audit log error (non-blocking):", logError);
    }

    return NextResponse.json({
      success: true,
      deleted: {
        id_atividade: idAtividade,
        photos_count: imagens.length,
      },
    });
  } catch (error) {
    console.error("Error deleting RDO activity:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Erro ao excluir atividade",
    }, { status: 500 });
  }
}
