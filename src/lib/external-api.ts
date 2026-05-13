const EAP_API_URL = 'https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php';
const CC_API_URL = 'https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php';
const API_TOKEN = 'Q3d4RzZZd2NvSklyb2dUeHRLTTV3cndEdWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv';

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
  cod_ccusto: number;
  data_cadastro: string;
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

async function fetchFromEapAPI(): Promise<EapApiResponse> {
  try {
    const response = await fetch(EAP_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from EAP API:', error);
    throw error;
  }
}

async function fetchFromCcAPI(): Promise<CcApiResponse> {
  try {
    const response = await fetch(CC_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching from CC API:', error);
    throw error;
  }
}

export async function getExternalWbsList(): Promise<ExternalWbsItem[]> {
  try {
    const data = await fetchFromEapAPI();
    // Extrair WBS da resposta da API EAP (ATIVIDADES)
    return data.wbs || (Array.isArray(data) ? data : []) || [];
  } catch (error) {
    console.error('Error fetching WBS list:', error);
    return [];
  }
}

export async function getExternalOptions(filterDate?: string, dateType?: 'start' | 'end' | 'active'): Promise<{
  ccs: CCItem[];
  oss: string[];
}> {
  try {
    // Buscar CCs do endpoint específico
    const ccData = await fetchFromCcAPI();
    console.log('CC API Response:', ccData);
    
    // Tentar diferentes estruturas de dados para CC
    let ccs: CCItem[] = [];
    
    console.log('CC Data type:', typeof ccData);
    console.log('CC Data is array:', Array.isArray(ccData));
    console.log('CC Data keys:', Object.keys(ccData));
    
    if (ccData.ccs) {
      ccs = ccData.ccs as unknown as CCItem[];
    } else if (ccData.cc) {
      ccs = ccData.cc as unknown as CCItem[];
    } else if (Array.isArray(ccData)) {
      ccs = ccData as unknown as CCItem[];
    } else if (typeof ccData === 'object' && ccData !== null) {
      // Se for um objeto, tentar extrair arrays ou converter objeto para array
      const arrays = Object.values(ccData).filter(Array.isArray);
      if (arrays.length > 0) {
        ccs = arrays[0] as unknown as CCItem[];
      } else {
        // Se não encontrar arrays, converter o objeto inteiro para array de um item
        ccs = [ccData as unknown as CCItem];
      }
    }
    
    // Remover duplicatas baseado em cod_ccusto
    const uniqueCcs = Array.from(new Set(ccs.map((cc: CCItem) => cc.cod_ccusto)))
      .map((cod_ccusto) => ccs.find((cc: CCItem) => cc.cod_ccusto === cod_ccusto));

    // Filtrar CCs com status = 'Em Progresso' e validade da data
    const filteredCcs = uniqueCcs.filter((cc: CCItem | undefined): cc is CCItem => {
      if (!cc) return false;
      
      // Sempre filtrar por status 'Em Progresso'
      if ((cc as CCItem & { status?: string }).status !== 'Em Progresso') return false;

      // Se houver uma data de filtro, aplicar a lógica correspondente
      if (filterDate) {
        // Normalizar strings de data para comparação (YYYY-MM-DD)
        const selected = filterDate;
        const start = cc.data_inicio ? String(cc.data_inicio).split(' ')[0] : null;
        const end = cc.data_fim ? String(cc.data_fim).split(' ')[0] : null;

        if (dateType === 'start') {
          return start === selected;
        } else if (dateType === 'end') {
          return end === selected;
        } else {
          // Lógica 'active' (entre início e fim)
          if (start && selected < start) return false;
          if (end && selected > end) return false;
        }
      } else {
        // Fallback: se não houver data, manter o filtro original de data_cadastro
        if (!cc.data_cadastro) return false;
        const startDate = new Date(cc.data_cadastro as string);
        const cutoffDate = new Date('2026-01-01');
        if (startDate <= cutoffDate) return false;
      }
      
      return true;
    });
    
    console.log('Filtered CCs:', filteredCcs);
    console.log('CCs length before filter:', ccs.length);
    console.log('CCs length after filter:', filteredCcs.length);
    
    // Buscar OSs do endpoint EAP
    const eapData = await fetchFromEapAPI();
    const ossData = eapData.oss || eapData.os || [];
    const uniqueOss = Array.from(new Set(
      ossData.map((item: ExternalOptionsItem | string) => {
        if (typeof item === 'string') return item;
        return (item as { OS?: string; os?: string; [key: string]: unknown }).OS || 
               (item as { OS?: string; os?: string; [key: string]: unknown }).os || 
               String(item);
      })
    )).filter(Boolean).sort() as string[];
    
    return { ccs: filteredCcs, oss: uniqueOss };
  } catch (error) {
    console.error('Error fetching options:', error);
    return { ccs: [], oss: [] };
  }
}
