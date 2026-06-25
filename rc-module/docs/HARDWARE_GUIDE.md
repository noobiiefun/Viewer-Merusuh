# Hardware Guide — RC Module

Panduan lengkap untuk menghubungkan hardware RC dan drone ke RC Module.

---

## Daftar Isi

1. [Pilihan Hardware](#1-pilihan-hardware)
2. [ESP32 + RC Darat](#2-esp32--rc-darat)
3. [ESP32-CAM untuk FPV](#3-esp32-cam-untuk-fpv)
4. [Raspberry Pi + Drone](#4-raspberry-pi--drone)
5. [Wiring Diagram](#5-wiring-diagram)
6. [Tips & Troubleshooting](#6-tips--troubleshooting)

---

## 1. Pilihan Hardware

### Rekomendasi untuk Pemula: ESP32 + RC Murah

Total budget bisa mulai dari **Rp 150.000 - Rp 300.000** per unit RC:

| Komponen | Estimasi Harga | Link/Catatan |
|----------|---------------|--------------|
| ESP32 DevKit | Rp 50.000 | Beli di Tokopedia/Shopee |
| Motor Driver L298N | Rp 20.000 | Atau L293D |
| RC chassis kit (4WD) | Rp 80.000 | Beli yang sudah ada roda + motor |
| ESP32-CAM | Rp 55.000 | Untuk kamera FPV |
| Power bank mini | Rp 80.000 | Atau baterai LiPo 18650 |
| Kabel jumper | Rp 15.000 | |

---

## 2. ESP32 + RC Darat

### Cara Kerja

```
Browser Viewer
    ↓ WebSocket (WiFi)
RC Module Server (Node.js)
    ↓ WebSocket (WiFi lokal)
ESP32 di dalam RC
    ↓ PWM / GPIO
Motor Driver L298N
    ↓ Arus listrik
Motor DC (2 atau 4 roda)
```

### Komponen yang Dibutuhkan

```
ESP32 DevKit v1
    → Pin GPIO 26 → IN1 (L298N)
    → Pin GPIO 27 → IN2 (L298N)
    → Pin GPIO 14 → IN3 (L298N)
    → Pin GPIO 12 → IN4 (L298N)
    → Pin GPIO 25 → ENA (L298N) — PWM kecepatan kiri
    → Pin GPIO 33 → ENB (L298N) — PWM kecepatan kanan
    → GND → GND (L298N)
    → VIN → 5V (L298N)

L298N Motor Driver
    → OUT1, OUT2 → Motor Kiri
    → OUT3, OUT4 → Motor Kanan
    → 12V → Baterai +
    → GND → Baterai -
```

### Firmware ESP32 (Arduino IDE)

Lihat file: `hardware/esp32/firmware.ino`

Firmware ini melakukan:
1. Konek ke WiFi rumah/hotspot
2. Buka WebSocket server di port 81
3. Terima perintah JSON dari server Node.js
4. Terjemahkan perintah ke sinyal PWM motor

### Konfigurasi di RC Module

Setelah firmware di-upload, daftarkan RC di admin panel:
```json
{
  "name": "RC ESP32 #1",
  "type": "car",
  "adapter": "esp32",
  "ip_address": "192.168.1.101",
  "ws_port": 81
}
```

---

## 3. ESP32-CAM untuk FPV

### Opsi A — MJPEG Stream (Paling Mudah)

ESP32-CAM punya web server built-in yang bisa stream MJPEG:

1. Flash firmware `CameraWebServer` (ada di Arduino IDE examples)
2. Setting resolusi ke QVGA (320x240) untuk latency rendah
3. Akses stream di: `http://<IP_ESP32CAM>/stream`
4. Masukkan URL ini sebagai `cam_url` saat daftar RC

**Kelemahan:** Butuh 2 ESP32 (satu untuk kontrol, satu untuk kamera) atau ESP32-CAM yang juga handle motor (lebih kompleks).

### Opsi B — ESP32-CAM sebagai satu unit

ESP32-CAM punya GPIO yang cukup untuk motor driver sederhana. Satu chip untuk kamera + kontrol:

```
ESP32-CAM
    → GPIO 12, 13 → L298N IN1, IN2 (motor kanan)
    → GPIO 15, 14 → L298N IN3, IN4 (motor kiri)
    → Camera → MJPEG stream
    → WiFi → WebSocket kontrol + HTTP kamera
```

> ⚠️ **Catatan:** GPIO ESP32-CAM terbatas karena banyak dipakai kamera. Perlu hati-hati pin mapping.

### Opsi C — USB Webcam via Raspberry Pi

Lebih stabil dan kualitas lebih baik:
```
Raspberry Pi → USB Webcam → ffmpeg → HLS stream → Browser
```

---

## 4. Raspberry Pi + Drone

> ⏳ Dokumentasi ini untuk Phase 4 ke atas. Hardware lebih kompleks.

### Stack untuk Drone DIY

```
Raspberry Pi 4 (onboard drone)
    ↓ UART / USB
Flight Controller (Pixhawk / APM)
    ↓ MAVLink protocol
ArduCopter / PX4 firmware
    ↓ PWM
ESC (Electronic Speed Controller)
    ↓
Motor brushless
```

### Library yang Dipakai

- **pymavlink** — Python library untuk komunikasi MAVLink
- **MAVLink.js** — alternatif Node.js
- **DroneKit-Python** — high-level API untuk kontrol drone

### Contoh Perintah Dasar (DroneKit)

```python
from dronekit import connect, VehicleMode

vehicle = connect('/dev/ttyUSB0', baud=57600)
vehicle.mode = VehicleMode("GUIDED")

# Takeoff 2 meter
vehicle.simple_takeoff(2)

# Move forward
vehicle.simple_goto(target_location)
```

### Keamanan Drone

> ⚠️ **PENTING:** Pengoperasian drone di Indonesia diatur oleh **Permenhub No. 37 Tahun 2020**.
> - Drone > 250 gram wajib didaftarkan di DGCA
> - Tidak boleh terbang di atas kerumunan
> - Ketinggian max 120 meter dari permukaan tanah
> - Selalu ada "killswitch" manual di sistem

**Killswitch wajib diimplementasi:** Server harus bisa kirim perintah `LAND` atau `RTH (Return to Home)` kapan saja.

---

## 5. Wiring Diagram

### RC Darat (ESP32 + L298N)

```
                    ┌─────────────┐
                    │    ESP32    │
                    │             │
   ┌────────────────┤ GPIO26 IN1  │
   │    ┌───────────┤ GPIO27 IN2  │
   │    │    ┌──────┤ GPIO14 IN3  │
   │    │    │  ┌───┤ GPIO12 IN4  │
   │    │    │  │   │ GPIO25 ENA  ├───┐
   │    │    │  │   │ GPIO33 ENB  ├──┐│
   │    │    │  │   │             │  ││
   │    │    │  │   │   GND       ├──┼┼──┐
   │    │    │  │   │   VIN (5V)  ├──┼┼──┼──┐
   │    │    │  │   └─────────────┘  ││  │  │
   │    │    │  │                    ││  │  │
   │    │    │  │   ┌─────────────┐  ││  │  │
   │    │    │  └──►│ L298N       │  ││  │  │
   │    │    └─────►│             │  ││  │  │
   │    └──────────►│ IN1-IN4     │  ││  │  │
   └───────────────►│ ENA ◄───────┼──┘│  │  │
                    │ ENB ◄───────┼───┘  │  │
                    │ GND ◄───────┼──────┘  │
                    │ 5V  ◄───────┼─────────┘
                    │             │
                    │ OUT1,OUT2 ──┼──► Motor Kiri
                    │ OUT3,OUT4 ──┼──► Motor Kanan
                    │ 12V  ◄──────┼──► Baterai +
                    │ GND  ◄──────┼──► Baterai -
                    └─────────────┘
```

---

## 6. Tips & Troubleshooting

### ESP32 tidak konek WiFi
- Pastikan SSID dan password benar di firmware
- ESP32 hanya support WiFi 2.4GHz (tidak bisa 5GHz)
- Cek IP yang didapat via Serial Monitor Arduino IDE

### Latency kontrol tinggi
- Gunakan WiFi 2.4GHz yang tidak ramai channel
- Kurangi rate pengiriman perintah: minimum 100ms antar perintah
- Pastikan ESP32 dan server dalam satu network (tidak lewat internet)

### Motor bergetar tapi tidak maju/mundur
- Cek wiring IN1-IN4, kemungkinan terbalik
- Coba swap kabel motor (+ dan -)
- Pastikan ENA dan ENB HIGH (untuk enable H-bridge)

### Kamera FPV lag
- Turunkan resolusi ke QVGA atau VGA
- Kurangi frame rate ke 15fps
- Pastikan sinyal WiFi kuat di area RC bergerak

### Server tidak bisa kirim perintah ke ESP32
- Pastikan IP ESP32 sudah benar di konfigurasi RC
- Cek apakah port 81 tidak diblokir firewall
- Gunakan endpoint `POST /api/rc/:id/ping` untuk test koneksi

---

*Versi dokumen: 0.1.0 — Phase 1*
*Update berikutnya: Setelah Phase 3 (hardware integration)*
