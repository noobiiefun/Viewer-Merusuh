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

; ── Install dependency tambahan: AutoHotkey v2 + ViGEmBus driver ─────
; File AutoHotkey_setup.exe dan ViGEmBusSetup_x64.exe harus sudah ada di
; electron/assets/redist/ (lihat PANDUAN_INSTALLER_DEPENDENCY.md) sebelum
; menjalankan build, supaya bisa diambil oleh perintah File di bawah.
!macro customInstall
  SetOutPath "$INSTDIR\redist"
  File "redist\AutoHotkey_setup.exe"
  File "redist\ViGEmBusSetup_x64.exe"

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "Viewer Merusuh butuh 2 komponen tambahan agar fitur kontrol game berjalan:$\n$\n\
    - AutoHotkey v2 (menjalankan script kontrol)$\n\
    - ViGEmBus driver (emulasi controller/vJoy)$\n$\n\
    Instal sekarang? (Windows akan minta konfirmasi admin terpisah untuk driver)" \
    IDYES installDeps IDNO skipDeps

  installDeps:
    DetailPrint "Menginstal AutoHotkey v2..."
    ExecWait '"$INSTDIR\redist\AutoHotkey_setup.exe" /S'

    DetailPrint "Menginstal ViGEmBus driver (butuh izin admin)..."
    ExecShell "runas" "$INSTDIR\redist\ViGEmBusSetup_x64.exe" "/quiet /norestart"
    Goto doneDeps

  skipDeps:
    DetailPrint "Dependency dilewati. Bisa diinstal manual nanti lewat menu Settings di aplikasi."

  doneDeps:
!macroend

!macro customUnInit
  ; Tidak ada aksi khusus saat uninstall dimulai
!macroend

!macro customWelcomePage
  ; Halaman welcome sudah ditangani electron-builder
!macroend
