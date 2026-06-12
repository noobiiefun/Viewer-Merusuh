; adapters/ahk/games/racing/handbrake.ahk
; Viewer Merusuh — Efek: Handbrake / Rem Tangan
; Kompatibel: BeamNG.drive, NFS, GTA 5
;
; Handbrake biasanya key berbeda dari rem biasa.
; Default: X (BeamNG), tapi bisa diubah.

#Requires AutoHotkey v2.0
#Include "../../lib/VM_Lib.ahk"

; ── Konfigurasi ──────────────────────────────────────
HANDBRAKE_KEY := "x"      ; BeamNG default — ganti sesuai game
duration      := VM_GetDuration(2000)
; ─────────────────────────────────────────────────────

VM_Log("handbrake START — duration: " duration "ms")

VM_HoldKey(HANDBRAKE_KEY, duration)

VM_Log("handbrake DONE")
