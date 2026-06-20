; adapters/ahk/lib/generic_key.ahk
; Viewer Merusuh — Generic Key Press
; Script universal yang menerima parameter dari server:
;   Arg 1: nama tombol (contoh: g, Space, Enter, F1, LCtrl, dll)
;   Arg 2: durasi hold dalam ms (0 = tap/press biasa)
;   Arg 3: jumlah repeat (default: 1)
;   Arg 4: interval antar repeat dalam ms (default: 200)
;
; Contoh pemanggilan dari server:
;   generic_key.ahk g 0 5 300     → tekan G 5x dengan jeda 300ms
;   generic_key.ahk Space 2000    → hold Space selama 2 detik
;   generic_key.ahk F1 0 1        → tap F1 sekali

#Requires AutoHotkey v2.0
#Include "VM_Lib.ahk"

; ── Baca argumen ─────────────────────────────────────────────────
KEY      := A_Args.Length >= 1 ? A_Args[1] : "g"
DURATION := A_Args.Length >= 2 ? Integer(A_Args[2]) : 0
REPEAT   := A_Args.Length >= 3 ? Integer(A_Args[3]) : 1
INTERVAL := A_Args.Length >= 4 ? Integer(A_Args[4]) : 200

VM_Log("generic_key: key=" KEY " duration=" DURATION " repeat=" REPEAT " interval=" INTERVAL)

if (DURATION > 0) {
    ; Mode HOLD — tahan tombol selama DURATION ms
    VM_HoldKey(KEY, DURATION)
} else {
    ; Mode TAP — tekan REPEAT kali dengan jeda INTERVAL ms
    VM_SpamKey(KEY, REPEAT, INTERVAL)
}

VM_Log("generic_key DONE")
