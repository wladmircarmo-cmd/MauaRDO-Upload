const API_BASE_URL = 'https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php';
const API_TOKEN = 'Q3d4RzZZd2NvSklyb2dUeHRLTTV3cndEdWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv';

export interface ExternalWbsItem {
  // Definir com base na resposta da API externa
  [key: string]: unknown;
}

export interface ExternalOptionsItem {
  // Definir com base na resposta da API externa
  [key: string]: unknown;
}

interface ExternalApiResponse {
  wbs?: ExternalWbsItem[];
  ccs?: ExternalOptionsItem[];
  oss?: ExternalOptionsItem[];
  cc?: ExternalOptionsItem[];
  os?: ExternalOptionsItem[];
  OS?: string | { OS: string }[];
  [key: string]: unknown;
}

async function fetchFromExternalAPI(): Promise<ExternalApiResponse> {
  try {
    const response = await fetch(API_BASE_URL, {
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
    console.error('Error fetching from external API:', error);
    throw error;
  }
}

export async function getExternalWbsList(): Promise<ExternalWbsItem[]> {
  try {
    const data = await fetchFromExternalAPI();
    // Extrair WBS da resposta da API externa
    return data.wbs || (Array.isArray(data) ? data : []) || [];
  } catch (error) {
    console.error('Error fetching WBS list:', error);
    return [];
  }
}

export async function getExternalOptions(): Promise<{
  ccs: ExternalOptionsItem[];
  oss: string[];
}> {
  try {
    const data = await fetchFromExternalAPI();
    
    // Extrair CCs da resposta
    const ccs = data.ccs || data.cc || [];
    
    // Extrair OSs únicos da resposta
    const ossData = data.oss || data.os || [];
    const uniqueOss = Array.from(new Set(
      ossData.map((item: ExternalOptionsItem | string) => {
        if (typeof item === 'string') return item;
        return (item as { OS?: string; os?: string; [key: string]: unknown }).OS || 
               (item as { OS?: string; os?: string; [key: string]: unknown }).os || 
               String(item);
      })
    )).filter(Boolean).sort() as string[];
    
    return { ccs, oss: uniqueOss };
  } catch (error) {
    console.error('Error fetching options:', error);
    return { ccs: [], oss: [] };
  }
}
