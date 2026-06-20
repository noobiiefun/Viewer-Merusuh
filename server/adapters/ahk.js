// server/adapters/ahk.js
// Bridge antara effectEngine dan AutoHotkey scripts

const { spawn } = require('child_process')
const path      = require('path')
const fs        = require('fs')
const eventBus  = require('../core/eventBus')
const { getDB } = require('../db/database')

// ── Path ke folder AHK ──────────────────────────────────────────────
// Saat packaged di Electron: ada di resources/app/adapters/
// Saat dev: ada di project root/adapters/
const AHK_ROOT = (() => {
  const candidates = [
    process.env.ELECTRON
      ? path.join(process.resourcesPath, 'app', 'adapters', 'ahk')
      : null,
    path.join(__dirname, '../../adapters/ahk'),
    path.join(process.cwd(), 'adapters/ahk'),
  ].filter(Boolean)

  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return path.join(__dirname, '../../adapters/ahk')
})()

const IS_WINDOWS = process.platform === 'win32'

// ── Baca path AHK dari DB config ────────────────────────────────────
function getAhkExePath() {
  try {
    const db  = getDB()
    const row = db.prepare("SELECT value FROM config WHERE key = 'AHK_EXE_PATH'").get()
    if (row?.value && row.value !== '') return row.value
  } catch {}
  return process.env.AHK_EXE_PATH
    || 'C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe'
}

// ── Registry script yang sudah ada ─────────────────────────────────
const ACTION_REGISTRY = {
  // ── RACING ──────────────────────────────────────────────────────
  'brake_force':       'games/racing/brake_force.ahk',
  'handbrake':         'games/racing/handbrake.ahk',
  'full_throttle':     'games/racing/full_throttle.ahk',
  'flip_car':          'games/racing/flip_car.ahk',
  'slow_motion':       'games/racing/slow_motion.ahk',

  // ── ACTION / OPEN WORLD ─────────────────────────────────────────
  'horn_spam':         'games/action/horn_spam.ahk',
  'explosion_rain':    'games/action/explosion_rain.ahk',
  'wanted_level_up':   'games/action/wanted_level_up.ahk',
  'ragdoll':           'games/action/ragdoll.ahk',
  'super_jump':        'games/action/super_jump.ahk',
  'chaos_mode':        'games/action/chaos_mode.ahk',

  // ── FPS ─────────────────────────────────────────────────────────
  'no_ammo':           'games/fps/no_ammo.ahk',
  'invert_mouse':      'games/fps/invert_mouse.ahk',
  'random_weapon':     'games/fps/random_weapon.ahk',

  // ── SURVIVAL ────────────────────────────────────────────────────
  'drop_item':         'games/survival/drop_item.ahk',
  'camera_shake':      'games/survival/camera_shake.ahk',

  // ── GLOBAL ──────────────────────────────────────────────────────
  'volume_mute':       'lib/global/volume_mute.ahk',
}

// ── Baca custom key actions dari database ──────────────────────────
function getCustomKeyActions() {
  try {
    const db   = getDB()
    const rows = db.prepare("SELECT * FROM ahk_custom_keys WHERE is_active = 1").all()
    return rows || []
  } catch { return [] }
}

// ── Jalankan script AHK ────────────────────────────────────────────
function runScript(scriptRelPath, extraArgs = []) {
  const scriptPath = path.join(AHK_ROOT, scriptRelPath)

  if (!fs.existsSync(scriptPath)) {
    console.warn(`⚠️  [AHK] Script tidak ditemukan: ${scriptPath}`)
    return null
  }

  if (!IS_WINDOWS) {
    console.log(`[AHK-SIM] ${scriptRelPath}`, extraArgs)
    return null
  }

  const AHK_EXE = getAhkExePath()
  if (!fs.existsSync(AHK_EXE)) {
    console.warn(`⚠️  [AHK] AutoHotkey tidak ditemukan: ${AHK_EXE}`)
    return null
  }

  const args = [scriptPath, ...extraArgs.map(String)]
  const proc = spawn(AHK_EXE, args, { detached: true, stdio: 'ignore' })
  proc.unref()
  console.log(`🟢 [AHK] ${scriptRelPath} (${extraArgs.join(', ')})`)
  return proc
}

