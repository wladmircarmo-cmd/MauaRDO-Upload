const API_TOKEN = 'Q3d4RzZZd2NvSklyb2dUeHRLTTV3cndEdWtyc3ExT3lmV2x6aXJkY3RPNFVwdHlv';

async function tryAltEndpoint() {
  const url = 'https://scp.estaleiromaua.ind.br/_api/Maua_Cc.php';
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log('Endpoint alternativo não disponível (404 ou 403)');
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

tryAltEndpoint();
