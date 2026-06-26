; games/racing/flip_car.ahk — Balik mobil (BeamNG / GTA)
; Params: duration_ms (default 1500), key (default "r")
; Di BeamNG: R = recover/flip vehicle

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 1500)
key         := params.Has("key") ? params["key"] : "r"

Send "{" key " down}"
Sleep duration_ms
Send "{" key " up}"