// ── Jalankan generic key (tombol keyboard custom) ──────────────────
function runGenericKey(customKey) {
  const genericScript = path.join(AHK_ROOT, 'lib/generic_key.ahk')
  if (!fs.existsSync(genericScript)) {
    console.warn('[AHK] generic_key.ahk tidak ditemukan')
    return
  }

  const args = [
    customKey.key,
    String(customKey.hold_ms || 0),
    String(customKey.repeat  || 1),
    String(customKey.interval_ms || 200),
  ]

  if (!IS_WINDOWS) {
    console.log(`[AHK-SIM] generic_key`, args)
    return
  }

  const AHK_EXE = getAhkExePath()
  if (!fs.existsSync(AHK_EXE)) return

  const proc = spawn(AHK_EXE, [genericScript, ...args], { detached: true, stdio: 'ignore' })
  proc.unref()
  console.log(`🟢 [AHK] Generic Key: ${customKey.key} hold=${customKey.hold_ms}ms repeat=${customKey.repeat}x`)
}

function runGenericCombo(customKey) {
  const comboScript = path.join(AHK_ROOT, 'lib/generic_combo.ahk')
  if (!fs.existsSync(comboScript)) return

  const args = [
    customKey.modifier || '',
    customKey.key,
    String(customKey.repeat || 1),
    String(customKey.interval_ms || 200),
  ]

  if (!IS_WINDOWS) {
    console.log(`[AHK-SIM] generic_combo`, args)
    return
  }

  const AHK_EXE = getAhkExePath()
  if (!fs.existsSync(AHK_EXE)) return

  const proc = spawn(AHK_EXE, [comboScript, ...args], { detached: true, stdio: 'ignore' })
  proc.unref()
  console.log(`🟢 [AHK] Generic Combo: ${customKey.modifier}+${customKey.key} repeat=${customKey.repeat}x`)
}

// ── Handler event ──────────────────────────────────────────────────
eventBus.on('effect', ({ effect, donation }) => {
  if (effect.adapter !== 'ahk') return

  const actionKey = effect.action_key

  // 1. Cek preset registry dulu
  if (ACTION_REGISTRY[actionKey]) {
    runScript(ACTION_REGISTRY[actionKey], [effect.duration_ms])
    return
  }

  // 2. Cek custom key dari database (format: custom_KEY_ID)
  if (actionKey.startsWith('custom_key_')) {
    const id = parseInt(actionKey.replace('custom_key_', ''))
    try {
      const db  = getDB()
      const row = db.prepare('SELECT * FROM ahk_custom_keys WHERE id = ?').get(id)
      if (row) {
        // Override duration dari efek jika ada
        const ck = { ...row, hold_ms: effect.duration_ms > 0 && row.mode === 'hold' ? effect.duration_ms : row.hold_ms }
        if (row.mode === 'combo') runGenericCombo(ck)
        else                     runGenericKey(ck)
        return
      }
    } catch {}
  }

  // 3. Fallback: anggap action_key adalah nama tombol langsung (misal: "g", "Space")
  if (actionKey && !actionKey.includes('/')) {
    runGenericKey({
      key:         actionKey,
      mode:        'tap',
      repeat:      1,
      interval_ms: 200,
      hold_ms:     effect.duration_ms,
    })
    return
  }

  console.warn(`⚠️  [AHK] action_key tidak dikenal: "${actionKey}"`)
})

console.log(`⚙️  AHK Adapter aktif | AHK_ROOT: ${AHK_ROOT}`)
module.exports = { runScript, runGenericKey, runGenericCombo, ACTION_REGISTRY, getAhkExePath }
