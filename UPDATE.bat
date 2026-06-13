@echo off
chcp 65001 >nul
title Viewer Merusuh — Update

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║       🎮  VIEWER MERUSUH — Update             ║
echo  ╚═══════════════════════════════════════════════╝
echo.

:: ── Cek git tersedia ──────────────────────────────────────────────────
git --version >nul 2>&1
if errorlevel 1 (
    echo  ❌ Git tidak ditemukan.
    echo.
    echo  Untuk update manual:
    echo  1. Download ZIP terbaru dari GitHub
    echo  2. Extract dan timpa folder ini ^(kecuali .env dan viewer-merusuh.db^)
    echo.
    pause
    exit /b 1
)

:: ── Stop server dulu ──────────────────────────────────────────────────
echo  [1/4] Menghentikan server...
call STOP.bat >nul 2>&1

:: ── Backup .env dan database ──────────────────────────────────────────
echo  [2/4] Backup konfigurasi...
if exist ".env" copy ".env" ".env.backup" >nul
if exist "viewer-merusuh.db" copy "viewer-merusuh.db" "viewer-merusuh.db.backup" >nul
echo  ✅ Backup disimpan ^(.env.backup, viewer-merusuh.db.backup^)

:: ── Pull update ───────────────────────────────────────────────────────
echo  [3/4] Mengambil update dari GitHub...
git pull origin main
if errorlevel 1 (
    echo.
    echo  ❌ Gagal update dari GitHub.
    echo  Cek koneksi internet dan coba lagi.
    echo.
    pause
    exit /b 1
)

:: ── Install dependencies baru ─────────────────────────────────────────
echo  [4/4] Update dependencies...
call npm install --production 2>&1
if exist "dashboard\src" (
    cd dashboard && call npm install && call npm run build && cd ..
)

echo.
echo  ✅ Update selesai!
echo.
echo  Jalankan START.bat untuk mulai dengan versi terbaru.
echo.
pause
