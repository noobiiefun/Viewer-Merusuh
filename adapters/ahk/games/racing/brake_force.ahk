; adapters/ahk/games/racing/brake_force.ahk
; Viewer Merusuh — Efek: Rem Mendadak
; Kompatibel: BeamNG.drive, NFS, Forza (keyboard mode), GTA 5 racing
;
; Cara kerja: hold tombol rem (default: Space atau S) selama durasi tertentu
; Tombol rem bisa beda per game — edit BRAKE_KEY sesuai keybind game kamu

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
; Ganti sesuai keybind rem di game kamu:
;   BeamNG.drive  : "Space"
;   NFS / Forza   : "Space" atau "s"
;   GTA 5         : "Space"
;   Custom        : ganti sesuai setting in-game
BRAKE_KEY   := "Space"
duration    := VM_GetDuration(3000)
; ─────────────────────────────────────────────────────

VM_Log("brake_force START — duration: " duration "ms, key: " BRAKE_KEY)

; Hold rem
VM_HoldKey(BRAKE_KEY, duration)

VM_Log("brake_force DONE")
