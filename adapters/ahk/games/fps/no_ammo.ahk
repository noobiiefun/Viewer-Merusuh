; adapters/ahk/games/fps/no_ammo.ahk
; Viewer Merusuh — Efek: No Ammo / Paksa Reload Terus
; Cara: spam tombol reload (R) sehingga karakter terus-menerus reload

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
RELOAD_KEY := "r"
duration   := VM_GetDuration(5000)
; ─────────────────────────────────────────────────────

VM_Log("no_ammo START — duration: " duration "ms")

startTime := A_TickCount
while (A_TickCount - startTime < duration) {
    Send("{" RELOAD_KEY "}")
    Sleep(300)
}

VM_Log("no_ammo DONE")
