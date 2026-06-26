; games/racing/handbrake.ahk — Rem tangan
; Params: duration_ms (default 2000)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 2000)

Send "{x down}"
Sleep duration_ms
Send "{x up}"
