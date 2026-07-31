import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import express from 'express';
import cors from 'cors';
import localtunnel from 'localtunnel';

export class Tesoureiro {
    private client: MercadoPagoConfig;
    private onPaymentApproved: (jid: string) => void;
    private serverUrl: string = '';

    constructor(onPaymentApproved: (jid: string) => void) {
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            console.warn("⚠️ MERCADOPAGO_ACCESS_TOKEN não configurado no .env");
        }
        
        this.client = new MercadoPagoConfig({ 
            accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || 'TEST-TOKEN', 
            options: { timeout: 5000 } 
        });
        
        this.onPaymentApproved = onPaymentApproved;
        this.iniciarServidor();
    }

    private async iniciarServidor() {
        const app = express();
        app.use(cors());
        app.use(express.json());

        // Webhook do Mercado Pago
        app.post('/webhook', async (req, res) => {
            const body = req.body;
            
            if (body && body.action === 'payment.created' && body.data && body.data.id) {
                const paymentId = body.data.id;
                console.log(`💰 [TESOUREIRO] Novo pagamento detectado: ID ${paymentId}`);
                
                try {
                    const payment = new Payment(this.client);
                    const paymentData = await payment.get({ id: paymentId });
                    
                    if (paymentData.status === 'approved') {
                        const jid = paymentData.external_reference;
                        if (jid) {
                            console.log(`✅ [TESOUREIRO] Pagamento APROVADO recebido para: ${jid}`);
                            this.onPaymentApproved(jid);
                        }
                    }
                } catch(e) {
                    console.error("Erro ao buscar dados do pagamento", e);
                }
            }

            res.status(200).send('OK');
        });

        // Webhook direto para simplificar nosso fluxo local (simulando aprovação via JID)
        app.post('/simular-pagamento', (req, res) => {
            const jid = req.body.jid;
            if (jid) {
                console.log(`✅ [TESOUREIRO] Pagamento APROVADO recebido para: ${jid}`);
                this.onPaymentApproved(jid);
            }
            res.status(200).send('Pago');
        });

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, async () => {
            console.log(`\n🏦 Servidor do Tesoureiro rodando na porta ${PORT}`);
            try {
                const tunnel = await localtunnel({ port: PORT as number });
                this.serverUrl = tunnel.url;
                console.log(`🔗 Webhook Publico do Mercado Pago gerado: ${this.serverUrl}/webhook`);
            } catch (err) {
                console.error("Erro ao criar Localtunnel:", err);
            }
        });
    }

    public async criarLinkDePagamento(jid: string, descricao: string, valorTotal: number): Promise<string> {
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN === 'COLE_AQUI') {
            return "⚠️ [Link Falso de Teste] https://mpago.la/teste - Cole seu Access Token real no .env para gerar links verdadeiros.";
        }

        try {
            const preference = new Preference(this.client);
            
            const response = await preference.create({
                body: {
                    items: [
                        {
                            id: 'camisas_manto_mania',
                            title: 'Pedido Manto Mania',
                            description: descricao,
                            quantity: 1,
                            unit_price: valorTotal,
                            currency_id: 'BRL',
                        }
                    ],
                    external_reference: jid,
                    notification_url: `${this.serverUrl}/webhook`,
                    back_urls: {
                        success: "https://wa.me/5521970734956",
                        failure: "https://wa.me/5521970734956",
                        pending: "https://wa.me/5521970734956"
                    },
                    auto_return: "approved"
                }
            });

            return response.init_point || "Erro ao gerar link";
        } catch (error) {
            console.error("Erro no Mercado Pago:", error);
            return "Erro ao processar o link de pagamento. Tente novamente mais tarde.";
        }
    }
}
