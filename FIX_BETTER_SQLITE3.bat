@echo off
chcp 65001 >nul
title Viewer Merusuh — Fix better-sqlite3

echo.
echo  ════════════════════════════════════════════════
echo   FIX: better-sqlite3 binding error
echo  ════════════════════════════════════════════════
echo.

echo  [1/4] Cek versi Node.js aktif...
node --version
echo.

echo  [2/4] Cek versi better-sqlite3 di package.json...
findstr "better-sqlite3" package.json
echo.

echo  [3/4] Hapus better-sqlite3 lama dan paksa reinstall versi 12.11.1...
rd /s /q node_modules\better-sqlite3 2>nul
call npm install better-sqlite3@12.11.1 --no-save
call npm install better-sqlite3@12.11.1
echo.

echo  [4/4] Verifikasi binary ada...
if exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo  ✅ Binary ditemukan!
    dir node_modules\better-sqlite3\build\Release\better_sqlite3.node
) else (
    echo  ❌ Binary TIDAK ditemukan — masih bermasalah
    echo     Coba jalankan manual: npm install better-sqlite3@12.11.1 --build-from-source
)

echo.
echo  Lanjut test: node server/db/setup.js
pause
