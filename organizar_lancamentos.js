const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const categories = fs.readdirSync(rootDir).filter(c => {
    const p = path.join(rootDir, c);
    return fs.statSync(p).isDirectory() && !c.startsWith('.') && c !== 'node_modules' && c !== 'fotos' && c !== 'whatsapp-bot' && c !== 'scratch';
});

// Limpa Markdown e Emojis
function clearText(text) {
    let clean = text.replace(/[*_]/g, ''); // Remove markdown bold/italic
    // Remove emojis e caracteres invisíveis estranhos
    clean = clean.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{2600}-\u{26FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u200D\uFE0F]/gu, '');
    return clean.trim();
}

// Dicionário de cabeçalhos por time
const headers = {
    'Palmeiras': `CAMISA RETRÔ PALMEIRAS\nUm manto histórico para quem carrega a tradição do Verdão no coração!`,
    'C.R Flamengo': `CAMISA RETRÔ FLAMENGO\nReviva as maiores conquistas do Mengão com uma camisa que marcou gerações!`,
    'Cruzeiro': `CAMISA RETRÔ CRUZEIRO\nUm clássico da Raposa para quem nunca deixa de acreditar nas cinco estrelas!`,
    'Atlético Mineiro': `CAMISA RETRÔ ATLÉTICO MINEIRO\nVista a paixão pelo Galo com um manto que faz parte da história do clube!`,
    'Bahia': `CAMISA RETRÔ BAHIA\nUm clássico para quem tem orgulho de vestir as cores do Esquadrão de Aço!`,
    'Botafogo F.R': `CAMISA RETRÔ BOTAFOGO\nReviva a história do Glorioso com um dos mantos mais marcantes do futebol brasileiro!`,
    'Fluminense F.C': `CAMISA RETRÔ FLUMINENSE\nUm manto inesquecível para quem honra a tradição do Tricolor das Laranjeiras!`,
    'São Paulo': `CAMISA RETRÔ SÃO PAULO\nA história do Tricolor Paulista estampada em uma camisa que marcou época!`,
    'Santos': `CAMISA RETRÔ SANTOS\nUm verdadeiro clássico do Peixe, inspirado na tradição de um dos maiores clubes do mundo!`,
    'Corinthians': `CAMISA RETRÔ CORINTHIANS\nDemonstre sua paixão pelo Timão com um manto que atravessou gerações!`,
    'Grêmio': `CAMISA RETRÔ GRÊMIO\nUm clássico do Imortal para quem vive cada jogo com raça e paixão!`,
    'Vasco da Gama': `CAMISA RETRÔ VASCO DA GAMA\nVista a tradição do Gigante da Colina com um manto que fez história!`,
    'Real Madrid': `CAMISA RETRÔ REAL MADRID\nReviva a história do maior campeão da Europa com um manto que marcou gerações!`,
    'Milan': `CAMISA RETRÔ MILAN\nUm clássico Rossonero para quem valoriza a tradição de um dos gigantes da Itália!`,
    'Arsenal': `CAMISA RETRÔ ARSENAL\nVista a elegância e a tradição dos Gunners com um manto inesquecível!`,
    'Chelsea': `CAMISA RETRÔ CHELSEA\nDemonstre sua paixão pelos Blues com uma camisa que fez história em Londres!`,
    'Liverpool': `CAMISA RETRÔ LIVERPOOL\nYou'll Never Walk Alone! Reviva os grandes momentos dos Reds com um manto histórico!`,
    'Barcelona': `CAMISA RETRÔ BARCELONA\nUm clássico do Barça para quem vive o verdadeiro futebol arte!`,
    'Manchester United': `CAMISA RETRÔ MANCHESTER UNITED\nReviva a era de ouro dos Red Devils com uma camisa que marcou o futebol mundial!`,
    'Juventus': `CAMISA RETRÔ JUVENTUS\nUm manto histórico da Vecchia Signora para quem valoriza tradição e conquistas!`,
    'Bayern de Munique': `CAMISA RETRÔ BAYERN DE MUNIQUE\nVista a grandeza do gigante alemão com uma camisa repleta de história!`,
    'Borussia Dortmund': `CAMISA RETRÔ BORUSSIA DORTMUND\nA paixão da Muralha Amarela em um manto que representa raça e tradição!`,
    'Paris Saint-Germain': `CAMISA RETRÔ PARIS SAINT-GERMAIN\nLeve a elegância do PSG com uma camisa que marcou diferentes gerações!`,
    'Internazionale de Milão': `CAMISA RETRÔ INTERNAZIONALE DE MILÃO\nVista as cores da Inter com um manto histórico de um dos maiores clubes da Itália!`,
    'Manchester City': `CAMISA RETRÔ MANCHESTER CITY\nReviva momentos inesquecíveis dos Citizens com uma camisa cheia de tradição!`
};

const defaultHeader = `CAMISA DE FUTEBOL IMPORTADA\nProduto importado sob encomenda da mais alta qualidade!`;

