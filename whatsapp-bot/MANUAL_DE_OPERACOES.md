# 📘 Manual de Operações: Manto Mania Automática

Bem-vindo ao centro de comando da sua loja automatizada! Este documento explica como gerenciar os seus Agentes de Inteligência Artificial e Tesouraria.

## 🤖 1. Os Agentes e Suas Funções

- **Thiago (Vendedor IA):** Atende o cliente, mostra o catálogo, faz upsell (venda de personalização) e anota o endereço de entrega.
- **Tesoureiro:** Um sistema invisível que intercepta o pedido do Thiago, calcula o valor exato, gera um Link de Pagamento irrefutável do Mercado Pago e envia o pedido para a central.
- **Pós-Venda:** É o próprio Thiago, que "acorda" automaticamente milissegundos após o cliente pagar o PIX para mandar a confirmação de sucesso.

## 🚦 2. O Fluxo de Triagem (Como o cliente é atendido)

Para garantir que você não perca vendas, nós instalamos um **Guardião**:
1. O cliente manda "Oi". O Thiago responde sozinho com as boas-vindas.
2. O cliente diz "Quero uma do Vasco". Neste momento o Thiago **PÁRA** e não responde.
3. Você começará a receber **7 alertas** a cada 25 segundos no seu celular informando que há um cliente na fila aguardando.
4. **Sua decisão:** Você deve ler a mensagem do cliente e decidir:
   - Quer que o robô faça a venda? Responda `atender XXXXX` (onde X é o número do cliente).
   - Quer atender sozinho? Responda `parar XXXXX`. O Thiago ignorará esse cliente para sempre.

## 💳 3. A Ficha do Pedido

Se você tem um grupo no seu WhatsApp chamado exatamente **Pedidos Estruturados**, todas as fichas de vendas com links de produtos, valores e confirmações de PIX cairão direto lá. Caso o grupo não exista, elas cairão no seu chat privado com o robô.

## 🛑 4. Botão de Emergência (Kill Switch)

Deu algum problema ou você vai fazer uma promoção maluca manual?
- Digite `/thiago off` no seu chat para desligar a IA inteira da loja.
- Digite `/thiago on` para ligar tudo de novo.

## ⚙️ 5. Como Ligar ou Desligar o Robô no Servidor (T.I.)

O robô está morando em um servidor na nuvem (VPS) e roda usando um gerenciador chamado **PM2**.
Se você precisar reiniciar o servidor, acesse via SSH e use:
- `pm2 restart MantoMania` (Reinicia o robô)
- `pm2 stop MantoMania` (Desliga o robô)
- `pm2 logs MantoMania` (Mostra a tela preta com o robô conversando em tempo real)

---
*Manual gerado por Antigravity (Google DeepMind) exclusivamente para a Manto Mania.*
