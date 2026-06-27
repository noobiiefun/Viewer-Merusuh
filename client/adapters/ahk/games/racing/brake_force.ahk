; brake_force.ahk — Viewer Merusuh
; Efek: Tekan rem mendadak di game racing
; Cocok untuk: BeamNG, Assetto Corsa, CarX, dll (keyboard mode)

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { duration_ms: 3000 }

if A_Args.Length > 0 {
    raw := A_Args[1]
    if RegExMatch(raw, '"duration_ms"\s*:\s*(\d+)', &m)
        params.duration_ms := Integer(m[1])
}

; S = rem di banyak game racing (default WASD)
Send("{s down}")
Sleep(params.duration_ms)
Send("{s up}")
