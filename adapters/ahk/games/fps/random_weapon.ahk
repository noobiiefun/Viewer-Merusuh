; adapters/ahk/games/fps/random_weapon.ahk
; Viewer Merusuh — Efek: Ganti Senjata Acak
; Cara: scroll wheel / tekan angka 1-9 secara acak

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

duration := VM_GetDuration(4000)

VM_Log("random_weapon START")

startTime := A_TickCount
while (A_TickCount - startTime < duration) {
    ; Tekan angka acak 1-9 (slot senjata)
    slot := Random(1, 9)
    Send("{" slot "}")
    Sleep(Random(200, 600))
}

VM_Log("random_weapon DONE")
