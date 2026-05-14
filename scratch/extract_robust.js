const fs = require('fs');

function tryParse() {
    const filePath = 'scratch/ccs_deep_list.json';
    const raw = fs.readFileSync(filePath);
    let content;

    // Tenta várias decodificações
    const encodings = ['utf8', 'utf16le', 'latin1'];
    
    for (let enc of encodings) {
        try {
            content = raw.toString(enc);
            // Remove BOM e espaços em branco no início/fim
            content = content.replace(/^\uFEFF/, '').trim();
            
            // Se começar com [, tenta dar parse
            if (content.startsWith('[') || content.startsWith('{')) {
                const data = JSON.parse(content);
                console.log(`Sucesso com encoding: ${enc}`);
                return data;
            }
        } catch (e) {
            // Próximo
        }
    }
    throw new Error('Não foi possível fazer o parse do JSON com nenhum encoding conhecido.');
}

try {
    const data = tryParse();
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
    
    let md = '# Lista Total de Centros de Custo (Exaustiva)\n\n';
    md += '| Código | Descrição | Status |\n';
    md += '| :--- | :--- | :--- |\n';
    sortedResult.forEach(c => {
        md += `| **${c.cod_ccusto}** | ${c.descr_ccusto} | ${c.status} |\n`;
    });

    fs.writeFileSync('scratch/lista_ccs_total.md', md, 'utf8');
    console.log('Total de CCs encontrados:', sortedResult.length);
} catch (e) {
    console.error('Erro:', e.message);
}
