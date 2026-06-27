; random_keys.ahk — Viewer Merusuh
; Efek: Tekan tombol random selama durasi (chaos mode)

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { duration_ms: 3000, interval_ms: 150 }

if A_Args.Length > 0 {
    raw := A_Args[1]
    if RegExMatch(raw, '"duration_ms"\s*:\s*(\d+)', &m)
        params.duration_ms := Integer(m[1])
    if RegExMatch(raw, '"interval_ms"\s*:\s*(\d+)', &m)
        params.interval_ms := Integer(m[1])
}

keys := ["w","a","s","d","Space","e","r","f","q"]
endTime := A_TickCount + params.duration_ms

while A_TickCount < endTime {
    k := keys[Random(1, keys.Length)]
    Send("{" k " down}")
    Sleep(params.interval_ms)
    Send("{" k " up}")
    Sleep(50)
}
