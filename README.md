# 🛒 Fábrica Manto Mania - Sistema de Automação

Bem-vindo à documentação oficial da arquitetura de automação da **Manto Mania**. Este sistema foi construído para transformar tarefas que levariam horas manuais em cliques de milissegundos.

O sistema é composto por 3 módulos principais que trabalham em conjunto:

## 1. Módulo Extrator (Yupoo Scraper)
* **Arquivo:** `yupoo_scraper_rapido.js`
* **Função:** Burlar bloqueios de segurança (firewalls/Tencent EdgeOne) de fornecedores chineses e realizar o download automático das fotos de alta qualidade de álbuns do Yupoo.
* **Inteligência:** Analisa o título original do álbum, identifica automaticamente o tipo da camisa (Torcedor, Jogador, Feminina, Kids) e variações (Home, Away, Third, cores), criando uma pasta já padronizada no disco local.

## 2. Módulo Organizador
* **Arquivo:** `organizar_loja.js`
* **Função:** Varre as pastas recém-criadas e aplica regras de negócio financeiras e de marketing.
* **Inteligência:** Baseado no nome da pasta, ele deduz o preço correto (ex: Feminina R$ 150, Jogador R$ 189,90) e insere a respectiva Tabela de Medidas. Gera instantaneamente anúncios formatados com emojis para OLX (`olx_anuncio.txt`) e WhatsApp (`wpp_anuncio.txt`), além de dados puros (`wpp_catalogo.json`).

## 3. Módulo de Integração (Meta Commerce)
* **Arquivo:** `gerar_catalogo_meta.js`
* **Função:** Sincronizar o estoque local com a loja nativa oficial do WhatsApp Business / Facebook.
* **Inteligência:** Lê todas as camisas prontas, faz o upload silencioso das fotos para um servidor em nuvem (ImgBB) e compila um arquivo `.csv` no formato exigido pela Meta, com links diretos para o chat do WhatsApp do vendedor.

## Orquestrador
* **Arquivo:** `INICIAR_ROBO.bat`
* **Função:** Um atalho visual para o usuário iniciar toda a cadeia (Extrator -> Organizador) com apenas 2 cliques.
* **Arquivo:** `links_yupoo.txt`
* **Função:** O "coração" da entrada de dados, onde as gavetas de times residem aguardando links brutos. Possui auto-limpeza após processamento.
