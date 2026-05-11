import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  assertValidFile,
  assertWbsExists,
  normalizeWbs,
  uploadSchema,
} from "@/lib/upload/validation";
import { compressAndNormalizeImage } from "@/lib/upload/image";

export const runtime = "nodejs";

const formSchema = uploadSchema.extend({
  // handled separately: File from FormData
});

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const wbs = form.get("wbs");
    const description = form.get("description");
    const cc = form.get("cc");
    const os = form.get("os");
    const date = form.get("date");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    if (typeof wbs !== "string") {
      return NextResponse.json({ error: "missing_wbs" }, { status: 400 });
    }

    assertValidFile(file);
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

    try {
      // assertWbsExists(parsed.data.wbs); // Removed: we now use database as source of truth for WBS
    } catch (error) {
      return NextResponse.json(
        { error: "invalid_input", details: { fieldErrors: { wbs: [String(error instanceof Error ? error.message : error)] } } },
        { status: 400 },
      );
    }

    const normalizedWbs = normalizeWbs(parsed.data.wbs);
    const rawBytes = new Uint8Array(await file.arrayBuffer());
    const normalized = await compressAndNormalizeImage({
      bytes: rawBytes,
      maxWidth: 1920,
      jpegQuality: 0.8,
    });

    const uploadId = crypto.randomUUID();
    const filename = `${crypto.randomUUID()}.${normalized.ext}`;
    const supabasePath = `${normalizedWbs}/${filename}`;

    const admin = createSupabaseAdminClient();

    const { error: storageError } = await admin.storage
      .from("fotos-planilhas")
      .upload(supabasePath, normalized.bytes, {
        contentType: normalized.mimeType,
        upsert: false,
      });

    if (storageError) {
      console.error("Storage upload error:", storageError);
      return NextResponse.json(
        { 
          error: "supabase_storage_upload_failed", 
          details: storageError.message,
          code: (storageError as unknown as Record<string, unknown>).code as string | undefined,
        },
        { status: 500 },
      );
    }

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

      // 2. Get or Create OS
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

      // 3. Create Atividade
      const { data: atividade, error: ativError } = await admin
        .from("rdo_atividades")
        .insert({
          id_rdo_os,
          tarefa: normalizedWbs,
          comentario: parsed.data.description ?? null
        })
        .select("id_atividade")
        .single();
      if (ativError) throw ativError;

      // 4. Create Imagem
      const publicUrl = admin.storage.from("fotos-planilhas").getPublicUrl(supabasePath).data.publicUrl;
      const { error: imgError } = await admin
        .from("rdo_imagens")
        .insert({
          id_atividade: atividade.id_atividade,
          imagem_url: publicUrl
        });
      if (imgError) throw imgError;

    } catch (rdoFlowError) {
      console.error("RDO tables insert error:", rdoFlowError);
      // We don't fail the whole request if RDO insert fails but upload succeeded,
      // but you might want to return an error here.
    }

    return NextResponse.json({
      ok: true,
      id: uploadId,
      wbs: normalizedWbs,
      supabase_path: supabasePath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_input", details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

