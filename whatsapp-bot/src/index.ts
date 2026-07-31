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

// Configurações do OpenRouter / Llama 3
if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
    console.log("❌ ERRO FATAL: Chave da API do OpenRouter não encontrada no arquivo .env!");
    process.exit(1);
}

const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
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
let adminAlertCount = new Map<string, number>();

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

// Função cirúrgica para ler o estoque atual a partir do catalogo_meta.csv
function getEstoqueEmTexto(): string {
    const csvPath = path.join(__dirname, '../../catalogo_meta.csv');
    if (!fs.existsSync(csvPath)) return "Nenhum produto cadastrado no momento.";

    const content = fs.readFileSync(csvPath, 'utf-8');
    const cleanContent = content.replace(/^\uFEFF/, '');
    const lines = cleanContent.split('\n').filter(l => l.trim() !== '');
    
    const items: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const fields = line.match(/"([^"]*)"/g);
        if (fields && fields.length >= 6) {
            const title = fields[1].replace(/"/g, '');
            const price = fields[5].replace(/"/g, '');
            items.push(`- ${title} | Preço: ${price}`);
        }
    }

    return items.join('\n');
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
            model: "deepseek/deepseek-v4-flash",
            messages: history as any,
            temperature: 0.7,
        });

        let reply = response.choices[0].message.content || '...';
        
        // Mantém a resposta da IA no histórico para ela saber o que falou
        history.push({ role: 'assistant', content: reply });
        
        return reply;
    } catch (error: any) {
        console.error('Erro na OpenRouter:', error?.response?.data || error.message);
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
            console.log(`📦 Produtos em estoque carregados na memória da IA: \n${getEstoqueEmTexto().split('\n').length}`);
            
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
        if (!m || !m.message || m.key.fromMe) return;

        const jid = m.key.remoteJid;
        
        const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        if (!text) return;

        // Comandos do Admin
        if (jid === ADMIN_JID || (m.key.fromMe && jid.includes('@s.whatsapp.net'))) {
            const cmd = text.toLowerCase().trim();
            if (cmd === '/thiago off') {
                globalBotEnabled = false;
                await sock.sendMessage(ADMIN_JID, { text: "🛑 Sistema de IA DESLIGADO globalmente." });
                return;
            } else if (cmd === '/thiago on') {
                globalBotEnabled = true;
                await sock.sendMessage(ADMIN_JID, { text: "✅ Sistema de IA LIGADO globalmente." });
                return;
            } else if (cmd.startsWith('atender ')) {
                const target = cmd.split(' ')[1] + '@s.whatsapp.net';
                conversationStates.set(target, 'SHOPPING');
                if (adminTimers.has(target)) {
                    clearInterval(adminTimers.get(target));
                    adminTimers.delete(target);
                }
                await sock.sendMessage(ADMIN_JID, { text: `✅ Thiago assumiu o atendimento para ${target.split('@')[0]}.` });
                return;
            } else if (cmd.startsWith('parar ')) {
                const target = cmd.split(' ')[1] + '@s.whatsapp.net';
                conversationStates.set(target, 'PAUSED_BY_ADMIN');
                if (adminTimers.has(target)) {
                    clearInterval(adminTimers.get(target));
                    adminTimers.delete(target);
                }
                await sock.sendMessage(ADMIN_JID, { text: `🛑 Thiago bloqueado para o cliente ${target.split('@')[0]}. Somente você responderá agora.` });
                return;
            }
        }

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
            
            // Inicia os alertas para o Admin
            adminAlertCount.set(jid, 0);
            const timerId = setInterval(async () => {
                let count = adminAlertCount.get(jid) || 0;
                if (count >= 7) {
                    clearInterval(timerId);
                    adminTimers.delete(jid);
                    return;
                }
                await sock.sendMessage(ADMIN_JID, { text: `🚨 *CLIENTE NA FILA* 🚨\nNúmero: ${jid.split('@')[0]}\nMensagem: "${text}"\n\nResponda com "atender ${jid.split('@')[0]}" para a IA assumir, ou "parar ${jid.split('@')[0]}" para você assumir no humano.` });
                adminAlertCount.set(jid, count + 1);
            }, 25000);
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
        console.log(`🤖 [THIAGO M.M.]: ${botReply}`);
        await sock.sendPresenceUpdate('paused', jid);
        await sock.sendMessage(jid, { text: botReply });
    });
}

connectToWhatsApp();
