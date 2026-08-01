import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as pino from 'pino';
import * as dotenv from 'dotenv';
import * as qrcode from 'qrcode-terminal';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { Tesoureiro } from './tesoureiro';

dotenv.config();

// Configurações do Groq
if (!process.env.GROQ_API_KEY) {
    console.log("❌ ERRO FATAL: Chave da API do Groq não encontrada no arquivo .env!");
    process.exit(1);
}

const openai = new OpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

const ADMIN_JID = (process.env.ADMIN_NUMBER || "5521970734956") + "@s.whatsapp.net";
let sock: any = null;
let globalBotEnabled = true;
let grupoPedidosJid = ADMIN_JID;

// Histórico de conversas (para manter contexto de múltiplos clientes)
const conversationHistory = new Map<string, Array<{role: 'system' | 'user' | 'assistant', content: string}>>();
// Estado do cliente
const conversationStates = new Map<string, 'NEW' | 'GREETED' | 'WAITING_ADMIN_APPROVAL' | 'SHOPPING' | 'PAUSED_BY_ADMIN' | 'WAITING_PAYMENT' | 'PAID'>();
// Timers de alerta para o Admin
const adminTimers = new Map<string, NodeJS.Timeout>();
const adminAlertCount = new Map<string, number>();
const pendingMessages = new Map<string, string>(); // Armazena a mensagem pendente do cliente
const imageMap = new Map<string, string[]>(); // Mapeia ID do produto -> array de URLs de imagens

// Instancia o Tesoureiro
const tesoureiro = new Tesoureiro(async (jid: string) => {
    conversationStates.set(jid, 'PAID');
    if (sock) {
        try {
            await sock.sendMessage(jid, { text: "🎉 *Pagamento Aprovado!* 🎉\nSua compra foi concluída com sucesso na Manto Mania!\n\n📦 O seu pedido já foi para a nossa central. Em até 3 dias úteis o seu *Código de Rastreio* estará disponível.\nVocê poderá consultá-lo diretamente aqui no chat, no site dos Correios ou na transportadora.\n\nMuito obrigado pela confiança! ⚽" });
            await sock.sendMessage(grupoPedidosJid, { text: `✅ 💰 *PAGAMENTO CONFIRMADO!* O cliente ${jid.split('@')[0]} acabou de pagar o Mercado Pago! Faça o pedido dele no Fornecedor.` });
        } catch (e) {
            console.error("Erro ao enviar mensagem de pós-venda:", e);
        }
    }
});

