const API_URL = 'https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php';
const API_TOKEN = 'Q3d4RzZZd2NvSklyb2dUeHRLTTV3cndEdWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv';

async function fetchData() {
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
    
    // O endpoint Maua_Eap.php pode retornar arrays diferentes (ccs, wbs, etc)
    // Vamos extrair a lista bruta para filtrar cod_ccusto, descr_ccusto e status
    let list = [];
    if (Array.isArray(data)) {
        list = data;
    } else if (data.ccs) {
        list = data.ccs;
    } else if (data.cc) {
        list = data.cc;
    } else if (data.wbs) {
        list = data.wbs;
    }

    const result = list.map(item => ({
      cod_ccusto: item.cod_ccusto,
      descr_ccusto: item.descr_ccusto,
      status: item.status
    }));

    // Remover duplicatas de cod_ccusto
    const uniqueResult = [];
    const seen = new Set();
    for (const item of result) {
      if (!seen.has(item.cod_ccusto)) {
        seen.add(item.cod_ccusto);
        uniqueResult.push(item);
      }
    }

    console.log(JSON.stringify(uniqueResult, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

fetchData();
