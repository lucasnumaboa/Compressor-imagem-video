@echo off
echo Iniciando o Compressor Manero na porta 5200...
cd /d "%~dp0"

:: Verificar se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERRO: Node.js nao encontrado. Por favor, instale o Node.js antes de continuar.
    pause
    exit /b 1
)

:: Instalar dependências com tratamento de erro
echo Instalando dependencias...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ERRO: Falha ao instalar dependencias.
    pause
    exit /b 1
)

echo.
echo Iniciando o servidor na porta 5200...
start "" http://localhost:5200
call npm run dev

if %ERRORLEVEL% neq 0 (
    echo ERRO: Falha ao iniciar o servidor.
    pause
    exit /b 1
)

pause