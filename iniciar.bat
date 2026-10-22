@echo off
title Marcador Tenis Band 5 - iPhone
cd /d "%~dp0"
echo ====================================================
echo   MARCADOR DE TENIS PARA SMARTWATCH BAND 5 + iPHONE
echo ====================================================
echo.
echo 1. Asegurate de que tu iPhone 13 este conectado a la misma red Wi-Fi.
echo 2. Abre Safari en tu iPhone y entra a la direccion IP local que aparecera abajo.
echo 3. Toca "Vincular con Band 5", abre la pantalla de Musica en tu reloj y a jugar!
echo.
echo Detectando tu direccion IP local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    goto :found_ip
)
:found_ip
set IP=%IP: =%
echo Tu direccion para abrir en Safari del iPhone es:
echo.
echo     http://%IP%:8080
echo.
echo Iniciando servidor web en el puerto 8080...
python -m http.server 8080
pause
