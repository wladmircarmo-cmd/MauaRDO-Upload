import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { envServer } from "@/lib/env.server";

const EAP_API_URL = "https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php";
const CC_API_URL = "https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php";

export interface ExternalWbsItem {
  id_eap: number | string;
  wbs: string;
  cod_ccusto: string | number;
  descr_ccusto?: string;
  cod_os?: string | number;
  os?: string | number;
  OS?: string | number;
  descr_os?: string;
  cod_atividade?: string | number;
  descr_atividade?: string;
  status?: string | null;
  [key: string]: unknown;
}

export interface ExternalOptionsItem {
  [key: string]: unknown;
}

export interface CCItem {
  descr_ccusto: string;
  cod_ccusto: number | string;
  data_cadastro: string;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string | null;
  [key: string]: unknown;
}

interface EapApiResponse {
  wbs?: ExternalWbsItem[];
  oss?: ExternalOptionsItem[];
  os?: ExternalOptionsItem[];
  OS?: string | { OS: string }[];
  [key: string]: unknown;
}

interface CcApiResponse {
  ccs?: ExternalOptionsItem[];
  cc?: ExternalOptionsItem[];
  [key: string]: unknown;
}

interface CachedOptionsResult {
  ccs: CCItem[];
  oss: string[];
  hasCache: boolean;
}

