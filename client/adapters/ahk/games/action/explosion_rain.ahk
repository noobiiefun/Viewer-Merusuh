; games/action/explosion_rain.ahk — Hujan bom via cheat GTA 5 (HIGHEX)
; Params: duration_ms (default 8000), repeats (default 3)
; Ketik cheat HIGHEX di GTA 5 (keyboard cheat)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params   := VM_GetParams()
repeats  := VM_GetInt(params, "repeats", 3)
delay_ms := VM_GetInt(params, "delay_ms", 2500)

cheat := "HIGHEX"

Loop repeats {
    ; Ketik cheat
    Loop Parse, cheat {
        Send "{" A_LoopField "}"
        Sleep 30
    }
    Send "{Enter}"
    Sleep delay_ms
}
