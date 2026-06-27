; screenshot.ahk — Viewer Merusuh
; Efek: Ambil screenshot (PrintScreen atau tombol kustom)

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { key: "PrintScreen", count: 1, interval_ms: 500 }

if A_Args.Length > 0 {
    raw := A_Args[1]
    if RegExMatch(raw, '"key"\s*:\s*"([^"]+)"', &m)
        params.key := m[1]
    if RegExMatch(raw, '"count"\s*:\s*(\d+)', &m)
        params.count := Integer(m[1])
    if RegExMatch(raw, '"interval_ms"\s*:\s*(\d+)', &m)
        params.interval_ms := Integer(m[1])
}

Loop params.count {
    Send("{" params.key "}")
    if A_Index < params.count
        Sleep(params.interval_ms)
}
