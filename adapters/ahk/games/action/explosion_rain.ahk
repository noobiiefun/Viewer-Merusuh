; adapters/ahk/games/action/explosion_rain.ahk
; Viewer Merusuh — Efek: Hujan Bom / Explosion Rain
; GTA 5 PC: ketik cheat "HIGHEX" via keyboard
;
; Cara kerja: buka console cheat (~ atau T), ketik cheat, Enter, tutup
; Script ini support dua mode:
;   MODE "chat"  → buka chat (T), ketik cheat (GTA 5 Story Mode)
;   MODE "tilde" → buka console (~) untuk game yang support console

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
; Ganti MODE sesuai game:
;   "chat"  → GTA 5 Story Mode (T untuk buka chat cheat)
;   "tilde" → Game yang punya console (misal: Source engine)
MODE         := "chat"
CHAT_KEY     := "t"        ; key buka chat / cheat di GTA 5
CHEAT_STRING := "HIGHEX"   ; cheat ledakan di GTA 5
REPEAT_COUNT := 3           ; berapa kali cheat diulang
; ─────────────────────────────────────────────────────

VM_Log("explosion_rain START — mode: " MODE)

loop REPEAT_COUNT {
    if (MODE = "chat") {
        Send("{" CHAT_KEY "}")
        Sleep(300)
        VM_TypeCheat(CHEAT_STRING)
        Sleep(100)
        Send("{Enter}")
        Sleep(800)
    } else {
        Send("{`~}")
        Sleep(300)
        VM_TypeCheat(CHEAT_STRING)
        Sleep(100)
        Send("{Enter}")
        Sleep(100)
        Send("{`~}")
        Sleep(800)
    }
}

VM_Log("explosion_rain DONE")
