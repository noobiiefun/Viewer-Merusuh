; adapters/ahk/games/action/chaos_mode.ahk
; Viewer Merusuh — Efek: CHAOS MODE 💀
; Semua efek dijalankan sekaligus: wanted level max + ledakan + klakson + ragdoll
; Untuk donasi nominal tertinggi

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
CHAT_KEY    := "t"
HORN_KEY    := "e"
JUMP_KEY    := "Space"
duration    := VM_GetDuration(15000)
; ─────────────────────────────────────────────────────

VM_Log("CHAOS MODE START — duration: " duration "ms")

; ── Fase 1: Naikin wanted level ke max (6 bintang) ──
loop 6 {
    Send("{" CHAT_KEY "}")
    Sleep(250)
    VM_TypeCheat("FUGITIVE")
    Sleep(80)
    Send("{Enter}")
    Sleep(600)
}

; ── Fase 2: Ledakan ──
loop 3 {
    Send("{" CHAT_KEY "}")
    Sleep(250)
    VM_TypeCheat("HIGHEX")
    Sleep(80)
    Send("{Enter}")
    Sleep(800)
}

; ── Fase 3: Spam klakson selama sisa durasi ──
elapsed   := A_TickCount
remaining := duration - 8000   ; estimasi waktu yang sudah habis di fase 1+2
if (remaining < 2000)
    remaining := 2000

startSpam := A_TickCount
while (A_TickCount - startSpam < remaining) {
    Send("{" HORN_KEY " down}")
    Sleep(80)
    Send("{" HORN_KEY " up}")
    Sleep(120)

    ; Sesekali gerak mouse chaos
    if (Mod(A_Index, 10) = 0)
        VM_MouseMove(Random(-100, 100), Random(-50, 50))
}

VM_Log("CHAOS MODE DONE")
