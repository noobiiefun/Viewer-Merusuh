; games/fps/invert_mouse.ahk — Kamera chaos (gerakan mouse acak)
; Params: duration_ms (default 3000), intensity (default 200, dalam pixel)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 3000)
intensity   := VM_GetInt(params, "intensity", 200)

startTime := A_TickCount
while (A_TickCount - startTime < duration_ms) {
    ; Gerak mouse acak
    dx := Random(-intensity, intensity)
    dy := Random(-intensity, intensity)
    MouseMove dx, dy, 0, "R"   ; relative move, speed 0 = instant
    Sleep 80
}
