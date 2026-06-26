; games/action/super_jump.ahk — Super jump (GTA 5: HOPTOIT)
; Params: repeats (default 1)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params  := VM_GetParams()
repeats := VM_GetInt(params, "repeats", 1)

cheat := "HOPTOIT"

Loop repeats {
    Loop Parse, cheat {
        Send "{" A_LoopField "}"
        Sleep 30
    }
    Send "{Enter}"
    Sleep 500
}
