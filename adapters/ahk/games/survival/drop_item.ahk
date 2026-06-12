; adapters/ahk/games/survival/drop_item.ahk
; Viewer Merusuh — Efek: Drop Item
; Buka inventory lalu tekan drop item
; Default key: G (drop) — sesuaikan per game

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
; Minecraft : Q = drop item yang dipegang
; DayZ      : Tab (buka inv) lalu drag
; Rust      : G = drop item
DROP_KEY := "g"
COUNT    := 5    ; berapa kali drop
; ─────────────────────────────────────────────────────

VM_Log("drop_item START — count: " COUNT)

VM_SpamKey(DROP_KEY, COUNT, 300)

VM_Log("drop_item DONE")
