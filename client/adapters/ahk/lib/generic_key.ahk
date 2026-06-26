; lib/generic_key.ahk — Fallback generic key press
; Dipakai jika action tidak punya script spesifik
; Params: key (string), presses (int), delay_ms (int), duration_ms (int)
;
; Contoh: kirim dari server dengan params: { key: "Space", presses: 1 }

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\params.ahk

params      := VM_GetParams()
key         := params.Has("key")       ? params["key"]        : "Space"
presses     := VM_GetInt(params, "presses", 1)
delay_ms    := VM_GetInt(params, "delay_ms", 50)
duration_ms := VM_GetDuration(params, 1000)

; Kirim key sebanyak presses kali
Loop presses {
    Send "{" key "}"
    if A_Index < presses
        Sleep delay_ms
}
