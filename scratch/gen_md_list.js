const fs = require('fs');

try {
    // Ler o arquivo original em UTF-16LE
    const content = fs.readFileSync('scratch/ccs_deep_list.json', 'utf16le');
    const data = JSON.parse(content);

    let markdown = '# Lista Completa de Centros de Custo - Estaleiro Mauá\n\n';
    markdown += '| Código | Descrição | Status |\n';
    markdown += '| :--- | :--- | :--- |\n';

    data.forEach(item => {
        const status = item.status && item.status !== 'N/A' ? item.status : '*N/A*';
        markdown += `| **${item.cod_ccusto}** | ${item.descr_ccusto} | ${status} |\n`;
    });

    markdown += `\n\n--- \n*Total de CCs encontrados: ${data.length}*  \n*Gerado em: ${new Date().toLocaleString('pt-BR')}*`;

    fs.writeFileSync('scratch/lista_ccs_completa.md', markdown, 'utf8');
    console.log('Markdown gerado com sucesso! Total:', data.length);
} catch (error) {
    console.error('Erro ao processar:', error);
}
