; adapters/ahk/games/action/wanted_level_up.ahk
; Viewer Merusuh — Efek: Naikin Wanted Level (GTA 5)
; Cheat: FUGITIVE = tambah 1 bintang wanted
; Diulang beberapa kali sesuai konfigurasi

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
CHAT_KEY     := "t"
CHEAT_STRING := "FUGITIVE"   ; +1 wanted level di GTA 5
REPEAT_COUNT := 3             ; naik 3 bintang
; ─────────────────────────────────────────────────────

VM_Log("wanted_level_up START — repeat: " REPEAT_COUNT)

loop REPEAT_COUNT {
    Send("{" CHAT_KEY "}")
    Sleep(300)
    VM_TypeCheat(CHEAT_STRING)
    Sleep(100)
    Send("{Enter}")
    Sleep(700)
}

VM_Log("wanted_level_up DONE")
