; games/fps/no_ammo.ahk — Paksa reload terus (spam R)
; Params: duration_ms (default 4000), interval_ms (default 300), key (default "r")

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 4000)
interval_ms := VM_GetInt(params, "interval_ms", 300)
key         := params.Has("key") ? params["key"] : "r"

startTime := A_TickCount
while (A_TickCount - startTime < duration_ms) {
    Send "{" key "}"
    Sleep interval_ms
}
