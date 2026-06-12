; adapters/ahk/games/racing/full_throttle.ahk
; Viewer Merusuh — Efek: Full Throttle (gas penuh paksa)
; Berguna saat streamer mau belok / berhenti — dipaksa gas terus

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
GAS_KEY  := "w"           ; W = gas di kebanyakan game
duration := VM_GetDuration(3000)
; ─────────────────────────────────────────────────────

VM_Log("full_throttle START — duration: " duration "ms")

VM_HoldKey(GAS_KEY, duration)

VM_Log("full_throttle DONE")
