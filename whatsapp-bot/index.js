"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = require("@whiskeysockets/baileys");
const boom_1 = require("@hapi/boom");
const fs = __importStar(require("fs"));
const pino = __importStar(require("pino"));
// Definições de Preços e Regras
const BASE_PRICE = 160;
const EXTRA_XL = 10;
const EXTRA_XXL = 20;
const PERSONALIZATION_PRICE = 20;
function getShippingPrice(quantity) {
    if (quantity === 1)
        return 25.58;
    if (quantity === 2)
        return 20.47;
    if (quantity === 3)
        return 15.35;
    return 0; // 4 ou mais é grátis
}
const sessions = new Map();
function getSession(jid) {
    if (!sessions.has(jid)) {
        sessions.set(jid, { state: 'IDLE', quantity: 0, currentShirtIndex: 0, items: [] });
    }
    return sessions.get(jid);
}
function clearSession(jid) {
    sessions.delete(jid);
}
// Normaliza texto para facilitar a leitura natural (remove acentos, letras minúsculas)
function normalizeString(str) {
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
// Inicia o Bot
async function connectToWhatsApp() {
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)('auth_info_baileys');
    const sock = (0, baileys_1.makeWASocket)({
        auth: state,
        printQRInTerminal: true,
        logger: pino.default({ level: 'silent' })
    });
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
            console.log('Conexão fechada. Tentando reconectar...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
        else if (connection === 'open') {
            console.log('✅ Bot da RP Mania conectado e pronto para vender!');
        }
    });
    sock.ev.on('creds.update', saveCreds);
    // Lida com mensagens recebidas
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify')
            return;
        const m = messages[0];
        if (!m.message || m.key.fromMe)
            return; // Ignora mensagens do próprio bot
        const jid = m.key.remoteJid;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || '';
        if (!text)
            return;
        const msgText = normalizeString(text);
        const session = getSession(jid);
        try {
            // Se o usuário mandar cancelar em qualquer momento
            if (msgText === 'cancelar' || msgText === 'sair') {
                clearSession(jid);
                await sock.sendMessage(jid, { text: 'Atendimento cancelado. Quando quiser recomeçar, é só mandar um "Oi"!' });
                return;
            }
            switch (session.state) {
                case 'IDLE':
                    // Responde a qualquer oi/ola natural
                    if (['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'comprar', 'camisa'].some(w => msgText.includes(w))) {
                        session.state = 'ASKING_QUANTITY';
                        await sock.sendMessage(jid, {
                            text: 'Olá! Seja muito bem-vindo à *RP Mania*! 👕🏆\n\nVi que você tem interesse nas nossas camisas. O preço padrão é *R$ 160*.\n\nPara começarmos, *quantas camisas você vai querer levar hoje?* (Digite apenas o número)'
                        });
                    }
                    break;
                case 'ASKING_QUANTITY':
                    const qty = parseInt(msgText.replace(/\D/g, ''));
                    if (isNaN(qty) || qty <= 0) {
                        await sock.sendMessage(jid, { text: 'Não entendi a quantidade. Por favor, digite um número válido (ex: 1, 2, 3).' });
                        return;
                    }
                    session.quantity = qty;
                    session.currentShirtIndex = 1;
                    session.state = 'ASKING_SIZE';
                    await sock.sendMessage(jid, {
                        text: `Excelente! ${qty} camisa(s).\n\nVamos montar o seu pedido. Para a *Camisa ${session.currentShirtIndex}*, qual o tamanho desejado?\n\nTemos:\n• S, M, X\n• XL (+ R$10)\n• XXL (+ R$20)\n\n*(Responda S, M, X, XL ou XXL)*`
                    });
                    break;
                case 'ASKING_SIZE':
                    let size = '';
                    let sizePrice = 0;
                    if (msgText === 's' || msgText === 'p')
                        size = 'S';
                    else if (msgText === 'm')
                        size = 'M';
                    else if (msgText === 'x' || msgText === 'g' || msgText === 'l')
                        size = 'X';
                    else if (msgText === 'xl' || msgText === 'gg') {
                        size = 'XL';
                        sizePrice = EXTRA_XL;
                    }
                    else if (msgText === 'xxl' || msgText === 'xg') {
                        size = 'XXL';
                        sizePrice = EXTRA_XXL;
                    }
                    if (!size) {
                        await sock.sendMessage(jid, { text: 'Tamanho inválido. Por favor, responda com S, M, X, XL ou XXL.' });
                        return;
                    }
                    session.items.push({ size, sizePrice, personalization: false });
                    session.state = 'ASKING_PERSONALIZATION';
                    await sock.sendMessage(jid, {
                        text: `Tamanho *${size}* anotado!\n\nVocê gostaria de *Personalizar* essa camisa com seu Nome e Número nas costas? (Custa apenas + R$ 20,00)\n\n*(Responda Sim ou Não)*`
                    });
                    break;
                case 'ASKING_PERSONALIZATION':
                    const isYes = ['sim', 'quero', 'ss', 's', 'pode ser', 'claro'].some(w => msgText.includes(w));
                    const isNo = ['nao', 'n', 'nn', 'nao quero', 'nada'].some(w => msgText.includes(w));
                    if (!isYes && !isNo) {
                        await sock.sendMessage(jid, { text: 'Não entendi. Você quer personalizar com nome e número por + R$ 20? Responda *Sim* ou *Não*.' });
                        return;
                    }
                    // Atualiza o último item adicionado
                    session.items[session.items.length - 1].personalization = isYes;
                    // Verifica se ainda faltam camisas
                    if (session.currentShirtIndex < session.quantity) {
                        session.currentShirtIndex++;
                        session.state = 'ASKING_SIZE';
                        await sock.sendMessage(jid, {
                            text: `Perfeito!\n\nAgora vamos para a *Camisa ${session.currentShirtIndex}*. Qual o tamanho desejado?\n\n• S, M, X\n• XL (+ R$10)\n• XXL (+ R$20)\n\n*(Responda S, M, X, XL ou XXL)*`
                        });
                    }
                    else {
                        session.state = 'CHECKOUT';
                        // Calcula totais
                        let subtotal = 0;
                        let resumo = '*RESUMO DO SEU PEDIDO:*\n\n';
                        session.items.forEach((item, index) => {
                            let itemTotal = BASE_PRICE + item.sizePrice + (item.personalization ? PERSONALIZATION_PRICE : 0);
                            subtotal += itemTotal;
                            resumo += `👕 *Camisa ${index + 1}:* Tam ${item.size} - R$ ${BASE_PRICE.toFixed(2)}\n`;
                            if (item.sizePrice > 0)
                                resumo += `   ➕ Adicional Tamanho: R$ ${item.sizePrice.toFixed(2)}\n`;
                            if (item.personalization)
                                resumo += `   ➕ Personalização: R$ ${PERSONALIZATION_PRICE.toFixed(2)}\n`;
                            resumo += `\n`;
                        });
                        const frete = getShippingPrice(session.quantity);
                        const totalFinal = subtotal + frete;
                        resumo += `🚚 *Frete (${session.quantity} camisas):* ${frete === 0 ? 'GRÁTIS 🎁' : `R$ ${frete.toFixed(2)}`}\n`;
                        resumo += `======================\n`;
                        resumo += `💰 *TOTAL A PAGAR: R$ ${totalFinal.toFixed(2)}*\n`;
                        resumo += `======================\n\n`;
                        resumo += `Posso gerar o seu link de pagamento do *Mercado Pago* para finalizarmos? (Responda *Sim* para confirmar ou *Cancelar* para desistir)`;
                        await sock.sendMessage(jid, { text: resumo });
                    }
                    break;
                case 'CHECKOUT':
                    const confirm = ['sim', 'quero', 'ss', 's', 'pode gerar', 'gerar', 'pagar', 'ok'].some(w => msgText.includes(w));
                    if (confirm) {
                        await sock.sendMessage(jid, {
                            text: 'Gerando seu link de pagamento via Mercado Pago... ⏳ (Em breve faremos a integração real!)'
                        });
                        clearSession(jid); // Reseta a sessão após finalizar
                    }
                    else {
                        await sock.sendMessage(jid, { text: 'Tudo bem! Se quiser gerar depois ou mudar o pedido, é só mandar um "Oi".' });
                        clearSession(jid);
                    }
                    break;
            }
        }
        catch (err) {
            console.error('Erro ao processar mensagem:', err);
        }
    });
}
connectToWhatsApp();
//# sourceMappingURL=index.js.map