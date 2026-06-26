; games/racing/brake_force.ahk — Rem mendadak
; Params: duration_ms (default 3000)
;
; Menahan tombol brake (Space) selama duration_ms

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 3000)

Send "{Space down}"
Sleep duration_ms
Send "{Space up}"
