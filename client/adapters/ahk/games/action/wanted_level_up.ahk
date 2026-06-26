; games/action/wanted_level_up.ahk — Naikkan wanted level (GTA 5: FUGITIVE)
; Params: repeats (default 3, max bintang), delay_ms (default 1500)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params   := VM_GetParams()
repeats  := VM_GetInt(params, "repeats", 3)
delay_ms := VM_GetInt(params, "delay_ms", 1500)

cheat := "FUGITIVE"

Loop repeats {
    Loop Parse, cheat {
        Send "{" A_LoopField "}"
        Sleep 30
    }
    Send "{Enter}"
    Sleep delay_ms
}
