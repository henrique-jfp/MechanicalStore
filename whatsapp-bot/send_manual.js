import { makeWASocket, useMultiFileAuthState } from '@whiskeysockets/baileys';
import * as pino from 'pino';
import * as fs from 'fs';
async function sendManual() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino.default({ level: 'silent' })
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            const adminJid = "5521985287511@s.whatsapp.net";
            const manualPath = './MANUAL_DE_OPERACOES.md';
            const manualText = fs.readFileSync(manualPath, 'utf-8');
            console.log("Enviando manual para o admin...");
            await sock.sendMessage(adminJid, { text: manualText });
            console.log("Manual enviado com sucesso! Fechando conexão local...");
            setTimeout(() => {
                process.exit(0);
            }, 3000);
        }
    });
}
sendManual();
