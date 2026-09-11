# 📚 Viewer Merusuh — Documentation Index

> **Pusat navigasi seluruh dokumentasi Viewer Merusuh**  
> Temukan dokumentasi yang Anda butuhkan berdasarkan peran dan tujuan.

---

## 🎯 Berdasarkan Peran Pengguna

### 👶 Pemula / First-Time User

Jika Anda baru pertama kali menggunakan Viewer Merusuh:

1. **[README.md](README.md)** — Mulai dari sini!  
   Panduan instalasi, konfigurasi dasar, dan gambaran umum fitur.

2. **[README_INSTALL.txt](README_INSTALL.txt)** — Panduan instalasi cepat untuk user non-technical.

3. **[SETUP.bat](SETUP.bat)** — Script otomatis untuk setup pertama kali (Windows).

---

### 🎮 Streamer / User Akhir

Jika Anda ingin menjalankan Viewer Merusuh untuk streaming:

#### Setup Dasar
- **[README.md](README.md)** — Instalasi & konfigurasi Saweria/Trakteer
- **[README.md#konfigurasi](README.md#konfigurasi)** — Setup webhook & OBS Overlay
- **[README.md#manajemen-efek](README.md#manajemen-efek)** — Konfigurasi efek donasi

#### Hardware & Adapter
- **[docs/VJOY_GUIDE.md](docs/VJOY_GUIDE.md)** — Setup ViGEmBus untuk virtual controller
- **[docs/ADDING_GAMES.md](docs/ADDING_GAMES.md)** — Menambah script AHK untuk game baru

#### Troubleshooting
- **[DEVELOPER_GUIDE.md#faq--troubleshooting](DEVELOPER_GUIDE.md#faq--troubleshooting)** — Masalah umum & solusi

---

### 👨‍💻 Developer / Kontributor

Jika Anda ingin mengembangkan atau berkontribusi ke proyek:

#### Dokumentasi Utama
- **[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** — **BACA INI DULU!**  
  Dokumentasi lengkap arsitektur, database schema, API reference, dan panduan development.

- **[INTEGRASI.md](INTEGRASI.md)** — Panduan integrasi dengan sistem eksternal.

#### Modul Terpisah

**Client Module** (PC Gaming terpisah):
- **[client/README.md](client/README.md)** — Quick start client agent
- **[client/docs/README.md](client/docs/README.md)** — Dokumentasi lengkap Client Module
  - Arsitektur 2-PC setup
  - Adapter reference (AHK, vJoy, Plugin)
  - Web dashboard guide
  - Integrasi dengan server

**RC Module** (Kontrol RC fisik via donasi):
- **[rc-module/README.md](rc-module/README.md)** — Gambaran umum RC Module
- **[rc-module/docs/](rc-module/docs/)** — Dokumentasi teknis RC Module:
  - [API_REFERENCE.md](rc-module/docs/API_REFERENCE.md) — REST API & Socket.IO events
  - [HARDWARE_GUIDE.md](rc-module/docs/HARDWARE_GUIDE.md) — Setup ESP32 & hardware RC
  - [HARDENING_NOTES.md](rc-module/docs/HARDENING_NOTES.md) — Catatan penguatan software
  - [INTEGRATION_GUIDE.md](rc-module/docs/INTEGRATION_GUIDE.md) — Integrasi dengan Viewer Merusuh
- **[rc-module/simulator/README.md](rc-module/simulator/README.md)** — Simulator RC tanpa hardware

#### Build & Deployment
- **[docs/BUILD_ELECTRON.md](docs/BUILD_ELECTRON.md)** — Build .exe installer & portable
- **[docs/PATCH_INSTRUCTIONS.md](docs/PATCH_INSTRUCTIONS.md)** — Instruksi patch update
- **[docs/UPLOAD_GUIDE.md](docs/UPLOAD_GUIDE.md)** — Panduan upload release
- **[docs/VERSION_BUMP.md](docs/VERSION_BUMP.md)** — Prosedur bump version
- **[docs/CHANGELOG.md](docs/CHANGELOG.md)** — Riwayat perubahan versi
- **[docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md)** — Catatan rilis
- **[docs/INTEGRASI.md](docs/INTEGRASI.md)** — Panduan integrasi dengan sistem eksternal

#### Plugin Development
- **[plugins/gta5/README.md](plugins/gta5/README.md)** — Plugin GTA 5 (ScriptHookV .NET)
- **[plugins/beamng/README.md](plugins/beamng/README.md)** — Plugin BeamNG.drive (Lua)

#### Avatar & Overlay
- **[avatar/AVATAR_OVERLAY.md](avatar/AVATAR_OVERLAY.md)** — Dokumentasi avatar overlay
- **[avatar/public/avatars/PANDUAN_SPRITE.md](avatar/public/avatars/PANDUAN_SPRITE.md)** — Panduan sprite avatar

---

### 🔧 Advanced User / System Integrator

Jika Anda mengintegrasikan Viewer Merusuh dengan sistem lain:

#### API Reference
- **[DEVELOPER_GUIDE.md#13-rest-api-reference](DEVELOPER_GUIDE.md#13-rest-api-reference)** — Lengkap REST API server
- **[DEVELOPER_GUIDE.md#14-socketio-events](DEVELOPER_GUIDE.md#14-socketio-events)** — Socket.IO events
- **[rc-module/docs/API_REFERENCE.md](rc-module/docs/API_REFERENCE.md)** — RC Module API

#### Integrasi Eksternal
- **[docs/INTEGRASI.md](docs/INTEGRASI.md)** — Panduan integrasi umum
- **[rc-module/docs/INTEGRATION_GUIDE.md](rc-module/docs/INTEGRATION_GUIDE.md)** — Integrasi RC Module
- **[client/docs/README.md#9-integrasi-dengan-server](client/docs/README.md#9-integrasi-dengan-server)** — Integrasi Client Module

#### Arsitektur Sistem
- **[DEVELOPER_GUIDE.md#2-arsitektur-sistem](DEVELOPER_GUIDE.md#2-arsitektur-sistem)** — Diagram arsitektur lengkap
- **[README.md#arsitektur](README.md#arsitektur)** — Overview arsitektur
- **[rc-module/README.md#3-arsitektur-sistem](rc-module/README.md#3-arsitektur-sistem)** — Arsitektur RC Module
- **[client/docs/README.md#1-konsep--arsitektur](client/docs/README.md#1-konsep--arsitektur)** — Arsitektur Client Module

---

## 📂 Peta Struktur Dokumentasi

```
viewer-merusuh/
│
├── 📘 DOKUMENTASI UTAMA
│   ├── README.md                      ← Mulai dari sini!
│   ├── DEVELOPER_GUIDE.md             ← Dokumentasi developer lengkap
│   └── DOCUMENTATION_INDEX.md         ← Pusat navigasi dokumentasi
│
├── 📙 DOKUMENTASI TEKNIS (docs/)
│   ├── BUILD_ELECTRON.md              ← Build .exe installer
│   ├── ADDING_GAMES.md                ← Tambah game/AHK baru
│   ├── VJOY_GUIDE.md                  ← Setup ViGEmBus
│   ├── INTEGRASI.md                   ← Panduan integrasi sistem eksternal
│   ├── CHANGELOG.md                   ← Riwayat versi
│   ├── RELEASE_NOTES.md               ← Catatan rilis
│   ├── VERSION_BUMP.md                ← Prosedur versioning
│   ├── PATCH_INSTRUCTIONS.md          ← Instruksi patch
│   └── UPLOAD_GUIDE.md                ← Panduan upload release
│
├── 📗 CLIENT MODULE (client/) — *Tetap di lokasi terpisah*
│   ├── README.md                      ← Quick start client
│   └── docs/
│       └── README.md                  ← Dokumentasi lengkap client
│
├── 📕 RC MODULE (rc-module/) — *Tetap di lokasi terpisah*
│   ├── README.md                      ← Overview RC Module
│   ├── docs/
│   │   ├── API_REFERENCE.md           ← API RC Module
│   │   ├── HARDWARE_GUIDE.md          ← Setup hardware ESP32
│   │   ├── HARDENING_NOTES.md         ← Catatan keamanan software
│   │   └── INTEGRATION_GUIDE.md       ← Integrasi dengan VM
│   └── simulator/
│       └── README.md                  ← Simulator RC
│
├── 🎮 PLUGIN DOCUMENTATION (plugins/)
│   ├── gta5/
│   │   └── README.md                  ← Plugin GTA 5
│   └── beamng/
│       └── README.md                  ← Plugin BeamNG.drive
│
├── 🎭 AVATAR & OVERLAY (avatar/)
│   ├── AVATAR_OVERLAY.md              ← Avatar overlay system
│   └── public/avatars/
│       └── PANDUAN_SPRITE.md          ← Panduan sprite avatar
│
└── 📦 INSTALLER (installer/)
    └── README_INSTALL.txt             ← Panduan instalasi user
```

---

## 🔍 Cari Berdasarkan Topik

### Instalasi & Setup
| Topik | Dokumen | Section |
|-------|---------|---------|
| Install dari source | [README.md](README.md) | [Instalasi](README.md#instalasi) |
| Install dari .exe | [README.md](README.md) | [Download & Install](README.md#download--install) |
| Setup otomatis (Windows) | [README_INSTALL.txt](README_INSTALL.txt) | — |
| Setup Client Module | [client/docs/README.md](client/docs/README.md) | [Instalasi](client/docs/README.md#3-instalasi) |
| Setup RC Module | [rc-module/README.md](rc-module/README.md) | [Langkah Memulai](rc-module/README.md#8-langkah-memulai) |
| Build .exe installer | [docs/BUILD_ELECTRON.md](docs/BUILD_ELECTRON.md) | — |

### Konfigurasi
| Topik | Dokumen | Section |
|-------|---------|---------|
| Setup Saweria webhook | [README.md](README.md) | [Konfigurasi](README.md#konfigurasi) |
| Setup Trakteer webhook | [README.md](README.md) | [Konfigurasi](README.md#konfigurasi) |
| OBS Overlay | [README.md](README.md) | [OBS Overlay](README.md#obs-overlay) |
| Environment variables | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | [Config Keys](DEVELOPER_GUIDE.md#15-config-keys) |
| Client Module config | [client/docs/README.md](client/docs/README.md) | [Konfigurasi](client/docs/README.md#4-konfigurasi) |

### Adapter & Game
| Topik | Dokumen | Section |
|-------|---------|---------|
| AutoHotkey adapter | [README.md](README.md) | [AutoHotkey Adapter](README.md#autohotkey-adapter) |
| vJoy/ViGEmBus adapter | [README.md](README.md) | [vJoy / ViGEm Virtual Gamepad](README.md#vjoy--vigem-virtual-gamepad) |
| Setup ViGEmBus | [docs/VJOY_GUIDE.md](docs/VJOY_GUIDE.md) | — |
| Tambah game baru | [docs/ADDING_GAMES.md](docs/ADDING_GAMES.md) | — |
| Plugin GTA 5 | [plugins/gta5/README.md](plugins/gta5/README.md) | — |
| Plugin BeamNG.drive | [plugins/beamng/README.md](plugins/beamng/README.md) | — |
| Client Module adapters | [client/docs/README.md](client/docs/README.md) | [Adapter Reference](client/docs/README.md#7-adapter-reference) |

### API & Development
| Topik | Dokumen | Section |
|-------|---------|---------|
| REST API reference | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | [REST API Reference](DEVELOPER_GUIDE.md#13-rest-api-reference) |
| Socket.IO events | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | [Socket.io Events](DEVELOPER_GUIDE.md#14-socketio-events) |
| Database schema | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | [Database Schema](DEVELOPER_GUIDE.md#4-database-schema) |
| Event Bus | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | [Event Bus](DEVELOPER_GUIDE.md#2-event-bus) |
| Menambah adapter donasi | [README.md](README.md) | [Menambah Adapter Platform Donasi Baru](README.md#menambah-adapter-platform-donasi-baru) |
| Menambah fitur baru | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | [Panduan Menambah Fitur](DEVELOPER_GUIDE.md#16-panduan-menambah-fitur) |
| Fix bug | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) | [Panduan Fix Bug](DEVELOPER_GUIDE.md#17-panduan-fix-bug) |

### RC Module
| Topik | Dokumen | Section |
|-------|---------|---------|
| Gambaran umum | [rc-module/README.md](rc-module/README.md) | — |
| Arsitektur RC Module | [rc-module/README.md](rc-module/README.md) | [Arsitektur Sistem](rc-module/README.md#3-arsitektur-sistem) |
| API Reference | [rc-module/docs/API_REFERENCE.md](rc-module/docs/API_REFERENCE.md) | — |
| Hardware setup | [rc-module/docs/HARDWARE_GUIDE.md](rc-module/docs/HARDWARE_GUIDE.md) | — |
| Software hardening | [rc-module/docs/HARDENING_NOTES.md](rc-module/docs/HARDENING_NOTES.md) | — |
| Integrasi dengan VM | [rc-module/docs/INTEGRATION_GUIDE.md](rc-module/docs/INTEGRATION_GUIDE.md) | — |
| Simulator | [rc-module/simulator/README.md](rc-module/simulator/README.md) | — |

### Deployment & Maintenance
| Topik | Dokumen | Section |
|-------|---------|---------|
| Build Electron app | [docs/BUILD_ELECTRON.md](docs/BUILD_ELECTRON.md) | — |
| Patch instructions | [docs/PATCH_INSTRUCTIONS.md](docs/PATCH_INSTRUCTIONS.md) | — |
| Upload release | [docs/UPLOAD_GUIDE.md](docs/UPLOAD_GUIDE.md) | — |
| Version bump | [docs/VERSION_BUMP.md](docs/VERSION_BUMP.md) | — |
| Changelog | [docs/CHANGELOG.md](docs/CHANGELOG.md) | — |
| Release notes | [docs/RELEASE_NOTES.md](docs/RELEASE_NOTES.md) | — |
| Integrasi sistem | [docs/INTEGRASI.md](docs/INTEGRASI.md) | — |

---

## 🔗 Link Cepat

### Dokumentasi Inti
- 📘 [README Utama](README.md)
- 📗 [Developer Guide](DEVELOPER_GUIDE.md)
- 📙 [Integrasi](INTEGRASI.md)

### Modul
- 🎮 [Client Module](client/README.md) → [Dokumentasi Lengkap](client/docs/README.md)
- 🚗 [RC Module](rc-module/README.md) → [Docs Folder](rc-module/docs/)

### Teknis
- ⚡ [Build Electron](docs/BUILD_ELECTRON.md)
- 🎯 [Tambah Game](docs/ADDING_GAMES.md)
- 🎛️ [vJoy Guide](docs/VJOY_GUIDE.md)
- 🔌 [API Reference](DEVELOPER_GUIDE.md#13-rest-api-reference)

### Release & Deployment
- 📦 [Changelog](docs/CHANGELOG.md)
- 📝 [Release Notes](docs/RELEASE_NOTES.md)
- ⬆️ [Upload Guide](docs/UPLOAD_GUIDE.md)
- 🔧 [Patch Instructions](docs/PATCH_INSTRUCTIONS.md)
- 🔢 [Version Bump](docs/VERSION_BUMP.md)
- 🔗 [Integrasi](docs/INTEGRASI.md)

---

## 📞 Bantuan & Komunitas

- **GitHub Issues:** [Laporkan bug atau request fitur](https://github.com/noobiiefun/Viewer-Merusuh/issues)
- **Pull Requests:** [Kontribusi kode atau dokumentasi](https://github.com/noobiiefun/Viewer-Merusuh/pulls)
- **Diskusi:** [GitHub Discussions](https://github.com/noobiiefun/Viewer-Merusuh/discussions)

---

## 📝 Kontribusi Dokumentasi

Dokumentasi ini terus dikembangkan. Jika Anda menemukan:
- ❌ Link yang broken
- 📄 Dokumentasi yang kurang jelas
- 🆕 Fitur yang belum terdokumentasi

Silakan buka issue atau submit PR untuk perbaikan!

---

<div align="center">

**[⬅ Kembali ke README Utama](README.md)** | **[Lanjut ke Developer Guide](DEVELOPER_GUIDE.md)**

Dibuat dengan ❤️ untuk memudahkan pengembangan Viewer Merusuh

</div>
