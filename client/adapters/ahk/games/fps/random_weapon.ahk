; games/fps/random_weapon.ahk — Ganti senjata acak (tekan angka 1-9)
; Params: duration_ms (default 3000), count (default 5)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params := VM_GetParams()
count  := VM_GetInt(params, "count", 5)

Loop count {
    slot := Random(1, 9)
    Send "{" slot "}"
    Sleep 400
}
