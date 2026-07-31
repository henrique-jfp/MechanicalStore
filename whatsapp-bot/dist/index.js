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
const pino = __importStar(require("pino"));
const dotenv = __importStar(require("dotenv"));
const qrcode = __importStar(require("qrcode-terminal"));
const Roteador_1 = require("./Roteador");
dotenv.config();
const roteador = new Roteador_1.Roteador();
async function connectToWhatsApp() {
    if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'COLE_SUA_CHAVE_AQUI') {
        console.log("❌ ERRO FATAL: Chave da API do OpenRouter não encontrada no arquivo .env!");
        process.exit(1);
    }
    console.log('⏳ Conectando aos servidores do WhatsApp com Multi-Agentes (MoE)...');
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)('auth_info_baileys');
    const sock = (0, baileys_1.makeWASocket)({
        auth: state,
        printQRInTerminal: false,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        logger: pino.default({ level: 'silent' })
    });
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('🤖 ESCANEIE O QR CODE ABAIXO NO SEU WHATSAPP:');
            qrcode.generate(qr, { small: true });
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
            console.log('Conexão fechada. Tentando reconectar...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
        else if (connection === 'open') {
            console.log('✅ Maestro e Vendedor conectados! Sistema online.');
        }
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify')
            return;
        const m = messages[0];
        if (!m || !m.message || m.key.fromMe)
            return;
        const jid = m.key.remoteJid;
        if (!jid)
            return;
        const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
        if (!text)
            return;
        console.log(`📩 [MENSAGEM] ${jid.split('@')[0]}: ${text}`);
        sock.sendPresenceUpdate('composing', jid);
        // Passa a bola pro Maestro Roteador
        const botReply = await roteador.processMessage(jid, text);
        await sock.sendMessage(jid, { text: botReply });
    });
}
connectToWhatsApp();
