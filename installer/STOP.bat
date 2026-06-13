@echo off
chcp 65001 >nul
title Viewer Merusuh — Stop

echo.
echo  Menghentikan Viewer Merusuh server...

:: Matikan proses node yang menjalankan server/index.js
for /f "tokens=2" %%a in ('tasklist /fi "imagename eq node.exe" /fo csv /nh 2^>nul') do (
    taskkill /pid %%~a /f >nul 2>&1
)

echo  ✅ Server dihentikan.
echo.
timeout /t 2 /nobreak >nul
