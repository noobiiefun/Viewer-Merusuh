; adapters/ahk/games/racing/flip_car.ahk
; Viewer Merusuh — Efek: Balik Mobil
; Cara kerja: steer kiri/kanan ekstrem + gas → mobil terbalik
; Paling efektif di kecepatan tinggi

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
STEER_KEY := "d"          ; steer kanan
GAS_KEY   := "w"
; ─────────────────────────────────────────────────────

VM_Log("flip_car START")

; Steer keras ke kanan sambil gas → memicu oversteer/flip
Send("{" GAS_KEY " down}")
Send("{" STEER_KEY " down}")
Sleep(400)
Send("{" STEER_KEY " up}")

; Steer balik kiri kencang
Send("{a down}")
Sleep(600)
Send("{a up}")
Send("{" GAS_KEY " up}")

VM_Log("flip_car DONE")
