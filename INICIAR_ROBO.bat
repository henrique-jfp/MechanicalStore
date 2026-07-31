@echo off
color 0A
title Fabrica Manto Mania - Robo Extrator

echo =======================================================
echo          BEM-VINDO A FABRICA DA MANTO MANIA
echo =======================================================
echo.
echo [1/2] Iniciando o Robo Saqueador do Yupoo...
echo Ele vai ler o seu arquivo links_yupoo.txt e comecar a puxar!
echo.
node yupoo_scraper_rapido.js

echo.
echo =======================================================
echo [2/3] Organizando os dados e criando anuncios...
echo =======================================================
echo.
node organizar_loja.js

echo.
echo =======================================================
echo [3/3] Sincronizando com WhatsApp/Facebook e ImgBB...
echo =======================================================
echo.
node gerar_catalogo_meta.js

echo.
echo =======================================================
echo ✅ TUDO PRONTO! SUAS CAMISAS ESTAO PRONTAS PARA VENDA!
echo O catalogo_meta.csv foi atualizado automaticamente!
echo =======================================================
pause
