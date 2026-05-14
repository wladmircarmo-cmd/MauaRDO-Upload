const fs = require('fs');

function processFile(filePath) {
    try {
        const raw = fs.readFileSync(filePath);
        let content;
        
        // Tenta detectar se é UTF-16 ou UTF-8
        if (raw[0] === 0xFF && raw[1] === 0xFE) {
            content = raw.toString('utf16le');
        } else {
            content = raw.toString('utf8');
        }

        // Remove o BOM se existir
        content = content.replace(/^\uFEFF/, '');
        
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
        console.error('Erro ao processar ' + filePath + ':', error.message);
    }
}

// Tenta os dois arquivos possíveis
processFile('scratch/ccs_deep_list.json');
