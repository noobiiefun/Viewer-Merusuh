; lib/params.ahk — Helper untuk parse params dari Viewer Merusuh
; Include di script AHK manapun: #Include %A_ScriptDir%\..\lib\params.ahk
;
; Penggunaan:
;   params := VM_GetParams()
;   duration := params.Has("duration_ms") ? params["duration_ms"] : 3000

#Requires AutoHotkey v2.0

/**
 * VM_GetParams() — Parse JSON params dari A_Args[1]
 * Return: Map object dengan key/value dari params
 */
VM_GetParams() {
    params := Map()
    if A_Args.Length < 1
        return params

    raw := A_Args[1]
    ; Unescape double-quotes (CLI mungkin kirim ""{...}"")
    raw := StrReplace(raw, '""', '"')

    ; Parse JSON sederhana (hanya flat key:value)
    raw := RegExReplace(raw, "^\s*\{|\}\s*$")   ; hapus { }
    Loop Parse, raw, ","  {
        item := Trim(A_LoopField)
        if !item
            continue
        colonPos := InStr(item, ":")
        if !colonPos
            continue
        key := Trim(SubStr(item, 1, colonPos - 1))
        val := Trim(SubStr(item, colonPos + 1))
        ; Hapus tanda kutip dari key dan value
        key := RegExReplace(key, '^"|"$')
        val := RegExReplace(val, '^"|"$')
        ; Konversi angka
        if val is Number
            val := val + 0
        params[key] := val
    }
    return params
}

/**
 * VM_GetDuration(params, default_ms) — Ambil duration_ms dari params
 */
VM_GetDuration(params, default_ms := 3000) {
    if params.Has("duration_ms")
        return params["duration_ms"]
    return default_ms
}

/**
 * VM_GetInt(params, key, default_val) — Ambil integer param dengan default
 */
VM_GetInt(params, key, default_val := 0) {
    if params.Has(key)
        return Integer(params[key])
    return default_val
}
