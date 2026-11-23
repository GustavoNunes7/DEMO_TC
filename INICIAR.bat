@echo off
setlocal
title DEMO_TC - TechCampus
cd /d "%~dp0"
cls

echo =====================================================
echo                  DEMO_TC - TECHCAMPUS
echo =====================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale o Node.js LTS.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] npm nao encontrado.
  pause
  exit /b 1
)

if not exist ".env" (
  if not exist ".env.example" (
    echo [ERRO] .env.example nao encontrado.
    pause
    exit /b 1
  )
  copy /Y ".env.example" ".env" >nul
  echo [OK] Arquivo .env criado a partir do modelo.
)

if not exist "node_modules\" (
  echo [*] Instalando dependencias...
  call npm install
  if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
  )
)

echo.
echo [*] Preparando banco, seguranca e conta administrativa...
call node setup-demo.js
if errorlevel 1 (
  echo [ERRO] Falha na preparacao da DEMO_TC.
  pause
  exit /b 1
)

for /f "delims=" %%P in ('node -e "require(''dotenv'').config();process.stdout.write(process.env.PORT||''3022'')" 2^>nul') do set "PORT=%%P"
if not defined PORT set "PORT=3022"
set "URL=http://localhost:%PORT%/"

powershell -NoProfile -Command "$r=try{(Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2).StatusCode}catch{0};if($r -ge 200 -and $r -lt 500){exit 0}else{exit 1}" >nul 2>&1
if not errorlevel 1 (
  echo [INFO] A DEMO_TC ja esta respondendo em %URL%.
  start "" "%URL%"
  exit /b 0
)

netstat -ano | findstr /R /C:":%PORT% .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [ERRO] A porta %PORT% esta ocupada por outro processo.
  echo Feche o servidor antigo ou altere PORT no arquivo .env.
  pause
  exit /b 1
)

echo [*] Iniciando servidor em %URL%...
start "DEMO_TC - Servidor" cmd /k "cd /d ""%~dp0"" && npm start"

echo [*] Aguardando o servidor...
powershell -NoProfile -Command "$u='%URL%';for($i=0;$i -lt 30;$i++){try{$r=(Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 1).StatusCode;if($r -ge 200 -and $r -lt 500){Start-Process $u;exit 0}}catch{};Start-Sleep -Seconds 1};exit 1"
if errorlevel 1 (
  echo [ERRO] O servidor nao respondeu em 30 segundos.
  echo Verifique a janela do servidor para consultar o erro.
  pause
  exit /b 1
)

echo.
echo [OK] DEMO_TC iniciada com sucesso!
timeout /t 2 >nul
exit /b 0
