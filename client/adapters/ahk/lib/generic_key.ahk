; generic_key.ahk — Viewer Merusuh fallback script
; Dipanggil saat tidak ada script spesifik untuk action yang diterima.
; Argument 1 (opsional): JSON params dari server
;   Contoh params: {"key":"Space","duration_ms":200}

#Requires AutoHotkey v2.0
#SingleInstance Force

params := { key: "Space", duration_ms: 200 }

; Parse JSON argument jika ada
if A_Args.Length > 0 {
    raw := A_Args[1]
    ; Ekstrak "key" dan "duration_ms" dari JSON sederhana
    if RegExMatch(raw, '"key"\s*:\s*"([^"]+)"', &m)
        params.key := m[1]
    if RegExMatch(raw, '"duration_ms"\s*:\s*(\d+)', &m)
        params.duration_ms := Integer(m[1])
}

; Tekan key selama durasi
Send("{" params.key " down}")
Sleep(params.duration_ms)
Send("{" params.key " up}")
