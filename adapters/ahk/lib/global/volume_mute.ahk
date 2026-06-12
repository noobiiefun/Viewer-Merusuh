; adapters/ahk/lib/global/volume_mute.ahk
; Viewer Merusuh — Efek: Mute Volume Sesaat
; Works di semua game / Windows

#Requires AutoHotkey v2.0
#Include "../../VM_Lib.ahk"

duration := VM_GetDuration(4000)

VM_Log("volume_mute START — duration: " duration "ms")

Send("{Volume_Mute}")   ; mute
Sleep(duration)
Send("{Volume_Mute}")   ; unmute

VM_Log("volume_mute DONE")
