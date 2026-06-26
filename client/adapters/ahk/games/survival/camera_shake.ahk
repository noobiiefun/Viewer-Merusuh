; games/survival/camera_shake.ahk — Kamera goyang (mouse chaos ringan)
; Params: duration_ms (default 4000), intensity (default 80)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 4000)
intensity   := VM_GetInt(params, "intensity", 80)

startTime := A_TickCount
dir := 1
while (A_TickCount - startTime < duration_ms) {
    dx := Random(intensity * dir - 20, intensity * dir + 20)
    dy := Random(-30, 30)
    MouseMove dx, dy, 2, "R"
    dir := -dir
    Sleep 100
}
