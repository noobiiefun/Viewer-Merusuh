; adapters/ahk/lib/VM_Lib.ahk
; Viewer Merusuh — Shared Library (AutoHotkey v2)
; Di-include oleh semua script game. Berisi helper umum.

; ─────────────────────────────────────────────────────
; Ambil durasi dari argumen CLI (A_Args[1]), default ke fallback
; ─────────────────────────────────────────────────────
VM_GetDuration(fallbackMs := 3000) {
    if A_Args.Length >= 1 && IsInteger(A_Args[1])
        return Integer(A_Args[1])
    return fallbackMs
}

; ─────────────────────────────────────────────────────
; Hold satu key selama durationMs milidetik lalu lepas
; ─────────────────────────────────────────────────────
VM_HoldKey(key, durationMs) {
    Send("{" key " down}")
    Sleep(durationMs)
    Send("{" key " up}")
}

; ─────────────────────────────────────────────────────
; Tekan key sebanyak N kali dengan jeda intervalMs
; ─────────────────────────────────────────────────────
VM_SpamKey(key, count, intervalMs := 100) {
    loop count {
        Send("{" key "}")
        Sleep(intervalMs)
    }
}

; ─────────────────────────────────────────────────────
; Klik mouse: "Left" / "Right" / "Middle"
; ─────────────────────────────────────────────────────
VM_Click(button := "Left") {
    Click(button)
}

; ─────────────────────────────────────────────────────
; Geser mouse relatif dari posisi sekarang
; ─────────────────────────────────────────────────────
VM_MouseMove(dx, dy, speed := 2) {
    MouseMove(dx, dy, speed, "R")
}

; ─────────────────────────────────────────────────────
; Kirim cheat string karakter per karakter (untuk GTA dll)
; ─────────────────────────────────────────────────────
VM_TypeCheat(cheatStr, delayMs := 30) {
    loop StrLen(cheatStr) {
        Send("{" SubStr(cheatStr, A_Index, 1) "}")
        Sleep(delayMs)
    }
}

; ─────────────────────────────────────────────────────
; Log ke stdout (tampil di console Node.js jika di-pipe)
; ─────────────────────────────────────────────────────
VM_Log(msg) {
    FileAppend("[VM] " msg "`n", "*")
}
