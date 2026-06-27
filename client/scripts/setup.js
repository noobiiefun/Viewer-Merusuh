#!/usr/bin/env node
'use strict';

/**
 * Setup script — membuat .env dari .env.example
 * Jalankan: npm run setup
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.resolve(__dirname, '..');
const envPath = path.join(ROOT, '.env');
const exPath  = path.join(ROOT, '.env.example');

if (fs.existsSync(envPath)) {
  console.log('\n⚠️  File .env sudah ada — tidak ditimpa.');
  console.log('   Hapus .env dulu jika ingin reset ke default.\n');
  process.exit(0);
}

if (!fs.existsSync(exPath)) {
  console.error('❌ .env.example tidak ditemukan!');
  process.exit(1);
}

fs.copyFileSync(exPath, envPath);

console.log(`
✅  File .env berhasil dibuat dari .env.example

📝  Langkah selanjutnya:
   1. Buka file .env
   2. Isi SERVER_URL dengan IP PC Server (PC OBS)
      Contoh: SERVER_URL=http://192.168.1.10:3000
   3. Isi CLIENT_SECRET dengan nilai yang sama seperti di server
      Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   4. Sesuaikan adapter yang ingin diaktifkan:
      ADAPTER_AHK=true
      ADAPTER_VJOY=false
      ADAPTER_PLUGIN=false
   5. Jalankan: npm start

🌐  Web Dashboard tersedia di: http://localhost:3002
`);