interface ExternalCcRow {
  cod_ccusto: string;
  descr_ccusto: string;
  status: string | null;
  data_cadastro: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  raw_data?: Record<string, unknown>;
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
  raw_data?: Record<string, unknown>;
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

function uniqueBy<T>(items: T[], getKey: (item: T) => string | null): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchFromEapAPI(): Promise<EapApiResponse> {
  try {
    const response = await fetch(EAP_API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${envServer.EXTERNAL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from EAP API:", error);
    throw error;
  }
}

async function fetchFromCcAPI(): Promise<CcApiResponse> {
  try {
    const response = await fetch(CC_API_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${envServer.EXTERNAL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching from CC API:", error);
    throw error;
  }
}

function extractCcs(ccData: CcApiResponse): CCItem[] {
  if (ccData.ccs) return ccData.ccs as unknown as CCItem[];
  if (ccData.cc) return ccData.cc as unknown as CCItem[];
  if (Array.isArray(ccData)) return ccData as unknown as CCItem[];

  if (typeof ccData === "object" && ccData !== null) {
    const arrays = Object.values(ccData).filter(Array.isArray);
    if (arrays.length > 0) return arrays[0] as unknown as CCItem[];
    return [ccData as unknown as CCItem];
  }

  return [];
}

function extractWbs(eapData: EapApiResponse): ExternalWbsItem[] {
  return eapData.wbs || (Array.isArray(eapData) ? (eapData as ExternalWbsItem[]) : []) || [];
}

function filterCcs(ccs: CCItem[], filterDate?: string, dateType?: "start" | "end" | "active") {
  const uniqueCcs = uniqueBy(ccs, (cc) => toText(cc.cod_ccusto));

  return uniqueCcs.filter((cc): cc is CCItem => {
    if (!cc) return false;
    if (cc.status !== "Em Progresso") return false;

    if (filterDate) {
      const selected = filterDate;
      const start = toDateText(cc.data_inicio);
      const end = toDateText(cc.data_fim);

      if (dateType === "start") return start === selected;
      if (dateType === "end") return end === selected;
      if (start && selected < start) return false;
      if (end && selected > end) return false;
    } else {
      if (!cc.data_cadastro) return false;
      const startDate = new Date(cc.data_cadastro as string);
      const cutoffDate = new Date("2026-01-01");
      if (startDate <= cutoffDate) return false;
    }

    return true;
  });
}

function extractOss(eapData: EapApiResponse): string[] {
  const ossData = eapData.oss || eapData.os || [];

  return Array.from(
    new Set(
      ossData.map((item: ExternalOptionsItem | string) => {
        if (typeof item === "string") return item;
        return (
          (item as { OS?: string; os?: string }).OS ||
          (item as { OS?: string; os?: string }).os ||
          String(item)
        );
      }),
    ),
  )
    .filter(Boolean)
    .sort() as string[];
}

async function getCachedWbsList(): Promise<ExternalWbsItem[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("external_eap_tasks")
    .select("*")
    .order("wbs", { ascending: true });

  if (error) {
    console.error("Error fetching cached WBS list:", error);
    return [];
  }

  return ((data || []) as ExternalTaskRow[]).map((item) => ({
    id_eap: item.id_eap,
    wbs: item.wbs,
    cod_ccusto: item.cod_ccusto,
    descr_ccusto: item.descr_ccusto || undefined,
    cod_os: item.cod_os || undefined,
    os: item.os || undefined,
    OS: item.os || undefined,
    descr_os: item.descr_os || undefined,
    cod_atividade: item.cod_atividade || undefined,
    descr_atividade: item.descr_atividade || undefined,
    status: item.status,
    ...(item.raw_data || {}),
  }));
}

async function getCachedOptions(
  filterDate?: string,
  dateType?: "start" | "end" | "active",
): Promise<CachedOptionsResult> {
  const supabase = createSupabaseAdminClient();
  const [{ data: ccsData, error: ccsError }, { data: tasksData, error: tasksError }] = await Promise.all([
    supabase.from("external_ccs").select("*").order("descr_ccusto", { ascending: true }),
    supabase.from("external_eap_tasks").select("os").not("os", "is", null),
  ]);

  if (ccsError) {
    console.error("Error fetching cached CCs:", ccsError);
  }

  if (tasksError) {
    console.error("Error fetching cached OS list:", tasksError);
  }

  const cachedCcs = ((ccsData || []) as ExternalCcRow[]).map((cc) => ({
    descr_ccusto: cc.descr_ccusto,
    cod_ccusto: cc.cod_ccusto,
    data_cadastro: cc.data_cadastro || "",
    data_inicio: cc.data_inicio,
    data_fim: cc.data_fim,
    status: cc.status,
    ...(cc.raw_data || {}),
  }));

  const cachedOss = Array.from(
    new Set(((tasksData || []) as Array<{ os: string | null }>).map((item) => item.os).filter(Boolean)),
  ).sort() as string[];

  return {
    ccs: filterCcs(cachedCcs, filterDate, dateType),
    oss: cachedOss,
    hasCache: cachedCcs.length > 0 || cachedOss.length > 0,
  };
}

export async function fetchExternalWbsListFromApi(): Promise<ExternalWbsItem[]> {
  const data = await fetchFromEapAPI();
  return extractWbs(data);
}

export async function fetchExternalOptionsFromApi(filterDate?: string, dateType?: "start" | "end" | "active") {
  const [ccData, eapData] = await Promise.all([fetchFromCcAPI(), fetchFromEapAPI()]);
  const ccs = filterCcs(extractCcs(ccData), filterDate, dateType);
  const oss = extractOss(eapData);

  return { ccs, oss };
}

export async function fetchExternalSnapshotFromApi() {
  const [ccData, eapData] = await Promise.all([fetchFromCcAPI(), fetchFromEapAPI()]);
  return {
    ccs: extractCcs(ccData),
    wbs: extractWbs(eapData),
    oss: extractOss(eapData),
  };
}

export async function getExternalWbsList(): Promise<ExternalWbsItem[]> {
  try {
    const cached = await getCachedWbsList();
    if (cached.length > 0) return cached;

    return await fetchExternalWbsListFromApi();
  } catch (error) {
    console.error("Error fetching WBS list:", error);
    return [];
  }
}

export async function getExternalOptions(
  filterDate?: string,
  dateType?: "start" | "end" | "active",
): Promise<{
  ccs: CCItem[];
  oss: string[];
}> {
  try {
    const cached = await getCachedOptions(filterDate, dateType);
    if (cached.hasCache) return { ccs: cached.ccs, oss: cached.oss };

    return await fetchExternalOptionsFromApi(filterDate, dateType);
  } catch (error) {
    console.error("Error fetching options:", error);
    return { ccs: [], oss: [] };
  }
}
