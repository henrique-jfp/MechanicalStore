# 📖 Manual de Operações Diárias: Manto Mania

Este é o seu guia passo-a-passo de como adicionar novas camisas à sua loja a partir de hoje. É um processo 100% automatizado, e você só precisa "alimentar" o robô.

---

### Fase 1: Abastecendo o Motor
Quando você achar novas camisas no seu fornecedor chinês (Yupoo) que deseja vender:
1. Abra o arquivo **`links_yupoo.txt`** na sua pasta MantoMania.
2. Procure a "Gaveta" do time correto (ex: `[Times do Brasil/C.R Flamengo]`).
3. Cole os links do Yupoo diretamente abaixo do nome do time. Você pode colar 1, 10 ou 50 links de uma vez!
4. Salve e feche o arquivo.

### Fase 2: Apertando o Botão Mágico
1. Dê 2 cliques no arquivo **`INICIAR_ROBO.bat`**.
2. A tela preta vai aparecer. Agora você pode ir tomar um café.
3. O robô vai:
   - Extrair todas as fotos burlado bloqueios.
   - Nomear a pasta no nosso padrão de luxo (ex: `C.R Flamengo Torcedor 2024-2025 Home`).
   - Gerar o preço correto, a tabela de medidas certa, o anúncio da OLX e o do WhatsApp com Emojis.
   - Apagar sozinho o link do arquivo `.txt` para você não se perder no dia seguinte!
4. Pressione 'Enter' quando ele avisar que terminou.

### Fase 3: A Venda Instantânea
Agora você tem as camisas prontas no seu HD! Como enviá-las para os canais de venda?

**Para Vender na OLX:**
1. Abra a OLX para criar o anúncio.
2. Arraste as fotos `frente.jpg` e `costas.jpg` que estão na pasta da camisa.
3. Abra o arquivo `olx_anuncio.txt`, dê CTRL+A (selecionar tudo) e CTRL+C.
4. Cole na OLX. Anúncio finalizado!

**Para Atualizar o Catálogo Oficial do WhatsApp (Facebook Commerce):**
1. Na sua pasta MantoMania, clique na barra de endereços (lá em cima onde mostra o caminho), digite `cmd` e aperte Enter.
2. Digite o comando: `node gerar_catalogo_meta.js` e aperte Enter.
3. O robô fará o upload invisível de todas as fotos novas e gerará um arquivo chamado `catalogo_meta.csv`.
4. Entre no seu [Gerenciador de Comércio do Facebook](https://business.facebook.com/commerce).
5. Vá em **Fontes de Dados** -> **Atualizar Feed**.
6. Envie o arquivo `catalogo_meta.csv`.
7. Em 1 minuto, todas as camisas novas vão brotar brilhando no celular dos seus clientes no WhatsApp!

---

**Dica de Ouro:** Guarde este manual com carinho. Este fluxo transforma o trabalho de 1 dia inteiro em menos de 5 minutos!
