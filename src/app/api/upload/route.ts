import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertValidFile,
  normalizeWbs,
  uploadSchema,
} from "@/lib/upload/validation";

export const runtime = "nodejs";

const formSchema = uploadSchema.extend({
  // handled separately: File from FormData
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const cc = formData.get("cc");
    const os = formData.get("os");
    const date = formData.get("date");
    const wbs = formData.get("wbs");
    const description = formData.get("description");
    const files = formData.getAll("file") as File[];

    if (typeof wbs !== "string") {
      return NextResponse.json({ error: "missing_wbs" }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "Nenhuma foto selecionada" }, { status: 400 });
    }

    for (const file of files) {
      assertValidFile(file);
    }

    const parsed = formSchema.safeParse({ 
      wbs, 
      description: typeof description === "string" ? description : undefined,
      cc: typeof cc === "string" ? cc : undefined,
      os: typeof os === "string" ? os : undefined,
      date: typeof date === "string" ? date : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const admin = createSupabaseAdminClient();

    // New RDO logic
    try {
      // 1. Get or Create RDO
      const { data: rdoData, error: rdoError } = await admin
        .from("rdo")
        .select("id_rdo")
        .eq("cc", parsed.data.cc)
        .eq("data_rdo", parsed.data.date)
        .maybeSingle();

      let id_rdo: number;
      if (rdoError) throw rdoError;

      if (!rdoData) {
        const { data: newRdo, error: createRdoError } = await admin
          .from("rdo")
          .insert({ cc: parsed.data.cc, data_rdo: parsed.data.date })
          .select("id_rdo")
          .single();
        if (createRdoError) throw createRdoError;
        id_rdo = newRdo.id_rdo;
      } else {
        id_rdo = rdoData.id_rdo;
      }

      // 2. Get or Create RDO_OS
      const { data: osData, error: osError } = await admin
        .from("rdo_os")
        .select("id_rdo_os")
        .eq("id_rdo", id_rdo)
        .eq("os", parsed.data.os)
        .maybeSingle();

      let id_rdo_os: number;
      if (osError) throw osError;

      if (!osData) {
        const { data: newOs, error: createOsError } = await admin
          .from("rdo_os")
          .insert({ id_rdo, os: parsed.data.os })
          .select("id_rdo_os")
          .single();
        if (createOsError) throw createOsError;
        id_rdo_os = newOs.id_rdo_os;
      } else {
        id_rdo_os = osData.id_rdo_os;
      }

      // 3. Get or Create Atividade
      const normalizedWbs = normalizeWbs(parsed.data.wbs);
      const commentValue = parsed.data.description ?? null;
      
      const { data: ativData, error: ativQueryError } = await admin
        .from("rdo_atividades")
        .select("id_atividade")
        .eq("id_rdo_os", id_rdo_os)
        .eq("tarefa", normalizedWbs)
        .maybeSingle();

      let id_atividade: number;
      if (ativQueryError) throw ativQueryError;

      if (!ativData) {
        const { data: newAtiv, error: createAtivError } = await admin
          .from("rdo_atividades")
          .insert({
            id_rdo_os,
            tarefa: normalizedWbs,
            comentario: commentValue
          })
          .select("id_atividade")
          .single();
        if (createAtivError) throw createAtivError;
        id_atividade = newAtiv.id_atividade;
      } else {
        id_atividade = ativData.id_atividade;
        // Atualizar o comentário e o timestamp de edição
        const { error: updateError } = await admin
          .from("rdo_atividades")
          .update({ 
            comentario: commentValue,
            updated_at: new Date().toISOString() 
          })
          .eq("id_atividade", id_atividade);
        
        if (updateError) throw updateError;
      }

      // 4. Upload Files and Create Images
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadType = formData.get(`uploadType_${i}`) as string | null;

        if (!uploadType || (uploadType !== "camera" && uploadType !== "gallery")) {
          throw new Error(`Tipo de upload inválido para a foto ${i}: ${uploadType}`);
        }

        const prefix = uploadType === "camera" ? "cam" : "gal";
        const fileExt = file.name.split(".").pop();
        const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const supabasePath = `${normalizedWbs}/${fileName}`;

        const { error: uploadError } = await admin.storage
          .from("fotos-planilhas")
          .upload(supabasePath, file);

        if (uploadError) {
          throw new Error(`Erro no Storage (Foto ${i}): ${uploadError.message}`);
        }

        const publicUrl = admin.storage.from("fotos-planilhas").getPublicUrl(supabasePath).data.publicUrl;
        const { error: imgError } = await admin
          .from("rdo_imagens")
          .insert({
            id_atividade,
            imagem_url: publicUrl,
            tipo_envio: uploadType
          });

        if (imgError) {
          throw new Error(`Erro ao vincular imagem no banco (Foto ${i}): ${imgError.message}`);
        }
        
        results.push(supabasePath);
      }

      return NextResponse.json({ 
        success: true, 
        count: results.length,
        paths: results 
      });
    } catch (rdoFlowError) {
      console.error("RDO tables insert error:", rdoFlowError);
      const msg = rdoFlowError instanceof Error ? rdoFlowError.message : "Erro desconhecido no fluxo do RDO";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_input", details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

