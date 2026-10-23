@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   STARFALL DEFENSE - Servidor local
echo ============================================
echo.
echo Abriendo el juego en el navegador...
echo Si la pagina no carga, abre manualmente:
echo     http://localhost:8123
echo.
echo Cierra esta ventana para detener el servidor.
echo.

start "" "http://localhost:8123"

python -m http.server 8123
if errorlevel 1 (
    echo.
    echo No se encontro Python. Abre index.html directamente
    echo con doble clic en el navegador.
    pause
)
