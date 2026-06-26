; games/action/ragdoll.ahk — Karakter jatuh ragdoll (jump + crouch)
; Params: duration_ms (default 2000)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 2000)

; Lompat lalu langsung crouch = ragdoll di GTA 5
Send "{Space}"
Sleep 100
Send "{LCtrl down}"
Sleep duration_ms
Send "{LCtrl up}"
