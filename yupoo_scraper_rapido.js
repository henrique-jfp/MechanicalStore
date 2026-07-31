const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const LINKS_FILE = path.join(__dirname, 'links_yupoo.txt');

function parseTitle(rawTitle, team) {
    let lower = rawTitle.toLowerCase();
    
    let tipo = 'Torcedor';
    if (lower.includes('women') || lower.includes('pink') || lower.includes('feminina')) tipo = 'Feminina';
    else if (lower.includes('player') || lower.includes('jogador')) tipo = 'Jogador';
    else if (lower.includes('kids') || lower.includes('boy') || lower.includes('infantil')) tipo = 'Kids';
    
    let ano = '';
    const match2627 = rawTitle.match(/26\/?27/);
    const match2425 = rawTitle.match(/24\/?25/);
    const match2324 = rawTitle.match(/23\/?24/);
    const match2223 = rawTitle.match(/22\/?23/);
    const match1415 = rawTitle.match(/14\/?15/);
    const match0708 = rawTitle.match(/07\/?08/);
    const match0001 = rawTitle.match(/00\/?01|0001/);
    const match9798 = rawTitle.match(/97\/?98/);
    const match1920 = rawTitle.match(/19\/?20/);
    
    if (match2627) ano = '2026-2027';
    else if (match2425) ano = '2024-2025';
    else if (match2324) ano = '2023-2024';
    else if (match2223) ano = '2022-2023';
    else if (match1415) ano = '2014-2015';
    else if (match0708) ano = '2007-2008';
    else if (match0001) ano = '2000-2001';
    else if (match9798) ano = '1997-1998';
    else if (match1920) ano = '2019-2020';
    else {
        const yearMatch = rawTitle.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch) ano = yearMatch[1];
        else {
            const shortYear = rawTitle.match(/\b(\d{2})\b/);
            if (shortYear) {
                const y = parseInt(shortYear[1]);
                if (y === 0) ano = '2000';
                else if (y < 30) ano = '20' + shortYear[1];
                else ano = '19' + shortYear[1];
            }
        }
    }
    
    if (!ano) ano = 'Retro'; 
    
    let variation = '';
    const variations = ['home', 'away', 'third', '4th', 'special', 'black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'preta', 'branca', 'amarela', 'roxa', 'goleiro', 'gk', 'treino', 'training', 'portugal', 'grena'];
    for (const v of variations) {
        const regex = new RegExp(`\\b${v}\\b`, 'i');
        if (regex.test(rawTitle)) {
            variation += v.charAt(0).toUpperCase() + v.slice(1) + ' ';
        }
    }
    variation = variation.trim();
    
    if (variation) {
        return `${team} ${tipo} ${ano} ${variation}`.trim();
    }
    
    return `${team} ${tipo} ${ano}`.trim();
}

function getImageName(index) {
    if (index === 0) return 'frente.jpg';
    if (index === 1) return 'costas.jpg';
    if (index === 2) return 'gola.jpg';
    if (index === 3) return 'escudo.jpg';
    if (index === 4) return 'patrocinio.jpg';
    return `detalhe_${index - 4}.jpg`;
}

