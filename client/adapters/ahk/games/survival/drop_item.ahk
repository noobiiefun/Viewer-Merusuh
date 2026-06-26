; games/survival/drop_item.ahk — Drop item berulang
; Params: duration_ms (default 3000), interval_ms (default 500), key (default "g")

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 3000)
interval_ms := VM_GetInt(params, "interval_ms", 500)
key         := params.Has("key") ? params["key"] : "g"

startTime := A_TickCount
while (A_TickCount - startTime < duration_ms) {
    Send "{" key "}"
    Sleep interval_ms
}
