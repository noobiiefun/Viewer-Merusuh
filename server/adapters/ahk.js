// server/adapters/ahk.js
// Bridge antara effectEngine dan AutoHotkey scripts
// Cara kerja:
//   effectEngine emit 'effect' → ahkAdapter cari script AHK yang sesuai → spawn proses AHK

const { spawn } = require('child_process')
const path      = require('path')
const fs        = require('fs')
const eventBus  = require('../core/eventBus')

const AHK_ROOT   = path.join(__dirname, '../../adapters/ahk')
const AHK_EXE    = process.env.AHK_EXE_PATH || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe'
const IS_WINDOWS = process.platform === 'win32'

// ──────────────────────────────────────────────
// Registry: action_key → file script AHK
// Format: 'action_key': 'grup/game/namafile.ahk'
//
// action_key didefinisikan di tabel effects (DB).
// Tambahkan entry baru setiap ada script baru.
// ──────────────────────────────────────────────
const ACTION_REGISTRY = {
  // ── RACING (generic, semua game balapan) ──
  'brake_force':       'games/racing/brake_force.ahk',
  'handbrake':         'games/racing/handbrake.ahk',
  'full_throttle':     'games/racing/full_throttle.ahk',
  'flip_car':          'games/racing/flip_car.ahk',
  'slow_motion':       'games/racing/slow_motion.ahk',

  // ── ACTION / OPEN WORLD (GTA 5, dll) ──
  'horn_spam':         'games/action/horn_spam.ahk',
  'explosion_rain':    'games/action/explosion_rain.ahk',
  'wanted_level_up':   'games/action/wanted_level_up.ahk',
  'ragdoll':           'games/action/ragdoll.ahk',
  'super_jump':        'games/action/super_jump.ahk',
  'chaos_mode':        'games/action/chaos_mode.ahk',

  // ── FPS ──
  'no_ammo':           'games/fps/no_ammo.ahk',
  'invert_mouse':      'games/fps/invert_mouse.ahk',
  'random_weapon':     'games/fps/random_weapon.ahk',

  // ── SURVIVAL ──
  'drop_item':         'games/survival/drop_item.ahk',
  'camera_shake':      'games/survival/camera_shake.ahk',

  // ── GLOBAL (semua game) ──
  'alt_tab_fake':      'lib/global/alt_tab_fake.ahk',
  'volume_mute':       'lib/global/volume_mute.ahk',
  'screen_flip':       'lib/global/screen_flip.ahk',
}

// ──────────────────────────────────────────────
// Jalankan satu script AHK dengan parameter
// ──────────────────────────────────────────────
function runScript(scriptRelPath, params = {}) {
  const scriptPath = path.join(AHK_ROOT, scriptRelPath)

  if (!fs.existsSync(scriptPath)) {
    console.warn(`⚠️  [AHK] Script tidak ditemukan: ${scriptPath}`)
    return null
  }

  if (!IS_WINDOWS) {
    // Non-Windows: simulasi saja (dev/test di Linux/Mac)
    console.log(`[AHK-SIM] Menjalankan: ${scriptRelPath}`, params)
    return null
  }

  if (!fs.existsSync(AHK_EXE)) {
    console.warn(`⚠️  [AHK] AutoHotkey tidak ditemukan di: ${AHK_EXE}`)
    console.warn('     Set AHK_EXE_PATH di .env jika path berbeda')
    return null
  }

  // Kirim params sebagai argumen CLI ke AHK (bisa dibaca via A_Args[1], A_Args[2], dll)
  const args = [scriptPath]
  if (params.duration_ms) args.push(String(params.duration_ms))
  if (params.extra)       args.push(String(params.extra))

  const proc = spawn(AHK_EXE, args, { detached: true, stdio: 'ignore' })
  proc.unref()

  console.log(`🟢 [AHK] Spawn: ${scriptRelPath} (PID ${proc.pid || '?'})`)
  return proc
}

// ──────────────────────────────────────────────
// Handler utama: terima event 'effect' dari effectEngine
// ──────────────────────────────────────────────
eventBus.on('effect', ({ effect, donation }) => {
  if (effect.adapter !== 'ahk') return // bukan urusan adapter ini

  const scriptRel = ACTION_REGISTRY[effect.action_key]

  if (!scriptRel) {
    console.warn(`⚠️  [AHK] action_key tidak terdaftar: "${effect.action_key}"`)
    console.warn('     Tambahkan entry ke ACTION_REGISTRY di server/adapters/ahk.js')
    return
  }

  console.log(`🎮 [AHK] Trigger "${effect.name}" → ${scriptRel}`)
  runScript(scriptRel, {
    duration_ms: effect.duration_ms,
    amount:      donation.amount,
    donator:     donation.donatorName,
  })
})

console.log('⚙️  AHK Adapter aktif')

module.exports = { runScript, ACTION_REGISTRY }
