@echo off
echo Iniciando o Compressor Manero (Metodo Alternativo)...
cd /d "%~dp0"

echo Limpando cache e node_modules...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo Instalando dependencias...
call npm install --no-package-lock

echo.
echo Iniciando o servidor na porta 5200...
start "" http://localhost:5200
call npx vite --port 5200

pause