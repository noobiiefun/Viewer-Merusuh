; adapters/ahk/games/survival/camera_shake.ahk
; Viewer Merusuh — Efek: Camera Shake (gerak mouse acak cepat)
; Berlaku di semua game FPS/TPS yang mouse-look
; Simulasi kamera goyang dengan gerakan mouse chaos

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
duration  := VM_GetDuration(3000)
INTENSITY := 80    ; pixel per gerakan (makin besar makin chaos)
; ─────────────────────────────────────────────────────

VM_Log("camera_shake START — duration: " duration "ms, intensity: " INTENSITY)

startTime := A_TickCount
while (A_TickCount - startTime < duration) {
    dx := Random(-INTENSITY, INTENSITY)
    dy := Random(-INTENSITY, INTENSITY)
    MouseMove(dx, dy, 0, "R")
    Sleep(Random(30, 80))
}

VM_Log("camera_shake DONE")
