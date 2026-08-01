const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const IMGBB_API_KEY = '8b0404e51afb6542d567be344ae4ff11';
const rootDir = __dirname;
const categories = fs.readdirSync(rootDir).filter(c => {
    const p = path.join(rootDir, c);
    return fs.statSync(p).isDirectory() && !c.startsWith('.') && c !== 'node_modules' && c !== 'fotos' && c !== 'whatsapp-bot' && c !== 'scratch';
});

async function uploadImage(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        const form = new FormData();
        form.append('image', fs.createReadStream(filePath));
        const res = await axios.post(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        return res.data.data.url;
    } catch (e) {
        console.error(`Erro ao fazer upload da imagem ${path.basename(filePath)}:`, e.message);
        return null;
    }
}

// Para o CSV funcionar perfeito no Facebook
function escapeCSV(field) {
    if (field === undefined || field === null) return '';
    let str = String(field);
    str = str.replace(/"/g, '""'); // Escape aspas duplas
    // O Meta suporta quebras de linha desde que o campo esteja entre aspas, e já usamos BOM.
    return `"${str}"`;
}

function normalizeId(title) {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
}

async function start() {
    const lancamentosFile = path.join(rootDir, 'lancamentos_recentes.json');
    if (!fs.existsSync(lancamentosFile)) {
        console.log('Nenhum arquivo lancamentos_recentes.json encontrado. Encerrando.');
        return;
    }

    let csvContent = "id,title,description,availability,condition,price,link,image_link,additional_image_link,brand\n";
    let processedCount = 0;

    const lancamentos = JSON.parse(fs.readFileSync(lancamentosFile, 'utf-8'));

    for (const item of lancamentos) {
        const productPath = item.path;
        if (!fs.existsSync(productPath)) continue;

        const product = item.product;
        const metaPath = path.join(productPath, 'wpp_catalogo.json');
        const descPath = path.join(productPath, 'wpp_anuncio.txt');
        
        if (!fs.existsSync(metaPath)) continue;

        let meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        let description = fs.existsSync(descPath) ? fs.readFileSync(descPath, 'utf-8') : product;

        // Faz o Upload da Imagem se ainda não tiver feito
        if (!meta.image_link) {
            console.log(`☁️  Fazendo upload das imagens: ${product}...`);
            const frentePath = path.join(productPath, 'fotos', 'frente.jpg');
            const costasPath = path.join(productPath, 'fotos', 'costas.jpg');

            const linkFrente = await uploadImage(frentePath);
            if (linkFrente) {
                meta.image_link = linkFrente;
                // Tenta upar as costas também se existir
                const linkCostas = await uploadImage(costasPath);
                if (linkCostas) {
                    meta.additional_image_link = linkCostas;
                }
                
                // Salva o JSON atualizado para não precisar upar de novo no futuro!
                fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
            } else {
                console.log(`⚠️ Falha ao obter link para ${product}, pulando do CSV...`);
                continue;
            }
        }

        // Cria o Link de Compra Direto pro Zap com mensagem pronta
        const msg = encodeURIComponent(`Olá! Gostaria de comprar a ${product} por R$ ${meta.price.toFixed(2).replace('.', ',')}.`);
        const zapLink = `https://wa.me/5521970734956?text=${msg}`;

        // Monta a Linha do CSV
        const id = normalizeId(product);
        const title = product;
        const price = `${meta.price.toFixed(2)} BRL`; // Formato exigido pelo Facebook (ex: 145.00 BRL)
        const availability = "in stock";
        const condition = "new";
        const brand = "Manto Mania";
        
        let addImages = meta.additional_image_link || '';

        const row = [
            escapeCSV(id),
            escapeCSV(title),
            escapeCSV(description),
            escapeCSV(availability),
            escapeCSV(condition),
            escapeCSV(price),
            escapeCSV(zapLink),
            escapeCSV(meta.image_link),
            escapeCSV(addImages),
            escapeCSV(brand)
        ].join(',');

        csvContent += row + "\n";
        processedCount++;
        console.log(`✅ Adicionado ao CSV: ${product}`);
    }

    const csvPath = path.join(rootDir, 'lancamentos_meta.csv');
    // Adiciona o BOM UTF-8 (\uFEFF) para o Facebook ler os emojis perfeitamente!
    fs.writeFileSync(csvPath, '\uFEFF' + csvContent, 'utf-8');
    
    console.log(`\n🎉 SUCESSO! ${processedCount} produtos (Lançamentos) foram convertidos.`);
    console.log(`📁 O arquivo [lancamentos_meta.csv] foi criado com sucesso na pasta raiz!`);
}

start();
