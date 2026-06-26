; games/racing/slow_motion.ahk — Slow motion (BeamNG F9 toggle)
; Params: duration_ms (default 5000), toggle_key (default "F9")
; Tekan toggle → tunggu → tekan toggle lagi untuk mematikan

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 5000)
key         := params.Has("toggle_key") ? params["toggle_key"] : "F9"

Send "{" key "}"     ; aktifkan slow motion
Sleep duration_ms
Send "{" key "}"     ; matikan slow motion
