; games/racing/full_throttle.ahk — Gas penuh paksa
; Params: duration_ms (default 3000)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 3000)

Send "{w down}"
Sleep duration_ms
Send "{w up}"
