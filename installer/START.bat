@echo off
chcp 65001 >nul
title Viewer Merusuh — Server

:: ── Cek setup sudah dijalankan ────────────────────────────────────────
if not exist "viewer-merusuh.db" (
    echo.
    echo  ⚠️  Database belum ada. Menjalankan setup dulu...
    echo.
    call SETUP.bat
)

if not exist "node_modules" (
    echo.
    echo  ⚠️  Dependencies belum terinstall. Menjalankan setup...
    echo.
    call SETUP.bat
)

:: ── Baca PORT dari .env ───────────────────────────────────────────────
set PORT=3000
if exist ".env" (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="PORT" set PORT=%%b
    )
)

:: ── Tampilkan info ────────────────────────────────────────────────────
echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║       🎮  VIEWER MERUSUH v1.0.0               ║
echo  ╠═══════════════════════════════════════════════╣
echo  ║  Server  : http://localhost:%PORT%                ║
echo  ║  Dashboard: http://localhost:%PORT%/dashboard     ║
echo  ║  Overlay  : http://localhost:%PORT%/overlay       ║
echo  ╠═══════════════════════════════════════════════╣
echo  ║  Tekan Ctrl+C untuk matikan server            ║
echo  ╚═══════════════════════════════════════════════╝
echo.

:: ── Buka browser otomatis setelah 2 detik ────────────────────────────
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:%PORT%/dashboard"

:: ── Jalankan server ───────────────────────────────────────────────────
node server/index.js

:: ── Jika server mati karena error ────────────────────────────────────
echo.
echo  Server berhenti. Tekan tombol apa saja untuk tutup.
pause >nul
