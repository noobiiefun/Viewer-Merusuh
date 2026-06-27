; flip_car.ahk — Viewer Merusuh
; Efek: Putar stir penuh ke kiri lalu kanan (bikin mobil oleng)

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { duration_ms: 2000 }

if A_Args.Length > 0 {
    raw := A_Args[1]
    if RegExMatch(raw, '"duration_ms"\s*:\s*(\d+)', &m)
        params.duration_ms := Integer(m[1])
}

half := params.duration_ms // 2

Send("{a down}")
Sleep(half)
Send("{a up}")
Sleep(50)
Send("{d down}")
Sleep(half)
Send("{d up}")
