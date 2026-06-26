; games/racing/random_steer.ahk — Steer chaos kiri/kanan
; Params: duration_ms (default 4000), interval_ms (default 300)

#Requires AutoHotkey v2.0
#Include %A_ScriptDir%\..\..\lib\params.ahk

params      := VM_GetParams()
duration_ms := VM_GetDuration(params, 4000)
interval_ms := VM_GetInt(params, "interval_ms", 300)

startTime := A_TickCount
keys := ["a", "d"]   ; kiri, kanan
idx  := 1

while (A_TickCount - startTime < duration_ms) {
    key := keys[idx]
    Send "{" key " down}"
    Sleep interval_ms
    Send "{" key " up}"
    idx := (idx = 1) ? 2 : 1   ; toggle
    Sleep 50
}
