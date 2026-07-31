# 🗺️ Mapa do Sistema: Manto Mania

Esta é a planta baixa da nossa loja. Aqui você descobre o que cada arquivo faz, e qual arquivo você deve abrir caso queira fazer uma alteração no futuro.

---

### 1. 📝 `links_yupoo.txt`
* **O que faz:** É a sua caixa de entrada. É aqui que você cola os links brutos do Yupoo debaixo das "gavetas" de cada time.
* **Quando alterar:** Diariamente, toda vez que for baixar camisas novas.
* **Como adicionar algo novo:** Basta pular uma linha e digitar uma nova gaveta entre colchetes (ex: `[Times do Brasil/Botafogo F.R]`).

### 2. ⚡ `INICIAR_ROBO.bat`
* **O que faz:** É o "Botão de Ligar" da sua fábrica. Ele executa o Extrator e logo depois o Organizador de forma automática para você não precisar digitar nada no terminal.
* **Quando alterar:** Dificilmente você precisará mexer aqui.

### 3. 🕷️ `yupoo_scraper_rapido.js`
* **O que faz:** É o "Robô Extrator". Ele entra nos links, engana o bloqueio chinês, baixa as fotos e dá o nome padrão na pasta (Time + Tipo + Ano + Variação).
* **Quando alterar:**
  - Se você quiser adicionar regras de nome (ex: se o chinês começar a escrever "Player Version" de outro jeito, ou para reconhecer que "Kids" significa camisa infantil).
  - Se quiser que ele identifique Tênis ou Bonés pelo nome.
* **Onde mexer:** Na função `parseTitle(rawTitle, team)`.

### 4. 🗂️ `organizar_loja.js`
* **O que faz:** É o "Gerente da Loja". Ele entra nas pastas que o Extrator criou, injeta os preços corretos, formata as tabelas de medidas, e cria os textos perfeitos para OLX e WhatsApp.
* **Quando alterar:**
  - Se você quiser aumentar/diminuir o preço de alguma categoria (ex: Camisa de Jogador subiu para R$ 199).
  - Se a tabela de medidas do fornecedor mudar.
  - Se quiser mudar a mensagem de "Frete Grátis" no rodapé do anúncio.
* **Onde mexer:** 
  - Para Preços: Na função `getProductInfo(productName, category)`.
  - Para Textos/Tabelas: Nas variáveis `sizeCharts` ou no template `wppText`.

### 5. 🌐 `gerar_catalogo_meta.js`
* **O que faz:** É o "Sincronizador". Ele gera os links públicos de imagem no ImgBB e compila o arquivo `.csv` para o catálogo oficial do WhatsApp/Facebook.
* **Quando alterar:**
  - Se você quiser mudar a Chave de API do ImgBB.
  - Se quiser adicionar uma nova coluna exigida pelo Facebook Commerce no futuro.

### 6. 📊 `catalogo_meta.csv`
* **O que faz:** É o produto final gerado pelo sincronizador.
* **Quando alterar:** Nunca mexa manualmente! Sempre deixe o `gerar_catalogo_meta.js` regerar este arquivo sozinho e apenas envie-o para o Facebook.
