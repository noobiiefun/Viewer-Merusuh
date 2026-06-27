; invert_mouse.ahk — Viewer Merusuh
; Efek: Inversi gerakan mouse selama durasi (FPS game)

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { duration_ms: 5000 }

if A_Args.Length > 0 {
    raw := A_Args[1]
    if RegExMatch(raw, '"duration_ms"\s*:\s*(\d+)', &m)
        params.duration_ms := Integer(m[1])
}

; Hook mouse movement dan inversi
DllCall("BlockInput", "UInt", 0)  ; pastikan input tidak diblock

endTime := A_TickCount + params.duration_ms
prevX   := 0
prevY   := 0

; Gunakan timer untuk inversi (simplified: gerak mouse ke arah berlawanan)
SetTimer(InvertLoop, 10)

InvertLoop() {
    global endTime, prevX, prevY
    if A_TickCount > endTime {
        SetTimer(InvertLoop, 0)
        return
    }
    MouseGetPos(&cx, &cy)
    dx := cx - prevX
    dy := cy - prevY
    if (Abs(dx) > 2 || Abs(dy) > 2) {
        ; Inversi: gerak balik 2x amplitudo
        MouseMove(cx - dx*2, cy - dy*2, 0)
    }
    prevX := cx
    prevY := cy
}

Sleep(params.duration_ms + 100)
SetTimer(InvertLoop, 0)
