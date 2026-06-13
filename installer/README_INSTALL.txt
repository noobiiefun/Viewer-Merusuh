╔══════════════════════════════════════════════════════════════╗
║                  🎮  VIEWER MERUSUH v1.0.0                  ║
║         Biarkan viewer merusuh saat kamu livestream!         ║
╚══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INSTALASI PERTAMA KALI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LANGKAH 1: Install Node.js (wajib, cukup sekali)
  → Buka: https://nodejs.org/en/download
  → Download versi LTS (tombol hijau)
  → Install dengan semua setting default
  → Restart PC setelah install

LANGKAH 2: Jalankan Setup
  → Double-click file: SETUP.bat
  → Tunggu hingga selesai (butuh koneksi internet)
  → Muncul pesan "Setup selesai!" = berhasil

LANGKAH 3: Mulai Viewer Merusuh
  → Double-click file: START.bat
  → Browser otomatis terbuka ke Dashboard
  → Selesai! 🎉


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PENGGUNAAN SEHARI-HARI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  START.bat  → Mulai server (jalankan sebelum streaming)
  STOP.bat   → Matikan server
  UPDATE.bat → Update ke versi terbaru (butuh Git)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  KONFIGURASI SAWERIA / TRAKTEER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Jalankan START.bat
  2. Buka dashboard: http://localhost:3000/dashboard
  3. Klik menu "🔐 Secrets & Config"
  4. Isi Stream Key (Saweria) atau API Key (Trakteer)
  5. Klik "💾 Simpan Semua"

  Untuk Saweria webhook URL:
  → Buka: https://saweria.co/dashboard → Stream Key
  → Set Webhook URL ke: http://localhost:3000/webhook/saweria
  → (Butuh ngrok jika streaming dari luar jaringan lokal)

  Untuk Trakteer webhook URL:
  → Buka: https://trakteer.id/manage/integration
  → Set Webhook URL ke: http://localhost:3000/webhook/trakteer


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SETUP OBS OVERLAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Buka OBS Studio
  2. Di panel Sources → klik tombol +
  3. Pilih "Browser Source"
  4. Isi URL: http://localhost:3000/overlay
  5. Width: 400, Height: 600
  6. Centang "Shutdown source when not visible" → OFF
  7. Klik OK
  8. Pindahkan source ke pojok layar sesuai selera


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SETUP AUTOHOTKEY (Untuk efek keyboard/mouse)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Download AutoHotkey v2: https://www.autohotkey.com/download/
  2. Install dengan setting default
  3. Di dashboard → "🔐 Secrets & Config" → isi path AHK


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PORT BENTROK?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Jika muncul error "Port 3000 sudah dipakai":
  1. Buka file .env dengan Notepad
  2. Cari baris: PORT=3000
  3. Ganti angkanya, misal: PORT=3001
  4. Simpan file
  5. Jalankan START.bat lagi


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MASALAH UMUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ "node is not recognized"
     → Node.js belum terinstall atau perlu restart PC

  ❌ Server berjalan tapi webhook tidak masuk
     → Pastikan URL webhook di Saweria/Trakteer sudah benar
     → Jika server di PC lokal, butuh ngrok untuk akses dari luar

  ❌ OBS overlay tidak tampil notifikasi
     → Pastikan server berjalan sebelum buka OBS
     → Klik kanan source di OBS → Refresh

  ❌ Efek tidak berjalan di game
     → Pastikan AutoHotkey v2 sudah terinstall
     → Pastikan game dalam mode windowed/borderless, bukan fullscreen eksklusif

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BANTUAN & KONTRIBUSI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub : https://github.com/username/viewer-merusuh
  Issues : https://github.com/username/viewer-merusuh/issues

  MIT License — Bebas digunakan dan dimodifikasi.
  Dibuat dengan ☕ untuk komunitas streamer Indonesia.

══════════════════════════════════════════════════════════════
