╔══════════════════════════════════════════════════════════════╗
║                  🎮  VIEWER MERUSUH v1.0.0                  ║
║         Biarkan viewer merusuh saat kamu livestream!         ║
╚══════════════════════════════════════════════════════════════╝

  Platform donasi yang didukung: Saweria, Trakteer
  Kompatibel dengan: GTA 5, BeamNG.drive, NFS, Forza, dan lainnya
  OS: Windows 10/11 (64-bit)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ADA 2 VERSI — PILIH SALAH SATU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📦 viewer-merusuh-setup-1.0.0.exe  ← RECOMMENDED
     Installer biasa (next-next-finish)
     Buat shortcut di desktop dan Start Menu
     Bisa di-uninstall dari Control Panel

  📦 viewer-merusuh-1.0.0-portable.exe
     Tidak perlu install — langsung jalankan
     Cocok untuk USB / berpindah-pindah PC
     Data disimpan di folder yang sama dengan .exe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INSTALASI (VERSI INSTALLER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Double-click: viewer-merusuh-setup-1.0.0.exe
  2. Klik Next → Next → Install → Finish
  3. Viewer Merusuh otomatis terbuka
  4. Setup Wizard muncul → ikuti panduan
  5. Selesai! 🎉

  Setelah install, buka dari:
  → Shortcut di Desktop: "Viewer Merusuh"
  → Start Menu → Viewer Merusuh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CARA PAKAI (SETELAH INSTALL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  STEP 1 — Hubungkan platform donasi
  ┌─────────────────────────────────────────────────────────┐
  │ SAWERIA:                                                │
  │   • Buka https://saweria.co/dashboard → Stream Key     │
  │   • Copy Stream Key                                     │
  │   • Di Viewer Merusuh → menu "🔐 Secrets & Config"     │
  │   • Paste ke kolom "Saweria Stream Key" → Simpan       │
  │   • Set Webhook URL ke: http://localhost:3000/webhook/  │
  │     saweria                                             │
  │                                                         │
  │ TRAKTEER:                                               │
  │   • Buka https://trakteer.id/manage/integration         │
  │   • Copy API Key                                        │
  │   • Di Viewer Merusuh → menu "🔐 Secrets & Config"     │
  │   • Paste ke kolom "Trakteer API Key" → Simpan         │
  │   • Set Webhook URL ke: http://localhost:3000/webhook/  │
  │     trakteer                                            │
  └─────────────────────────────────────────────────────────┘

  STEP 2 — Setup OBS Overlay (notifikasi di layar)
  ┌─────────────────────────────────────────────────────────┐
  │   1. Buka OBS Studio                                    │
  │   2. Sources → klik + → pilih Browser Source           │
  │   3. URL: http://localhost:3000/overlay                 │
  │   4. Width: 400 — Height: 600                           │
  │   5. "Shutdown source when not visible" → OFF           │
  │   6. Klik OK, posisikan di pojok layar                  │
  └─────────────────────────────────────────────────────────┘

  STEP 3 — Setup efek game
  ┌─────────────────────────────────────────────────────────┐
  │   • Di dashboard → menu "⚡ Efek"                       │
  │   • Efek default sudah tersedia                         │
  │   • Sesuaikan nominal donasi → aksi game                │
  │   • Test di menu "🧪 Testing Area"                      │
  └─────────────────────────────────────────────────────────┘

  STEP 4 — Atur efek AutoHotkey (untuk game keyboard)
  ┌─────────────────────────────────────────────────────────┐
  │   • Download AutoHotkey v2:                             │
  │     https://www.autohotkey.com/download/                │
  │   • Install dengan setting default                      │
  │   • Viewer Merusuh otomatis deteksi AHK                 │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PERLU NGROK JIKA SERVER LOKAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Saweria/Trakteer mengirim webhook dari internet ke PC kamu.
  Jika kamu streaming dari rumah (bukan VPS), butuh ngrok:

  1. Download ngrok: https://ngrok.com/download
  2. Jalankan: ngrok http 3000
  3. Copy URL yang diberikan (contoh: https://abc123.ngrok.io)
  4. Gunakan URL itu sebagai webhook di Saweria/Trakteer:
     https://abc123.ngrok.io/webhook/saweria

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ICON DI SYSTEM TRAY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Setelah dijalankan, Viewer Merusuh ada di system tray
  (pojok kanan bawah taskbar, dekat jam).

  Klik kanan icon tray untuk:
  → Buka Dashboard
  → Buka di Browser
  → Copy URL Overlay OBS
  → Keluar

  Menutup window TIDAK mematikan server — app tetap
  berjalan di background. Gunakan menu tray → Keluar
  untuk benar-benar menutup.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PORT BENTROK?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Jika ada error "Port 3000 sudah dipakai":
  → Di dashboard → menu "🔐 Secrets & Config"
  → Ganti PORT ke angka lain (misal: 3001, 4000, 8080)
  → Klik Simpan → Restart aplikasi

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  MASALAH UMUM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ❌ Aplikasi tidak mau buka
     → Klik kanan .exe → "Run as administrator"
     → Atau cek Windows Defender / antivirus

  ❌ Dashboard tidak tampil (layar kosong)
     → Tunggu 5-10 detik, server butuh waktu start
     → Klik kanan tray → Buka Dashboard

  ❌ Donasi masuk tapi efek tidak jalan
     → Pastikan game dalam mode Window atau Borderless
     → Pastikan AutoHotkey v2 sudah terinstall
     → Cek menu "🧪 Testing Area" untuk diagnosa

  ❌ OBS overlay tidak tampil
     → Pastikan Viewer Merusuh sudah jalan sebelum buka OBS
     → Klik kanan Browser Source di OBS → Refresh

  ❌ Webhook tidak masuk dari Saweria/Trakteer
     → Pastikan ngrok berjalan dan URL sudah diupdate
     → Cek Stream Key / API Key di menu Secrets & Config

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DATA TERSIMPAN DI MANA?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Semua konfigurasi dan data tersimpan di:
  C:\Users\[nama]\AppData\Roaming\Viewer Merusuh\

  File:
  → .env              = konfigurasi (PORT, API keys)
  → viewer-merusuh.db = database (efek, log donasi)

  Data TIDAK hilang saat update atau reinstall.
  Untuk reset: hapus folder di atas, lalu restart app.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PLUGIN GAME NATIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Untuk efek lebih canggih di dalam game:

  GTA 5 (Story Mode only — JANGAN di Online!):
  → Install ScriptHookV + ScriptHookV .NET
  → Copy ViewerMerusuh.cs ke folder GTA 5\scripts\
  → Panduan: buka dashboard → menu Dokumentasi

  BeamNG.drive:
  → Copy folder viewermerusuh ke:
    Documents\BeamNG.drive\mods\unpacked\
  → Aktifkan via Extensions menu di BeamNG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BANTUAN & KOMUNITAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  GitHub   : https://github.com/username/viewer-merusuh
  Issues   : https://github.com/username/viewer-merusuh/issues
  Diskusi  : https://github.com/username/viewer-merusuh/discussions

  MIT License — Open source, bebas digunakan & dimodifikasi.
  Dibuat dengan ☕ untuk komunitas streamer Indonesia.

══════════════════════════════════════════════════════════════
