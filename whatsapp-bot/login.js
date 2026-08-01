const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const fs = require('fs');
const pino = require('pino');

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) {
            const html = `
            <html>
            <head><meta charset="utf-8"></head>
            <body>
            <h1>Escaneie o QR Code abaixo com o WhatsApp da Loja</h1>
            <div id="qrcode"></div>
            <script src="https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js"></script>
            <script>
                new QRCode(document.getElementById("qrcode"), {
                    text: "${qr}",
                    width: 300,
                    height: 300
                });
            </script>
            <p>Depois de escanear, o arquivo HTML não será mais necessário.</p>
            </body>
            </html>
            `;
            fs.writeFileSync('C:/Users/henri/.gemini/antigravity/brain/863a337e-45a7-4bff-8b46-366459e464bb/qr_code.html', html);
            console.log("QR Code salvo em qr_code.html");
        }
        if (connection === 'open') {
            console.log("Conectado com sucesso!");
            process.exit(0);
        }
    });
}
start();
