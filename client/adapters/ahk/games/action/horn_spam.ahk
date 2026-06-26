; games/action/horn_spam.ahk — Spam klakson (GTA 5: tombol E saat di kendaraan)
; Params: duration_ms (default 5000), interval_ms (default 200), key (default "e")

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 5000)
interval_ms := VM_GetInt(params, "interval_ms", 200)
key         := params.Has("key") ? params["key"] : "e"

startTime := A_TickCount
while (A_TickCount - startTime < duration_ms) {
    Send "{" key "}"
    Sleep interval_ms
}
