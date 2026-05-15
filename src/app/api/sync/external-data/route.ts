import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { envServer } from "@/lib/env.server";
import { fetchExternalSnapshotFromApi, type CCItem, type ExternalWbsItem } from "@/lib/external-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

interface ExternalCcUpsertRow {
  cod_ccusto: string;
  descr_ccusto: string;
  status: string | null;
  data_cadastro: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  raw_data: JsonRecord;
  last_seen_at: string;
}

interface ExternalTaskUpsertRow {
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
  raw_data: JsonRecord;
  last_seen_at: string;
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function toDateText(value: unknown): string | null {
  const text = toText(value);
  if (!text) return null;
  return text.split("T")[0].split(" ")[0] || null;
}

function toJsonRecord(value: unknown): JsonRecord {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonRecord;
}

function uniqueBy<T>(rows: T[], getKey: (row: T) => string): T[] {
  const map = new Map<string, T>();
  rows.forEach((row) => {
    map.set(getKey(row), row);
  });
  return Array.from(map.values());
}

function getTaskOs(task: ExternalWbsItem) {
  return toText(task.OS) || toText(task.os) || toText(task.cod_os);
}

function buildCcRows(ccs: CCItem[], tasks: ExternalWbsItem[], now: string): ExternalCcUpsertRow[] {
  const directRows = ccs
    .map((cc): ExternalCcUpsertRow | null => {
      const codCcusto = toText(cc.cod_ccusto);
      if (!codCcusto) return null;

      return {
        cod_ccusto: codCcusto,
        descr_ccusto: toText(cc.descr_ccusto) || codCcusto,
        status: toText(cc.status),
        data_cadastro: toDateText(cc.data_cadastro),
        data_inicio: toDateText(cc.data_inicio),
        data_fim: toDateText(cc.data_fim),
        raw_data: toJsonRecord(cc),
        last_seen_at: now,
      };
    })
    .filter((row): row is ExternalCcUpsertRow => Boolean(row));

  const existingCodes = new Set(directRows.map((row) => row.cod_ccusto));
  const taskFallbackRows = tasks
    .map((task): ExternalCcUpsertRow | null => {
      const codCcusto = toText(task.cod_ccusto);
      if (!codCcusto || existingCodes.has(codCcusto)) return null;

      existingCodes.add(codCcusto);
      return {
        cod_ccusto: codCcusto,
        descr_ccusto: toText(task.descr_ccusto) || codCcusto,
        status: toText(task.status),
        data_cadastro: null,
        data_inicio: null,
        data_fim: null,
        raw_data: toJsonRecord({
          cod_ccusto: codCcusto,
          descr_ccusto: task.descr_ccusto,
          source: "eap_task_fallback",
        }),
        last_seen_at: now,
      };
    })
    .filter((row): row is ExternalCcUpsertRow => Boolean(row));

  return uniqueBy([...directRows, ...taskFallbackRows], (row) => row.cod_ccusto);
}

function buildTaskRows(tasks: ExternalWbsItem[], now: string): ExternalTaskUpsertRow[] {
  return uniqueBy(
    tasks
      .map((task) => {
        const codCcusto = toText(task.cod_ccusto);
        const wbs = toText(task.wbs);
        const os = getTaskOs(task);
        const idEap = toText(task.id_eap) || [codCcusto, os, wbs].filter(Boolean).join("-");

        if (!codCcusto || !wbs || !idEap) return null;

        return {
          id_eap: idEap,
          wbs,
          cod_ccusto: codCcusto,
          descr_ccusto: toText(task.descr_ccusto),
          os,
          cod_os: toText(task.cod_os) || os,
          descr_os: toText(task.descr_os),
          cod_atividade: toText(task.cod_atividade),
          descr_atividade: toText(task.descr_atividade),
          status: toText(task.status),
          raw_data: toJsonRecord(task),
          last_seen_at: now,
        };
      })
      .filter((row): row is ExternalTaskUpsertRow => Boolean(row)),
    (row) => [row.cod_ccusto, row.os, row.wbs].filter(Boolean).join("|") || row.id_eap,
  );
}

async function upsertInChunks<T extends object>(
  table: string,
  rows: T[],
  onConflict: string,
  chunkSize = 500,
) {
  const supabase = createSupabaseAdminClient();

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk as never[], { onConflict });

    if (error) {
      throw new Error(`Erro ao atualizar ${table}: ${error.message}`);
    }
  }
}

async function handleSync(request: Request) {
  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${envServer.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const startedAt = new Date().toISOString();
  const { data: syncRun, error: syncRunError } = await supabase
    .from("external_sync_runs")
    .insert({
      source: "full",
      status: "running",
      started_at: startedAt,
    })
    .select("id")
    .single();

  if (syncRunError) {
    return NextResponse.json({ error: syncRunError.message }, { status: 500 });
  }

  try {
    const snapshot = await fetchExternalSnapshotFromApi();
    const now = new Date().toISOString();
    const ccRows = buildCcRows(snapshot.ccs, snapshot.wbs, now);
    const taskRows = buildTaskRows(snapshot.wbs, now);

    await upsertInChunks("external_ccs", ccRows, "cod_ccusto");
    await upsertInChunks("external_eap_tasks", taskRows, "id_eap");

    const finishedAt = new Date().toISOString();
    await supabase
      .from("external_sync_runs")
      .update({
        status: "success",
        finished_at: finishedAt,
        rows_received: snapshot.ccs.length + snapshot.wbs.length,
        rows_upserted: ccRows.length + taskRows.length,
        metadata: {
          ccs_received: snapshot.ccs.length,
          tasks_received: snapshot.wbs.length,
          oss_received: snapshot.oss.length,
          ccs_upserted: ccRows.length,
          tasks_upserted: taskRows.length,
        },
      })
      .eq("id", syncRun.id);

    return NextResponse.json({
      ok: true,
      started_at: startedAt,
      finished_at: finishedAt,
      ccs_upserted: ccRows.length,
      tasks_upserted: taskRows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase
      .from("external_sync_runs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: message,
      })
      .eq("id", syncRun.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
