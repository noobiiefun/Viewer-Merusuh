; games/action/chaos_mode.ahk — CHAOS MODE: semua efek sekaligus
; Params: duration_ms (default 15000)
; Combine: wanted level, super jump, explosion, steer chaos

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 15000)

; Helper: ketik cheat GTA 5
TypeCheat(cheat) {
    Loop Parse, cheat {
        Send "{" A_LoopField "}"
        Sleep 30
    }
    Send "{Enter}"
    Sleep 800
}

; ── Cheat burst ──────────────────────────────
TypeCheat("FUGITIVE")   ; wanted level up
Sleep 300
TypeCheat("HOPTOIT")    ; super jump
Sleep 300
TypeCheat("HIGHEX")     ; ledakan

; ── Chaos steer selama sisa durasi ───────────
elapsed := 3000         ; estimasi waktu cheat di atas
remaining := duration_ms - elapsed
if remaining > 0 {
    startTime := A_TickCount
    keys := ["a", "d"]
    idx  := 1
    while (A_TickCount - startTime < remaining) {
        key := keys[idx]
        Send "{" key " down}"
        Sleep 250
        Send "{" key " up}"
        idx := (idx = 1) ? 2 : 1
        Sleep 50
    }
}
