@echo off
chcp 65001 >nul
title Viewer Merusuh — Setup

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║       🎮  VIEWER MERUSUH v1.0.0               ║
echo  ║       Setup Pertama Kali                      ║
echo  ╚═══════════════════════════════════════════════╝
echo.

:: ── Cek apakah sudah pernah di-setup ─────────────────────────────────
if exist "viewer-merusuh.db" (
    echo  ✅ Database sudah ada. Setup sudah pernah dijalankan.
    echo.
    echo  Jika ingin reset dari awal, hapus file viewer-merusuh.db
    echo  lalu jalankan SETUP.bat lagi.
    echo.
    pause
    goto :done
)

:: ── Cek Node.js ───────────────────────────────────────────────────────
echo  [1/5] Mengecek Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  ❌ Node.js tidak ditemukan!
    echo.
    echo  Viewer Merusuh membutuhkan Node.js versi 18 atau lebih baru.
    echo  Download di: https://nodejs.org/en/download
    echo.
    echo  Setelah install Node.js, jalankan SETUP.bat lagi.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  ✅ Node.js %NODE_VER% ditemukan

:: ── Install dependencies ──────────────────────────────────────────────
echo.
echo  [2/5] Menginstall dependencies...
echo  (Ini mungkin butuh beberapa menit pertama kali)
echo.
call npm install --production 2>&1
if errorlevel 1 (
    echo.
    echo  ❌ Gagal install dependencies!
    echo  Pastikan koneksi internet aktif lalu coba lagi.
    echo.
    pause
    exit /b 1
)
echo  ✅ Dependencies berhasil diinstall

:: ── Inisialisasi database ─────────────────────────────────────────────
echo.
echo  [3/5] Membuat database...
call node server/db/setup.js
if errorlevel 1 (
    echo.
    echo  ❌ Gagal membuat database!
    echo.
    pause
    exit /b 1
)
echo  ✅ Database berhasil dibuat

:: ── Buat .env jika belum ada ──────────────────────────────────────────
echo.
echo  [4/5] Membuat file konfigurasi...
if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo  ✅ File .env berhasil dibuat dari template
    echo.
    echo  ⚠️  Jangan lupa isi konfigurasi di .env atau lewat dashboard
) else (
    echo  ✅ File .env sudah ada, skip
)

:: ── Build dashboard jika belum ada ────────────────────────────────────
echo.
echo  [5/5] Menyiapkan dashboard...
if not exist "dashboard\dist\index.html" (
    echo  Membangun dashboard... ^(butuh beberapa menit^)
    cd dashboard
    call npm install 2>&1
    call npm run build 2>&1
    cd ..
    if exist "dashboard\dist\index.html" (
        echo  ✅ Dashboard berhasil dibangun
    ) else (
        echo  ⚠️  Dashboard gagal dibangun - akan menggunakan mode dev
    )
) else (
    echo  ✅ Dashboard sudah siap
)

:: ── Selesai ───────────────────────────────────────────────────────────
echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║   ✅  Setup selesai! Viewer Merusuh siap.     ║
echo  ╠═══════════════════════════════════════════════╣
echo  ║                                               ║
echo  ║   Langkah selanjutnya:                        ║
echo  ║   1. Double-click START.bat untuk mulai       ║
echo  ║   2. Buka http://localhost:3000/dashboard      ║
echo  ║   3. Isi API key di menu Secrets ^& Config     ║
echo  ║   4. Set webhook URL di Saweria/Trakteer       ║
echo  ║                                               ║
echo  ╚═══════════════════════════════════════════════╝
echo.

set /p STARTQ=Mau langsung mulai sekarang? (Y/N): 
if /i "%STARTQ%"=="Y" goto :startserver

echo.
echo  Jalankan START.bat kapan saja untuk memulai.
pause
goto :done

:startserver
start "" START.bat

:done