function getEstoqueEmTexto(): string {
    const csvPath = path.join(__dirname, '../../catalogo_meta.csv');
    if (!fs.existsSync(csvPath)) return "Nenhum produto cadastrado no momento.";

    const content = fs.readFileSync(csvPath, 'utf-8');
    const cleanContent = content.replace(/^\uFEFF/, '');
    
    const items: string[] = [];
    let inQuotes = false;
    let currentField = '';
    let currentRecord: string[] = [];
    
    for (let i = 0; i < cleanContent.length; i++) {
        const char = cleanContent[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            currentField += char;
        } else if (char === ',' && !inQuotes) {
            currentRecord.push(currentField);
            currentField = '';
        } else if (char === '\n' && !inQuotes) {
            currentRecord.push(currentField);
            if (currentRecord.length >= 6) {
                const firstField = currentRecord[0].replace(/^"|"$/g, '');
                if (firstField !== 'id') {
                    const id = firstField;
                    const title = currentRecord[1].replace(/^"|"$/g, '');
                    const price = currentRecord[5].replace(/^"|"$/g, '');
                    const imgUrl1 = currentRecord.length >= 8 ? currentRecord[7].replace(/^"|"$/g, '') : '';
                    const imgUrl2 = currentRecord.length >= 9 ? currentRecord[8].replace(/^"|"$/g, '') : '';
                    const link = currentRecord.length >= 7 ? currentRecord[6].replace(/^"|"$/g, '') : '';
                    
                    const imgs = [];
                    if (imgUrl1 && imgUrl1.trim() !== '') imgs.push(imgUrl1);
                    if (imgUrl2 && imgUrl2.trim() !== '') imgs.push(imgUrl2);
                    
                    if (imgs.length > 0) {
                        imageMap.set(id, imgs);
                    }
                    items.push(`- [ID: ${id}] ${title} | Preço: ${price} | Link: ${link}`);
                }
            }
            currentRecord = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    // Lida com a última linha
    if (currentField !== '' || currentRecord.length > 0) {
        currentRecord.push(currentField);
        if (currentRecord.length >= 6) {
            const firstField = currentRecord[0].replace(/^"|"$/g, '');
            if (firstField !== 'id') {
                const id = firstField;
                const title = currentRecord[1].replace(/^"|"$/g, '');
                const price = currentRecord[5].replace(/^"|"$/g, '');
                const imgUrl1 = currentRecord.length >= 8 ? currentRecord[7].replace(/^"|"$/g, '') : '';
                const imgUrl2 = currentRecord.length >= 9 ? currentRecord[8].replace(/^"|"$/g, '') : '';
                const link = currentRecord.length >= 7 ? currentRecord[6].replace(/^"|"$/g, '') : '';
                
                const imgs = [];
                if (imgUrl1 && imgUrl1.trim() !== '') imgs.push(imgUrl1);
                if (imgUrl2 && imgUrl2.trim() !== '') imgs.push(imgUrl2);
                
                if (imgs.length > 0) {
                    imageMap.set(id, imgs);
                }
                items.push(`- [ID: ${id}] ${title} | Preço: ${price} | Link: ${link}`);
            }
        }
    }

    return items.join('\n');
}

function carregarFotosLocais() {
    const rootDir = path.join(__dirname, '../../');
    const categories = ['NBA', 'Retro UCL', 'Seleções', 'Times do Brasil', 'Times da Espanha', 'Times da Inglaterra', 'Times da Itália', 'Times da Alemanha', 'Times da França'];
    
    console.log("🔍 Mapeando fotos locais do catálogo...");
    for (const cat of categories) {
        const catPath = path.join(rootDir, cat);
        if (!fs.existsSync(catPath)) continue;

        const teams = fs.readdirSync(catPath).filter(t => fs.statSync(path.join(catPath, t)).isDirectory());
        
        for (const team of teams) {
            const teamPath = path.join(catPath, team);
            const products = fs.readdirSync(teamPath).filter(p => fs.statSync(path.join(teamPath, p)).isDirectory());

            for (const product of products) {
                const productPath = path.join(teamPath, product);
                const fotosPath = path.join(productPath, 'fotos');
                
                if (fs.existsSync(fotosPath)) {
                    const id = product.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
                    const files = fs.readdirSync(fotosPath)
                                    .filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg') || f.toLowerCase().endsWith('.png'))
                                    .map(f => path.join(fotosPath, f));
                    
                    if (files.length > 0) {
                        imageMap.set(id, files);
                    }
                }
            }
        }
    }
}


async function askVendedor(jid: string, userMessage: string): Promise<string> {
    if (!conversationHistory.has(jid)) {
        const promptPath = path.join(__dirname, 'prompts', 'vendedor.txt');
        const basePrompt = fs.existsSync(promptPath) ? fs.readFileSync(promptPath, 'utf-8') : 'Você é o vendedor da Manto Mania.';
        const estoqueText = getEstoqueEmTexto();
        const fullSystemPrompt = `${basePrompt}\n\n=== ESTOQUE ATUAL ===\n${estoqueText}`;
        conversationHistory.set(jid, [ { role: 'system', content: fullSystemPrompt } ]);
    }

    const history = conversationHistory.get(jid)!;
    history.push({ role: 'user', content: userMessage });

    if (history.length > 15) {
        history.splice(1, 2); 
    }

    try {
        const response = await openai.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: history as any,
            temperature: 0.7,
            max_tokens: 800,
        });

        let reply = response.choices[0].message.content || '...';
        
        // Mantém a resposta da IA no histórico para ela saber o que falou
        history.push({ role: 'assistant', content: reply });
        
        return reply;
    } catch (error: any) {
        console.error('Erro no Groq:', error?.response?.data || error.message);
        return 'Estou consultando nosso sistema interno no momento, você pode tentar novamente em 1 minuto? 🙏';
    }
}

