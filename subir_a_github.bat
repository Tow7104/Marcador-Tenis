@echo off
title Sincronizar Marcador Tenis con GitHub
echo ========================================================
echo   Sincronizando Marcador Tenis con GitHub
echo   Repositorio: https://github.com/Tow7104/Marcador-Tenis.git
echo ========================================================
echo.

set "PATH=%LOCALAPPDATA%\GitHubDesktop\app-3.6.8\resources\app\git\cmd;%PATH%"

echo Enviando ultimos cambios a la rama principal (main)...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   EXITO: Los cambios se subieron correctamente a GitHub!
    echo ========================================================
) else (
    echo ========================================================
    echo   Atencion: Si es la primera vez, inicia sesion en la
    echo   ventana que aparezca para autorizar la cuenta.
    echo ========================================================
)

echo.
echo Presione cualquier tecla para cerrar esta ventana...
pause >nul
