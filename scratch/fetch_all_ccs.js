const API_URL = 'https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php';
const API_TOKEN = 'Q3d4RzZZd2NvSklyb2dUeHRLTTV3cndEdWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv';

async function fetchAllData() {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const allCcs = new Map();

    // Função para extrair CCs de qualquer objeto
    function extractFrom(obj) {
      if (!obj) return;
      
      if (Array.isArray(obj)) {
        obj.forEach(extractFrom);
        return;
      }

      if (typeof obj === 'object') {
        // Se o objeto tem dados de CC, salvar
        if (obj.cod_ccusto) {
          const cod = String(obj.cod_ccusto).trim();
          if (cod) {
            const existing = allCcs.get(cod);
            allCcs.set(cod, {
              cod_ccusto: cod,
              descr_ccusto: obj.descr_ccusto || existing?.descr_ccusto || 'Sem Descrição',
              status: obj.status || existing?.status || 'N/A'
            });
          }
        }
        
        // Recorrer em todas as propriedades para achar mais arrays ou objetos
        Object.values(obj).forEach(val => {
          if (typeof val === 'object' && val !== null) {
            extractFrom(val);
          }
        });
      }
    }

    // Varre todo o JSON retornado pela API
    extractFrom(data);

    // Converter Map para Array e ordenar por código
    const result = Array.from(allCcs.values()).sort((a, b) => a.cod_ccusto.localeCompare(b.cod_ccusto));

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchAllData();
