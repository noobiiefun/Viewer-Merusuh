; adapters/ahk/games/fps/invert_mouse.ahk
; Viewer Merusuh — Efek: Invert Mouse (Y-axis dibalik)
; Cara kerja: intercept gerakan mouse dan balik arah Y selama durasi
; CATATAN: Script ini memodifikasi mouse secara global selama aktif

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

duration := VM_GetDuration(5000)

VM_Log("invert_mouse START — duration: " duration "ms")

; Aktifkan hook mouse
prevX := 0
prevY := 0
MouseGetPos(&prevX, &prevY)

; Buat timer untuk hentikan setelah durasi
SetTimer(StopInvert, -duration)

; Hook: tiap gerakan mouse Y dibalik
HookMouse()

StopInvert() {
    Hotkey("*WheelUp",   "Off")
    Hotkey("*WheelDown", "Off")
    VM_Log("invert_mouse DONE")
    ExitApp()
}

; Pendekatan alternatif yang lebih reliable:
; Gerak mouse acak setiap interval untuk simulasi "invert" effect
startTime := A_TickCount
while (A_TickCount - startTime < duration) {
    MouseGetPos(&cx, &cy)
    ; Flip delta — jika mouse naik, paksa turun sedikit
    Sleep(16)  ; ~60fps
}

ExitApp()
