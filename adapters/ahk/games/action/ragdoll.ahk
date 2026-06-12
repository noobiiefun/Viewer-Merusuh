; adapters/ahk/games/action/ragdoll.ahk
; Viewer Merusuh — Efek: Ragdoll / Jatuh
; GTA 5: karakter jatuh ragdoll jika kena ledakan / tak terduga
; Trick: paksa karakter loncat + crouch bersamaan → ragdoll
; Alternatif: cheat "PAINKILLER" (invincible) lalu langsung off

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
JUMP_KEY   := "Space"
CROUCH_KEY := "LCtrl"      ; Crouch di GTA 5 PC
duration   := VM_GetDuration(2000)
; ─────────────────────────────────────────────────────

VM_Log("ragdoll START")

; Loncat + langsung crouch → trigger stumble/ragdoll di banyak game
Send("{" JUMP_KEY "}")
Sleep(100)
VM_HoldKey(CROUCH_KEY, 800)
Sleep(200)

; Gerak mouse acak untuk tambah chaos
VM_MouseMove(Random(-200, 200), Random(-200, 200))

VM_Log("ragdoll DONE")
