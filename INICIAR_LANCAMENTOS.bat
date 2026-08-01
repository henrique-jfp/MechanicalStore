@echo off
color 0B
title Fabrica Manto Mania - Robo de Lancamentos

echo =======================================================
echo          BEM-VINDO A ESTEIRA DE LANCAMENTOS
echo =======================================================
echo.
echo [1/3] Iniciando o Robo Saqueador do Yupoo...
echo Ele vai ler o seu arquivo links_yupoo.txt e baixar APENAS os lancamentos!
echo.
node yupoo_scraper_rapido.js

echo.
echo =======================================================
echo [2/3] Organizando os dados dos LANCAMENTOS...
echo =======================================================
echo.
node organizar_lancamentos.js

echo.
echo =======================================================
echo [3/3] Gerando CSV focado apenas nos novos produtos...
echo =======================================================
echo.
node gerar_lancamentos_meta.js

echo.
echo =======================================================
echo ✅ TUDO PRONTO! SUAS NOVIDADES ESTAO PRONTAS!
echo O arquivo lancamentos_meta.csv foi gerado!
echo Va na Meta e escolha a opcao "Atualizar" enviando este arquivo.
echo =======================================================
pause