const sizeCharts = {
    'Torcedor': `TABELA DE MEDIDAS (Torcedor/Masculino)
| TAM | COMPR. | LARGURA | ALTURA  | PESO    |
| --- | ------ | ------- | ------- | ------- |
| P   | 69-71  | 53-55   | 162-170 | 50-62   |
| M   | 71-73  | 55-57   | 170-176 | 62-78   |
| G   | 73-75  | 57-59   | 176-182 | 78-83   |
| GG  | 75-78  | 58-60   | 182-190 | 83-90   |
| 2XL | 78-81  | 60-62   | 190-195 | 90-97   |
| 3XL | 81-83  | 62-64   | 192-197 | 97-104  |
| 4XL | 83-85  | 64-65   | 197-200 | 104-110 |`,
    'Retro': `TABELA DE MEDIDAS (Torcedor/Masculino)
| TAM | COMPR. | LARGURA | ALTURA  | PESO    |
| --- | ------ | ------- | ------- | ------- |
| P   | 69-71  | 53-55   | 162-170 | 50-62   |
| M   | 71-73  | 55-57   | 170-176 | 62-78   |
| G   | 73-75  | 57-59   | 176-182 | 78-83   |
| GG  | 75-78  | 58-60   | 182-190 | 83-90   |
| 2XL | 78-81  | 60-62   | 190-195 | 90-97   |
| 3XL | 81-83  | 62-64   | 192-197 | 97-104  |
| 4XL | 83-85  | 64-65   | 197-200 | 104-110 |`,
    'Manga Longa': `TABELA DE MEDIDAS (Torcedor/Masculino)
| TAM | COMPR. | LARGURA | ALTURA  | PESO    |
| --- | ------ | ------- | ------- | ------- |
| P   | 69-71  | 53-55   | 162-170 | 50-62   |
| M   | 71-73  | 55-57   | 170-176 | 62-78   |
| G   | 73-75  | 57-59   | 176-182 | 78-83   |
| GG  | 75-78  | 58-60   | 182-190 | 83-90   |
| 2XL | 78-81  | 60-62   | 190-195 | 90-97   |
| 3XL | 81-83  | 62-64   | 192-197 | 97-104  |
| 4XL | 83-85  | 64-65   | 197-200 | 104-110 |`,
    'Jogador': `TABELA DE MEDIDAS (Jogador)
| TAM | COMPR. | LARGURA | ALTURA  | PESO   |
| --- | ------ | ------- | ------- | ------ |
| P   | 67-69  | 49-51   | 162-170 | 50-62  |
| M   | 69-71  | 51-53   | 170-175 | 62-78  |
| G   | 71-73  | 53-55   | 175-180 | 78-83  |
| GG  | 73-76  | 55-57   | 180-185 | 83-90  |
| 2XL | 76-78  | 57-60   | 185-190 | 90-97  |
| 3XL | 78-79  | 60-63   | 190-195 | 97-104 |`,
    'Feminina': `TABELA DE MEDIDAS (Feminina)
| TAM | COMPR. | BUSTO | ALTURA  | PESO |
| --- | ------ | ----- | ------- | ---- |
| P   | 61-63  | 40-41 | 150-160 | -    |
| M   | 63-66  | 41-44 | 160-165 | -    |
| G   | 66-69  | 44-47 | 165-170 | -    |
| GG  | 69-71  | 47-50 | 170-175 | -    |`,
    'Kids': `TABELA DE MEDIDAS (Infantil)
| TAM | IDADE | LARGURA | ALTURA  | COMPR. | CINTU. |
| --- | ----- | ------- | ------- | ------ | ------ |
| 16  | 3-4   | 35-37   | 95-105  | 44-47  | 20-37  |
| 18  | 4-5   | 37-39   | 105-115 | 47-50  | 21-39  |
| 20  | 5-6   | 39-41   | 115-125 | 50-53  | 22-41  |
| 22  | 6-7   | 41-43   | 125-135 | 53-56  | 23-42  |
| 24  | 8-9   | 43-45   | 135-145 | 56-59  | 24-44  |
| 26  | 10-11 | 45-47   | 145-155 | 59-62  | 25-47  |
| 28  | 12-13 | 47-49   | 155-165 | 62-65  | 26-50  |`,
    'NBA': `TABELA DE MEDIDAS (Regatas NBA)
| TAM | COMPR. | BUSTO | OMBROS | ALTURA  | PESO    |
| --- | ------ | ----- | ------ | ------- | ------- |
| P   | 70     | 98    | 35     | 160-170 | 90-115  |
| M   | 72     | 106   | 37     | 168-175 | 115-135 |
| G   | 75     | 112   | 39     | 172-180 | 145-165 |
| GG  | 77     | 120   | 41     | 178-185 | 165-185 |
| 2XL | 80     | 130   | 44     | 183-200 | 180-210 |`
};

const customInfo = `
TAMANHOS EXTRAS
XXL e XXXL: + R$ 15,00
XXXXL: + R$ 25,00

PERSONALIZE SUA CAMISA!
Deixe seu manto ainda mais especial!
Nome + Número personalizados por apenas R$ 25,00.

ENVIO
Postagem em até 3 dias úteis após a confirmação do pagamento.
Código de rastreamento enviado após a postagem.

DÚVIDAS OU PEDIDOS ESPECIAIS?
Para personalização ou tamanho diferenciado, chame na nossa loja no WhatsApp: 21 97073-4956
`;

