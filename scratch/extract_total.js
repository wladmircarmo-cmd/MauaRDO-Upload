const fs = require('fs');

try {
    const raw = fs.readFileSync('scratch/ccs_deep_list.json');
    let content;
    
    if (raw[0] === 0xFF && raw[1] === 0xFE) {
        content = raw.toString('utf16le');
    } else {
        content = raw.toString('utf8');
    }

    content = content.replace(/^\uFEFF/, '');
    const data = JSON.parse(content);
    
    const allCcs = new Map();
    let totalObjects = 0;

    function findCcs(obj) {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
            obj.forEach(findCcs);
            return;
        }
        totalObjects++;
        if (obj.cod_ccusto) {
            const cod = String(obj.cod_ccusto).trim();
            const descr = (obj.descr_ccusto || obj.descricao_ccusto || 'Sem Descrição').trim();
            const status = (obj.status || 'N/A').trim();
            if (!allCcs.has(cod) || (allCcs.get(cod).descr_ccusto === 'Sem Descrição' && descr !== 'Sem Descrição')) {
                allCcs.set(cod, { cod_ccusto: cod, descr_ccusto: descr, status: status });
            }
        }
        Object.values(obj).forEach(val => {
            if (val && typeof val === 'object') findCcs(val);
        });
    }

    findCcs(data);
    const sortedResult = Array.from(allCcs.values()).sort((a, b) => a.cod_ccusto.localeCompare(b.cod_ccusto));
    
    let md = '# Lista Completa de Centros de Custo (Exaustiva)\n\n';
    md += '| Código | Descrição | Status |\n';
    md += '| :--- | :--- | :--- |\n';
    sortedResult.forEach(c => {
        md += `| **${c.cod_ccusto}** | ${c.descr_ccusto} | ${c.status} |\n`;
    });

    fs.writeFileSync('scratch/lista_ccs_total.md', md, 'utf8');
    console.log('Total de objetos varridos:', totalObjects);
    console.log('Total de CCs únicos encontrados:', sortedResult.length);
} catch (e) {
    console.error('Erro:', e.message);
}