async function run() {
    if (!fs.existsSync(LINKS_FILE)) return;

    const content = fs.readFileSync(LINKS_FILE, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    console.log("🚀 Iniciando Motor Antiflagrante (Interceptação Nativa)...");
    const browser = await puppeteer.launch({ headless: 'new' });
    
    let currentCategoryPath = '';
    let contextTeam = '';

    for (const line of lines) {
        if (line.startsWith('[') && line.endsWith(']')) {
            const relPath = line.substring(1, line.length - 1);
            currentCategoryPath = path.join(__dirname, relPath);
            contextTeam = relPath.split('/').pop() || '';
            if (!fs.existsSync(currentCategoryPath)) fs.mkdirSync(currentCategoryPath, { recursive: true });
            continue;
        }

        if (line.startsWith('http')) {
            const page = await browser.newPage();
            await page.setCacheEnabled(false);
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            const imageBuffers = [];
            page.on('response', async (response) => {
                const url = response.url();
                if (url.includes('photo.yupoo.com') && response.request().resourceType() === 'image') {
                    try {
                        const buffer = await response.buffer();
                        imageBuffers.push({ url, buffer });
                    } catch(e) {}
                }
            });

            try {
                console.log(`\n🌐 Lendo Álbum Cru: ${line}`);
                await page.goto(line, { waitUntil: 'networkidle2', timeout: 60000 });
                
                // Força o carregamento de todas as imagens instantaneamente
                await page.evaluate(async () => {
                    const images = document.querySelectorAll('img');
                    images.forEach(img => {
                        let realSrc = img.getAttribute('data-origin-src') || img.getAttribute('data-src');
                        if (realSrc && realSrc.includes('photo.yupoo.com')) {
                            if (realSrc.startsWith('//')) realSrc = 'https:' + realSrc;
                            img.src = realSrc;
                        }
                    });
                    
                    // Um pequeno scroll apenas por garantia
                    window.scrollTo(0, document.body.scrollHeight);
                });
                
                // Espera 5 segundos para garantir que todas as imagens grandes terminem de baixar no background
                await new Promise(r => setTimeout(r, 5000));

                let rawTitle = await page.title();
                let smartTitle = parseTitle(rawTitle, contextTeam);
                console.log(`🧠 Convertido para: [${smartTitle}]`);

                const imageUrls = await page.evaluate(() => {
                    const images = document.querySelectorAll('img');
                    const urls = [];
                    images.forEach(img => {
                        let src = img.getAttribute('data-origin-src') || img.getAttribute('data-src') || img.src;
                        if (src && src.includes('photo.yupoo.com') && !src.includes('square')) {
                            if (src.startsWith('//')) src = 'https:' + src;
                            urls.push(src);
                        }
                    });
                    return [...new Set(urls)];
                });

                if (imageUrls.length === 0) {
                    await page.close();
                    continue;
                }

                const productPath = path.join(currentCategoryPath, smartTitle);
                if (!fs.existsSync(productPath)) fs.mkdirSync(productPath, { recursive: true });
                const fotosPath = path.join(productPath, 'fotos');
                if (!fs.existsSync(fotosPath)) fs.mkdirSync(fotosPath, { recursive: true });

                console.log(`📸 Mapeando e salvando ${imageUrls.length} imagens...`);
                
                let savedCount = 0;
                for (let i = 0; i < imageUrls.length; i++) {
                    let url = imageUrls[i];
                    let imageId = url.split('/').pop().split('.')[0];
                    
                    const found = imageBuffers.find(b => b.url.includes(imageId));
                    
                    if (found && found.buffer.length > 1000) { 
                        const filename = getImageName(i);
                        fs.writeFileSync(path.join(fotosPath, filename), found.buffer);
                        process.stdout.write(`👁️  ${filename} `);
                        savedCount++;
                    } else {
                        console.log(`\n[Erro: Buffer não encontrado para ID ${imageId} (URL: ${url})]`);
                    }
                }
                
                console.log(`\n✅ ${smartTitle} Finalizado! Salvou ${savedCount} fotos.`);
                
                // Auto-limpeza do link
                let linesInFile = fs.readFileSync(LINKS_FILE, 'utf-8').split('\n');
                const lineIndex = linesInFile.findIndex(l => l.trim() === line);
                if (lineIndex !== -1) {
                    linesInFile.splice(lineIndex, 1);
                    fs.writeFileSync(LINKS_FILE, linesInFile.join('\n'), 'utf-8');
                }
                
            } catch (e) {
                console.error(`❌ Erro no álbum:`, e.message);
            }
            await page.close();
        }
    }
    await browser.close();
    console.log(`\n🎉 Extração Finalizada! Você já pode rodar organizar_loja.js!`);
}

run();
