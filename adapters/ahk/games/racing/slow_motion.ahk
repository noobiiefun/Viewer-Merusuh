; adapters/ahk/games/racing/slow_motion.ahk
; Viewer Merusuh — Efek: Slow Motion
; BeamNG.drive: toggle timescale via console command
; Game lain: bisa override dengan keypress custom jika ada hotkey slow-mo

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
; BeamNG: F9 = slow motion toggle (jika hotkey aktif)
; Sesuaikan dengan game kamu
SLOWMO_KEY := "F9"
duration   := VM_GetDuration(5000)
; ─────────────────────────────────────────────────────

VM_Log("slow_motion START — duration: " duration "ms")

Send("{" SLOWMO_KEY "}")    ; aktifkan slow-mo
Sleep(duration)
Send("{" SLOWMO_KEY "}")    ; matikan slow-mo

VM_Log("slow_motion DONE")
