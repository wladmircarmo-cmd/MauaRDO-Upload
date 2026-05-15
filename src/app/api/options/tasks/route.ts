import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizeCode(value: string | number | null | undefined) {
  const text = String(value ?? "").trim();
  return text.replace(/^0+/, "") || "0";
}

interface ExternalTaskRow {
  id_eap: string;
  wbs: string;
  cod_ccusto: string;
  descr_ccusto: string | null;
  os: string | null;
  cod_os: string | null;
  descr_os: string | null;
  cod_atividade: string | null;
  descr_atividade: string | null;
  status: string | null;
  raw_data?: Record<string, unknown> | null;
}

function formatTask(row: ExternalTaskRow) {
  return {
    ...(row.raw_data || {}),
    id_eap: row.id_eap,
    wbs: row.wbs,
    cod_ccusto: row.cod_ccusto,
    descr_ccusto: row.descr_ccusto || undefined,
    os: row.os || row.cod_os || undefined,
    OS: row.os || row.cod_os || undefined,
    cod_os: row.cod_os || row.os || undefined,
    descr_os: row.descr_os || undefined,
    cod_atividade: row.cod_atividade || undefined,
    descr_atividade: row.descr_atividade || undefined,
    status: row.status,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const os = searchParams.get("os");
  const cc = searchParams.get("cc");

  console.log("Fetching tasks with params:", { os, cc });

  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from("external_eap_tasks")
      .select("id_eap, wbs, cod_ccusto, descr_ccusto, os, cod_os, descr_os, cod_atividade, descr_atividade, status, raw_data")
      .order("os", { ascending: true })
      .order("wbs", { ascending: true });

    if (cc) {
      console.log("Filtering by cod_ccusto:", cc);
      query = query.or(`cod_ccusto.eq.${cc},cod_ccusto.eq.${normalizeCode(cc)}`);
    }

    if (os) {
      console.log("Filtering by OS:", os);
      query = query.or(`os.eq.${os},cod_os.eq.${os}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const tasks = ((data || []) as ExternalTaskRow[]).map(formatTask);

    console.log("Filtered tasks count:", tasks.length);
    console.log("Sample filtered task:", tasks[0]);

    return NextResponse.json(tasks);
  } catch (error: unknown) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
