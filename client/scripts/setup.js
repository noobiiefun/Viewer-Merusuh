#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const envExample = path.join(__dirname, '..', '.env.example');
const envTarget  = path.join(__dirname, '..', '.env');

if (fs.existsSync(envTarget)) {
  console.log('.env sudah ada. Hapus manual jika ingin reset.');
  process.exit(0);
}

if (!fs.existsSync(envExample)) {
  console.error('.env.example tidak ditemukan!');
  process.exit(1);
}

fs.copyFileSync(envExample, envTarget);
console.log('✅  File .env berhasil dibuat dari .env.example\n');
console.log('📝  Langkah selanjutnya:');
console.log('   1. Buka file .env');
console.log('   2. Isi SERVER_URL dengan IP PC Server (PC OBS)');
console.log('   3. Isi CLIENT_SECRET dengan nilai yang sama seperti di server');
console.log('   4. Sesuaikan adapter yang ingin diaktifkan');
console.log('   5. (Opsional) Jalankan: npm run sync-scripts');
console.log('   6. Jalankan: npm start');
