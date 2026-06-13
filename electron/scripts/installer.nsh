; electron/scripts/installer.nsh
; NSIS script untuk kustomisasi installer Viewer Merusuh
; Di-include oleh electron-builder secara otomatis

; ── Cek Node.js sebelum install ──────────────────────────────────────
!macro customInit
  ; Cek apakah Node.js sudah terinstall
  nsExec::ExecToOutput 'node --version' $0
  ${If} $0 != 0
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "Node.js tidak ditemukan di sistem kamu.$\n$\nViewer Merusuh membutuhkan Node.js v18 atau lebih baru.$\n$\nMau membuka halaman download Node.js sekarang?" \
      IDYES openNodeJS IDNO continueAnyway
    openNodeJS:
      ExecShell "open" "https://nodejs.org/en/download"
      MessageBox MB_OK "Setelah install Node.js, jalankan installer Viewer Merusuh lagi."
      Abort
    continueAnyway:
  ${EndIf}
!macroend

; ── Aksi setelah install selesai ─────────────────────────────────────
!macro customInstallMode
  ; Set mode install ke "per user" secara default (tidak butuh admin)
  !define MULTIUSER_INSTALLMODE_DEFAULT_CURRENTUSER
!macroend

!macro customUnInit
  ; Tidak ada aksi khusus saat uninstall dimulai
!macroend

!macro customWelcomePage
  ; Halaman welcome sudah ditangani electron-builder
!macroend
