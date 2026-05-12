const API_BASE_URL = 'https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php';
const API_TOKEN = 'Q3d4RzZZd2NvSklyb2dUeHRLTTV3cndEdWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv';

export interface ExternalWbsItem {
  // Definir com base na resposta da API externa
  [key: string]: any;
}

export interface ExternalOptionsItem {
  // Definir com base na resposta da API externa
  [key: string]: any;
}

async function fetchFromExternalAPI(): Promise<any> {
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
    return data.wbs || data || [];
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
      ossData.map((item: any) => item.OS || item.os || item)
    )).filter(Boolean).sort();
    
    return { ccs, oss: uniqueOss };
  } catch (error) {
    console.error('Error fetching options:', error);
    return { ccs: [], oss: [] };
  }
}