async function connectToWhatsApp() {
    console.log('⏳ Conectando o Vendedor Automático da Manto Mania aos servidores da Meta...');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        logger: pino.default({ level: 'silent' }) as any
    });

    sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n🤖 ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP BUSINESS:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Conexão fechada. Tentando reconectar...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Vendedor Inteligente Manto Mania ONLINE e aguardando clientes!');
            getEstoqueEmTexto(); // Carrega links do CSV
            carregarFotosLocais(); // Sobrescreve com fotos locais do sistema (Carrossel Completo!)
            console.log(`📦 Produtos carregados na memória da IA: ${imageMap.size}`);
            
            // Busca o grupo "Pedidos Estruturados"
            try {
                const groups = await sock.groupFetchAllParticipating();
                for (const group of Object.values(groups)) {
                    if ((group as any).subject === 'Pedidos Estruturados') {
                        grupoPedidosJid = (group as any).id;
                        console.log(`✅ Grupo "Pedidos Estruturados" encontrado! JID: ${grupoPedidosJid}`);
                        break;
                    }
                }
            } catch (e) {
                console.log("⚠️ Não foi possível buscar os grupos no momento.");
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
        if (type !== 'notify') return;
        
        const m = messages[0];
        if (!m || !m.message) return;

        const jid = m.key.remoteJid;
        
        let text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        
        if (m.message?.productMessage) {
            const prod = m.message.productMessage.product;
            text = `[MENSAGEM DE PRODUTO DO CATÁLOGO] Cliente se interessou por: ${prod?.title}`;
            
            const isAdmin = jid === ADMIN_JID || jid.includes(ADMIN_JID.split('@')[0]) || jid.includes('47188973469733');
            if (isAdmin && prod?.productId) {
                const link = `https://wa.me/p/${prod.productId}/${ADMIN_JID.split('@')[0]}`;
                await sock.sendMessage(jid, { text: `✅ Produto detectado!\n*Nome:* ${prod.title}\n*Link:* ${link}` });
            }
        } else if (m.message?.orderMessage) {
            text = `[CARRINHO DO WHATSAPP] Cliente enviou um carrinho: ${m.message.orderMessage.orderTitle || 'Itens'} - Mensagem do cliente: ${m.message.orderMessage.message || ''}`;
        }
        
        const pushName = m.pushName || 'Cliente';

        const isAdmin = jid === ADMIN_JID || jid.includes(ADMIN_JID.split('@')[0]) || jid.includes('47188973469733');

        // Comandos do Admin
        if (isAdmin || (m.key.fromMe && jid.includes('@s.whatsapp.net'))) {
            const cmd = text.toLowerCase().trim();
            if (cmd === '/thiago off') {
                globalBotEnabled = false;
                await sock.sendMessage(ADMIN_JID, { text: "🛑 Sistema de IA DESLIGADO globalmente." });
                return;
            } else if (cmd === '/thiago on') {
                globalBotEnabled = true;
                await sock.sendMessage(ADMIN_JID, { text: "✅ Sistema de IA LIGADO globalmente." });
                return;
            } else if (cmd === '/extrair_links') {
                await sock.sendMessage(jid, { text: "⏳ Baixando seu catálogo do WhatsApp Business... aguarde!" });
                try {
                    let hasMore = true;
                    let cursor = undefined;
                    let fullCatalog = "NOME;ID_WHATSAPP;LINK_CATALOGO\n";
                    let count = 0;
                    
                    while(hasMore) {
                        const res = await sock.getCatalog({ jid: ADMIN_JID, cursor: cursor, limit: 50 });
                        const products = res.products || [];
                        
                        for (const p of products) {
                            if (p.id) {
                                fullCatalog += `${p.name};${p.id};https://wa.me/p/${p.id}/${ADMIN_JID.split('@')[0]}\n`;
                                count++;
                            }
                        }
                        
                        if (res.nextPageCursor) {
                            cursor = res.nextPageCursor;
                        } else {
                            hasMore = false;
                        }
                    }
                    
                    const filePath = path.join(__dirname, '../../catalogo_whatsapp.csv');
                    fs.writeFileSync(filePath, fullCatalog, 'utf-8');
                    
                    await sock.sendMessage(jid, { 
                        document: fs.readFileSync(filePath), 
                        mimetype: 'text/csv', 
                        fileName: 'Links_Do_Catalogo.csv',
                        caption: `✅ Concluído! Encontrei ${count} produtos no seu WhatsApp Business e gerei a planilha com os links de todos eles!`
                    });

                } catch (e: any) {
                    console.error(e);
                    await sock.sendMessage(jid, { text: "❌ Erro ao baixar o catálogo: " + e.message });
                }
                return;
            } else if (cmd === '/parar' && m.key.fromMe) {
                conversationStates.set(jid, 'PAUSED_BY_ADMIN');
                if (adminTimers.has(jid)) {
                    clearInterval(adminTimers.get(jid));
                    adminTimers.delete(jid);
                }
                await sock.sendMessage(jid, { text: "🛑 Thiago silenciado neste chat." });
                return;
            } else if (cmd === '/atender' && m.key.fromMe) {
                conversationStates.set(jid, 'SHOPPING');
                if (adminTimers.has(jid)) {
                    clearInterval(adminTimers.get(jid));
                    adminTimers.delete(jid);
                }
                await sock.sendMessage(jid, { text: "✅ Thiago reassumiu este chat." });
                
                const pendingMsg = pendingMessages.get(jid);
                if (pendingMsg) {
                    await sock.sendPresenceUpdate('composing', jid);
                    const botReply = await askVendedor(jid, pendingMsg);
                    await sock.sendPresenceUpdate('paused', jid);
                    await sock.sendMessage(jid, { text: botReply });
                    pendingMessages.delete(jid);
                }
                return;
            } else if (cmd.startsWith('atender ') || cmd.startsWith('atende ')) {
                const targetNumber = cmd.split(' ')[1];
                let target = targetNumber + '@s.whatsapp.net';
                for (const key of conversationStates.keys()) {
                    if (key.startsWith(targetNumber + '@')) {
                        target = key;
                        break;
                    }
                }
                
                conversationStates.set(target, 'SHOPPING');
                if (adminTimers.has(target)) {
                    clearInterval(adminTimers.get(target));
                    adminTimers.delete(target);
                }
                await sock.sendMessage(ADMIN_JID, { text: `✅ A IA assumiu a negociação com ${target.split('@')[0]}.` });
                
                const pendingMsg = pendingMessages.get(target);
                if (pendingMsg) {
                    await sock.sendPresenceUpdate('composing', target);
                    const botReply = await askVendedor(target, pendingMsg);
                    await sock.sendPresenceUpdate('paused', target);
                    await sock.sendMessage(target, { text: botReply });
                    pendingMessages.delete(target);
                }
                return;
            } else if (cmd.startsWith('parar ') || cmd.startsWith('para ')) {
                const targetNumber = cmd.split(' ')[1];
                let target = targetNumber + '@s.whatsapp.net';
                for (const key of conversationStates.keys()) {
                    if (key.startsWith(targetNumber + '@')) {
                        target = key;
                        break;
                    }
                }
                
                conversationStates.set(target, 'PAUSED_BY_ADMIN');
                if (adminTimers.has(target)) {
                    clearInterval(adminTimers.get(target));
                    adminTimers.delete(target);
                }
                await sock.sendMessage(ADMIN_JID, { text: `🛑 A IA foi pausada para ${target.split('@')[0]}.` });
                return;
            }
        }

        // Se a mensagem for do próprio bot (e não era um comando ou produto admin), ignora para não falar sozinho
        if (m.key.fromMe) return;

        if (!globalBotEnabled) return;
        if (!jid || jid.includes('@g.us')) return; 

        console.log(`\n📩 [CLIENTE] ${jid.split('@')[0]}: ${text}`);

        // Controle de Estados
        const estadoAtual = conversationStates.get(jid) || 'NEW';
        
        if (estadoAtual === 'PAUSED_BY_ADMIN') return;

        if (estadoAtual === 'WAITING_ADMIN_APPROVAL') {
            console.log(`⏳ Ignorando mensagem de ${jid} (Aguardando aprovação do Admin)`);
            return;
        }

        if (estadoAtual === 'WAITING_PAYMENT') {
            await sock.sendMessage(jid, { text: "⏳ *Aguardando Pagamento*\nPara continuarmos, efetue o pagamento no link do Mercado Pago gerado acima. Assim que o pagamento for aprovado, o envio será liberado!" });
            return;
        } else if (estadoAtual === 'PAID') {
            await sock.sendMessage(jid, { text: "Seu pedido já foi pago e está em processamento! Qualquer dúvida extra ou alteração, aguarde um de nossos atendentes humanos. ⚽" });
            return;
        }

        if (estadoAtual === 'GREETED') {
            conversationStates.set(jid, 'WAITING_ADMIN_APPROVAL');
            pendingMessages.set(jid, text); // Salva a mensagem para responder depois
            
            // Inicia os alertas para o Admin
            adminAlertCount.set(jid, 0);
            const sendAlert = async () => {
                let count = adminAlertCount.get(jid) || 0;
                if (count >= 12) { // 12 * 25s = 300s (5 minutos)
                    if (adminTimers.has(jid)) {
                        clearInterval(adminTimers.get(jid));
                        adminTimers.delete(jid);
                    }
                    if (conversationStates.get(jid) === 'WAITING_ADMIN_APPROVAL') {
                        conversationStates.set(jid, 'SHOPPING');
                        await sock.sendMessage(ADMIN_JID, { text: `⏱️ 5 minutos se passaram sem resposta!\n\n🤖 O Thiago assumiu automaticamente o atendimento do cliente ${jid.split('@')[0]}.` });
                        
                        await sock.sendPresenceUpdate('composing', jid);
                        const botReply = await askVendedor(jid, text);
                        await sock.sendPresenceUpdate('paused', jid);
                        await sock.sendMessage(jid, { text: botReply });
                        pendingMessages.delete(jid);
                    }
                    return;
                }
                await sock.sendMessage(ADMIN_JID, { text: `🚨 *CLIENTE NA FILA* 🚨\n\nMensagem: "${text}"\n\nResponda com "atender <numero>" para a IA assumir, ou "parar <numero>" para você assumir no humano.` });
                await sock.sendMessage(ADMIN_JID, { text: `${jid.split('@')[0]}` });
                adminAlertCount.set(jid, count + 1);
            };
            sendAlert(); // Executa a primeira vez IMEDIATAMENTE
            const timerId = setInterval(sendAlert, 25000);
            adminTimers.set(jid, timerId);
            
            return; 
        }

        await sock.sendPresenceUpdate('composing', jid);
        
        const botReply = await askVendedor(jid, text);
        
        if (estadoAtual === 'NEW') {
            conversationStates.set(jid, 'GREETED');
        }
        
        // Verifica se a IA decidiu finalizar a compra (Transição Tesoureiro)
        if (botReply.includes('[FINALIZAR_PEDIDO]')) {
            console.log(`🏦 [SISTEMA] Disparando transição para o Tesoureiro! JID: ${jid}`);
            
            // 1. Extrai o ValorTotal da mensagem gerada pela IA
            const valMatch = botReply.match(/ValorTotal:\s*([\d.,]+)/i);
            const valStr = valMatch ? valMatch[1].replace(',', '.') : '0';
            const valorFinal = parseFloat(valStr);

            // 2. Avisa o Grupo com os Dados Estruturados
            await sock.sendMessage(grupoPedidosJid, { text: `🚨 *NOVO PEDIDO ESTRUTURADO* 🚨\n\nCliente (WhatsApp): ${jid.split('@')[0]}\n\n📄 Dados:\n${botReply}` });

            // 3. Gera Link Mercado Pago
            const link = await tesoureiro.criarLinkDePagamento(jid, `Pedido Manto Mania`, valorFinal);

            // 4. Responde pro cliente sem a tag feia
            const msgCliente = `Tudo certinho com o seu endereço e pedido! 📝📦\n\nAqui está o seu link seguro de pagamento via Mercado Pago (Valor: R$ ${valorFinal.toFixed(2).replace('.',',')}):\n\n💳 ${link}\n\nAssim que o pagamento for aprovado, o nosso sistema vai detectar automaticamente e eu retorno aqui para emitir seu rastreio!`;
            
            conversationStates.set(jid, 'WAITING_PAYMENT');
            
            await sock.sendPresenceUpdate('paused', jid);
            await sock.sendMessage(jid, { text: msgCliente });
            return;
        }

        // Se for resposta normal de vendas
        let finalReply = botReply;
        
        // Verifica se a IA quer enviar uma foto
        const fotoRegex = /\[ENVIAR_FOTO\]\s*([a-zA-Z0-9_.-]+)/gi;
        let match;
        while ((match = fotoRegex.exec(finalReply)) !== null) {
            const photoId = match[1];
            const imgUrls = imageMap.get(photoId);
            if (imgUrls && imgUrls.length > 0) {
                console.log(`📸 Enviando fotos do produto ${photoId} para ${jid}`);
                for (const imgUrl of imgUrls) {
                    try {
                        await sock.sendPresenceUpdate('composing', jid);
                        if (fs.existsSync(imgUrl)) {
                            await sock.sendMessage(jid, { image: fs.readFileSync(imgUrl) });
                        } else {
                            await sock.sendMessage(jid, { image: { url: imgUrl } });
                        }
                    } catch (e) {
                        console.error("Erro ao enviar foto:", e);
                    }
                }
            }
        }
        
        // Limpa a tag [ENVIAR_FOTO] do texto final para o cliente não ver
        finalReply = finalReply.replace(/\[ENVIAR_FOTO\]\s*[a-zA-Z0-9_.-]+/gi, '').trim();

        console.log(`🤖 [THIAGO M.M.]: ${finalReply}`);
        if (finalReply.length > 0) {
            await sock.sendPresenceUpdate('paused', jid);
            await sock.sendMessage(jid, { text: finalReply });
        }
    });
}

connectToWhatsApp();
