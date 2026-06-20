; adapters/ahk/lib/generic_combo.ahk
; Viewer Merusuh — Generic Key Combo
; Arg 1: modifier (LCtrl, LShift, LAlt, LWin — atau kosong)
; Arg 2: key utama
; Arg 3: repeat (default 1)
; Arg 4: interval ms (default 200)
;
; Contoh: generic_combo.ahk LCtrl z 3 200 → Ctrl+Z 3x

#Requires AutoHotkey v2.0
#Include "VM_Lib.ahk"

MODIFIER := A_Args.Length >= 1 ? A_Args[1] : ""
KEY      := A_Args.Length >= 2 ? A_Args[2] : "g"
REPEAT   := A_Args.Length >= 3 ? Integer(A_Args[3]) : 1
INTERVAL := A_Args.Length >= 4 ? Integer(A_Args[4]) : 200

VM_Log("generic_combo: mod=" MODIFIER " key=" KEY " repeat=" REPEAT)

loop REPEAT {
    if (MODIFIER != "") {
        Send("{" MODIFIER " down}{" KEY "}{" MODIFIER " up}")
    } else {
        Send("{" KEY "}")
    }
    if (REPEAT > 1)
        Sleep(INTERVAL)
}

VM_Log("generic_combo DONE")
