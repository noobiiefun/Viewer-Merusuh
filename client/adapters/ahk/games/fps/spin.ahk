; spin.ahk — Viewer Merusuh
; Efek: Putar mouse 360° (spin karakter FPS)

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { rotations: 3, speed: 20 }

if A_Args.Length > 0 {
    raw := A_Args[1]
    if RegExMatch(raw, '"rotations"\s*:\s*(\d+)', &m)
        params.rotations := Integer(m[1])
    if RegExMatch(raw, '"speed"\s*:\s*(\d+)', &m)
        params.speed := Integer(m[1])
}

; Gerak mouse horizontal untuk spin
; step_x = total pixel per 360° (tergantung sensitivitas game, default 2000)
step := 2000 // 36

Loop params.rotations {
    Loop 36 {
        MouseMove(step, 0, 0, "R")
        Sleep(params.speed)
    }
}