function getProductInfo(productName, category) {
    let type = '';
    let price = 145; 
    let pLow = productName.toLowerCase();
    
    if (category === 'NBA' || pLow.includes('nba') || pLow.includes('basquete')) { type = 'NBA'; price = 210; } 
    else if (pLow.includes('kit corta-vento')) { type = 'Kit Corta-vento'; price = 350; } 
    else if (pLow.includes('corta-vento')) { type = 'Corta-vento'; price = 240; } 
    else if (pLow.includes('calça de treino') || pLow.includes('calca de treino')) { type = 'Calça de Treino'; price = 185; } 
    else if (pLow.includes('kit treino manga longa')) { type = 'Kit Treino ML'; price = 285; } 
    else if (pLow.includes('manga longa')) { type = 'Manga Longa'; price = 185; } 
    else if (pLow.includes('shorts') || pLow.includes('short')) { type = 'Shorts'; price = 100; } 
    else if (pLow.includes('jogador') || pLow.includes('player')) { type = 'Jogador'; price = 189.90; } 
    else if (pLow.includes('feminina') || pLow.includes('woman')) { type = 'Feminina'; price = 150; } 
    else if (pLow.includes('kids') || pLow.includes('infantil')) { type = 'Kids'; price = 170; } 
    else {
        const yearMatches = productName.match(/\b(19\d\d|20\d\d)\b/g);
        let isRetro = false;
        if (yearMatches) {
            const maxYear = Math.max(...yearMatches.map(y => parseInt(y, 10)));
            if (maxYear <= 2023) {
                isRetro = true;
            }
        }
        
        if (isRetro || pLow.includes('retro') || pLow.includes('retrô')) {
            type = 'Retro'; price = 175;
        } else {
            type = 'Torcedor'; price = 145;
        }
    }
    
    return { type, price, table: sizeCharts[type] || sizeCharts['Torcedor'] };
}

async function start() {
    const lancamentosFile = path.join(rootDir, 'lancamentos_recentes.json');
    if (!fs.existsSync(lancamentosFile)) {
        console.log('Nenhum arquivo lancamentos_recentes.json encontrado. Encerrando.');
        return;
    }

    const lancamentos = JSON.parse(fs.readFileSync(lancamentosFile, 'utf-8'));

    for (const item of lancamentos) {
        const productPath = item.path;
        if (!fs.existsSync(productPath)) continue;

        const product = item.product;
        const cat = item.category;
        const team = item.team;

        console.log(`Processando Lançamento: ${product}`);

        const fotosPath = path.join(productPath, 'fotos');
        if (!fs.existsSync(fotosPath)) fs.mkdirSync(fotosPath);

        const files = fs.readdirSync(productPath);
        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                fs.renameSync(path.join(productPath, file), path.join(fotosPath, file));
            }
        }

        let header = headers[team] || defaultHeader;
        const info = getProductInfo(product, cat);

        const freteInfo = `FRETE INTERNACIONAL GRÁTIS PARA TODO BRASIL!!\n- Se houver taxa alfandegária, será paga pelo cliente.\n`;
        const anuncioText = `${header}\n\nMODELO: ${product}\n\nVALOR: R$ ${info.price.toFixed(2).replace('.', ',')}\n\n${freteInfo}\n${info.table}\n${customInfo}`;
        fs.writeFileSync(path.join(productPath, 'olx_anuncio.txt'), anuncioText, 'utf-8');

        let possibleSizes = ['P', 'M', 'G', 'GG', '2XL', '3XL', '4XL'];
        if (info.type === 'Kids') possibleSizes = ['16', '18', '20', '22', '24', '26', '28'];
        else if (info.type === 'Feminina') possibleSizes = ['P', 'M', 'G', 'GG'];

        const meta = {
            title: product,
            price: info.price,
            type: info.type,
            category: cat,
            team: team,
            sizes: possibleSizes
        };
        fs.writeFileSync(path.join(productPath, 'wpp_catalogo.json'), JSON.stringify(meta, null, 2), 'utf-8');

        // 5. Cria o texto bonitão pro WhatsApp com Emojis (sem asteriscos que quebram na Meta)
        const freteInfoWpp = `✈️ FRETE INTERNACIONAL GRÁTIS PARA TODO BRASIL!!\n- Se houver taxa alfandegária, será paga pelo cliente.\n`;
        const wppText = `🔥 ${header.replace(/\n/, ' 🔥\n')}

⚽ MODELO: ${product}

💰 VALOR: R$ ${info.price.toFixed(2).replace('.', ',')}

${freteInfoWpp}
📏 ${info.table}
${customInfo}`;
        fs.writeFileSync(path.join(productPath, 'wpp_anuncio.txt'), wppText, 'utf-8');
    }
    console.log('✅ Apenas os lançamentos foram organizados com sucesso!');
}

start();
