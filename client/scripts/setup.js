/**
 * scripts/setup.js
 * Script setup pertama kali — membuat .env dari .env.example
 * jika belum ada.
 *
 * Jalankan: node scripts/setup.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const envDest = path.join(ROOT, '.env');
const envSrc  = path.join(ROOT, '.env.example');

console.log('\n🔧  Viewer Merusuh Client — Setup\n');

if (fs.existsSync(envDest)) {
  console.log('✅  File .env sudah ada. Setup dilewati.');
  console.log('   Jika ingin reset, hapus .env lalu jalankan setup lagi.\n');
  process.exit(0);
}

if (!fs.existsSync(envSrc)) {
  console.error('❌  File .env.example tidak ditemukan!');
  process.exit(1);
}

fs.copyFileSync(envSrc, envDest);

console.log('✅  File .env berhasil dibuat dari .env.example');
console.log('\n📝  Langkah selanjutnya:');
console.log('   1. Buka file .env');
console.log('   2. Isi SERVER_URL dengan IP PC Server (PC OBS)');
console.log('   3. Isi CLIENT_SECRET dengan nilai yang sama seperti di server');
console.log('   4. Sesuaikan adapter yang ingin diaktifkan');
console.log('   5. Jalankan: npm start\n');
