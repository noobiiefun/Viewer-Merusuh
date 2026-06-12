; adapters/ahk/games/action/super_jump.ahk
; Viewer Merusuh — Efek: Super Jump (GTA 5)
; Cheat HOPTOIT = super jump selama beberapa detik

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

CHAT_KEY    := "t"
CHEAT_STR   := "HOPTOIT"
duration    := VM_GetDuration(8000)

VM_Log("super_jump START — duration: " duration "ms")

; Aktifkan cheat
Send("{" CHAT_KEY "}")
Sleep(300)
VM_TypeCheat(CHEAT_STR)
Sleep(100)
Send("{Enter}")
Sleep(duration)

; Nonaktifkan dengan cheat yang sama (toggle)
Send("{" CHAT_KEY "}")
Sleep(300)
VM_TypeCheat(CHEAT_STR)
Sleep(100)
Send("{Enter}")

VM_Log("super_jump DONE")
