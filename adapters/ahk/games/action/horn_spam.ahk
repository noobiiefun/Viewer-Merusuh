; adapters/ahk/games/action/horn_spam.ahk
; Viewer Merusuh — Efek: Spam Klakson
; GTA 5: E = klakson saat di kendaraan
; Berlaku juga di game lain yang punya fungsi klakson di tombol E

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
HORN_KEY    := "e"
duration    := VM_GetDuration(5000)
INTERVAL_MS := 150         ; jeda antar klakson (ms)
; ─────────────────────────────────────────────────────

VM_Log("horn_spam START — duration: " duration "ms")

startTime := A_TickCount
while (A_TickCount - startTime < duration) {
    Send("{" HORN_KEY " down}")
    Sleep(80)
    Send("{" HORN_KEY " up}")
    Sleep(INTERVAL_MS)
}

VM_Log("horn_spam DONE")
