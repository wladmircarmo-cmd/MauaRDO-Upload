const API_URL = 'https://scp.estaleiromaua.ind.br/_api/Maua_Eap.php';
const API_TOKEN = 'Q3d4RzZZd2NvSklyb2dUeHRLTTV3cndEdWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv';

async function fetchAndProcess() {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const allCcs = new Map();

    function findCcs(obj) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(findCcs);
        return;
      }
      if (obj.cod_ccusto) {
        const cod = String(obj.cod_ccusto).trim();
        const descr = (obj.descr_ccusto || obj.descricao_ccusto || 'Sem Descrição').trim();
        const status = (obj.status || 'N/A').trim();
        if (!allCcs.has(cod)) {
          allCcs.set(cod, { cod_ccusto: cod, descr_ccusto: descr, status: status });
        }
      }
      Object.values(obj).forEach(val => {
        if (val && typeof val === 'object') findCcs(val);
      });
    }

    findCcs(data);
    const sortedResult = Array.from(allCcs.values()).sort((a, b) => a.cod_ccusto.localeCompare(b.cod_ccusto));

    let md = '# Lista Total de Centros de Custo (Exaustiva)\\n\\n';
    md += '| Código | Descrição | Status |\\n';
    md += '| :--- | :--- | :--- |\\n';
    sortedResult.forEach(c => {
      md += `| **${c.cod_ccusto}** | ${c.descr_ccusto} | ${c.status} |\\n`;
    });

    console.log(md);
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

fetchAndProcess();
