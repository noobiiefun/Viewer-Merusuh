; horn_spam.ahk — Viewer Merusuh
; Efek: Spam klakson (H di banyak game)

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { count: 10, interval_ms: 150 }

if A_Args.Length > 0 {
    raw := A_Args[1]
    if RegExMatch(raw, '"count"\s*:\s*(\d+)', &m)
        params.count := Integer(m[1])
    if RegExMatch(raw, '"interval_ms"\s*:\s*(\d+)', &m)
        params.interval_ms := Integer(m[1])
}

Loop params.count {
    Send("{h down}")
    Sleep(params.interval_ms // 2)
    Send("{h up}")
    Sleep(params.interval_ms // 2)
}
