// server/adapters/vjoy.js
// Virtual Gamepad Adapter menggunakan ViGEmBus + vigemclient
//
// PRASYARAT (Windows only):
//   1. Install ViGEmBus driver: https://github.com/nefarius/ViGEmBus/releases
//   2. npm install (vigemclient sudah di package.json)
//
// Cara kerja:
//   effectEngine emit 'effect' dengan adapter='vjoy'
//   → vjoyAdapter baca action_key → manipulasi axis/button virtual controller
//   → game baca input dari virtual controller seolah pakai controller sungguhan

const eventBus  = require('../core/eventBus')
const IS_WINDOWS = process.platform === 'win32'

// ── Lazy-load vigemclient (optional dep, hanya Windows) ────────────────
let ViGEmClient, X360Controller
let client     = null
let controller = null
let isReady    = false

async function initViGEm() {
  if (!IS_WINDOWS) {
    console.log('⚠️  [vJoy] ViGEmBus hanya support Windows — adapter berjalan di mode simulasi')
    isReady = true
    return true
  }

  try {
    const vigem  = require('vigemclient')
    ViGEmClient  = vigem.ViGEmClient
    X360Controller = vigem.X360Controller

    client = new ViGEmClient()
    client.connect()

    controller = client.createX360Controller()
    await controller.connect()

    isReady = true
    console.log('🎮 [vJoy] ViGEmBus terhubung — virtual Xbox 360 controller aktif')
    return true
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('⚠️  [vJoy] vigemclient tidak terinstall. Jalankan: npm install')
    } else if (err.message?.includes('ViGEmBus')) {
      console.warn('⚠️  [vJoy] ViGEmBus driver tidak ditemukan.')
      console.warn('     Download: https://github.com/nefarius/ViGEmBus/releases')
    } else {
      console.warn('⚠️  [vJoy] Gagal inisialisasi:', err.message)
    }
    console.warn('     vJoy adapter berjalan di mode simulasi (log only)')
    isReady = true  // tetap "ready" tapi tidak ada controller fisik
    return false
  }
}

// ── Helper: set axis dengan range normalisasi ──────────────────────────
// ViGEm axis: -32768 sampai 32767
// Input kita: -1.0 sampai 1.0 (lebih intuitif)
function toAxisValue(normalized) {
  return Math.round(Math.max(-1, Math.min(1, normalized)) * 32767)
}

// ── Helper: set trigger (0.0 - 1.0 → 0 - 255) ─────────────────────────
function toTriggerValue(normalized) {
  return Math.round(Math.max(0, Math.min(1, normalized)) * 255)
}

// ── Snapshot state controller sebelum efek (untuk restore) ────────────
function snapshotState() {
  if (!controller) return null
  return {
    leftStickX:  controller.report.leftStickX,
    leftStickY:  controller.report.leftStickY,
    rightStickX: controller.report.rightStickX,
    rightStickY: controller.report.rightStickY,
    leftTrigger: controller.report.leftTrigger,
    rightTrigger: controller.report.rightTrigger,
    buttons:     { ...controller.report },
  }
}

async function restoreState(snapshot) {
  if (!controller || !snapshot) return
  controller.report.leftStickX   = snapshot.leftStickX
  controller.report.leftStickY   = snapshot.leftStickY
  controller.report.rightStickX  = snapshot.rightStickX
  controller.report.rightStickY  = snapshot.rightStickY
  controller.report.leftTrigger  = snapshot.leftTrigger
  controller.report.rightTrigger = snapshot.rightTrigger
  await controller.update()
}

// ── Simulasi log untuk non-Windows / tanpa driver ─────────────────────
function simLog(action, params) {
  console.log(`[vJoy-SIM] ${action}`, JSON.stringify(params))
}

// ══════════════════════════════════════════════════════════════════════
// ACTION HANDLERS
// Tiap fungsi = satu efek yang bisa ditrigger via donasi
// ══════════════════════════════════════════════════════════════════════

// ── 1. FULL BRAKE ─────────────────────────────────────────────────────
// Tahan trigger kiri (rem) penuh selama durationMs
async function actionFullBrake(durationMs) {
  if (!controller) return simLog('full_brake', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Full brake ${durationMs}ms`)
  controller.report.leftTrigger = toTriggerValue(1.0)   // rem = trigger kiri
  await controller.update()
  await sleep(durationMs)
  await restoreState(snap)
}

// ── 2. FULL THROTTLE ──────────────────────────────────────────────────
// Tahan trigger kanan (gas) penuh selama durationMs
async function actionFullThrottle(durationMs) {
  if (!controller) return simLog('full_throttle', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Full throttle ${durationMs}ms`)
  controller.report.rightTrigger = toTriggerValue(1.0)  // gas = trigger kanan
  await controller.update()
  await sleep(durationMs)
  await restoreState(snap)
}

// ── 3. STEER LEFT ─────────────────────────────────────────────────────
// Paksa steer kiri penuh selama durationMs
async function actionSteerLeft(durationMs) {
  if (!controller) return simLog('steer_left', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Steer left ${durationMs}ms`)
  controller.report.leftStickX = toAxisValue(-1.0)
  await controller.update()
  await sleep(durationMs)
  await restoreState(snap)
}

// ── 4. STEER RIGHT ────────────────────────────────────────────────────
async function actionSteerRight(durationMs) {
  if (!controller) return simLog('steer_right', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Steer right ${durationMs}ms`)
  controller.report.leftStickX = toAxisValue(1.0)
  await controller.update()
  await sleep(durationMs)
  await restoreState(snap)
}

// ── 5. RANDOM STEER ───────────────────────────────────────────────────
// Steer kiri-kanan acak cepat — chaos berkendara
async function actionRandomSteer(durationMs) {
  if (!controller) return simLog('random_steer', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Random steer ${durationMs}ms`)
  const end = Date.now() + durationMs
  while (Date.now() < end) {
    const dir = (Math.random() * 2) - 1   // -1.0 sampai 1.0
    controller.report.leftStickX = toAxisValue(dir)
    await controller.update()
    await sleep(80 + Math.random() * 120)
  }
  await restoreState(snap)
}

// ── 6. HANDBRAKE PULL ─────────────────────────────────────────────────
// Tekan tombol X (Xbox) = handbrake di banyak racing game
async function actionHandbrake(durationMs) {
  if (!controller) return simLog('handbrake_vjoy', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Handbrake ${durationMs}ms`)
  controller.report.X = true     // Tombol X = handbrake (BeamNG, Forza, dll)
  await controller.update()
  await sleep(durationMs)
  controller.report.X = false
  await controller.update()
}

// ── 7. GAS + STEER CHAOS ──────────────────────────────────────────────
// Gas penuh + steer chaos = mobil ngacir ke mana-mana
async function actionDriftChaos(durationMs) {
  if (!controller) return simLog('drift_chaos', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Drift chaos ${durationMs}ms`)
  controller.report.rightTrigger = toTriggerValue(1.0)  // gas penuh
  const end = Date.now() + durationMs
  let phase = 0
  while (Date.now() < end) {
    // Oscillasi steer kiri-kanan
    const t   = (Date.now() % 800) / 800
    const dir = Math.sin(t * Math.PI * 2)
    controller.report.leftStickX = toAxisValue(dir)
    await controller.update()
    await sleep(16)   // ~60fps
  }
  await restoreState(snap)
}

// ── 8. REVERSE ────────────────────────────────────────────────────────
// Tekan tombol B (mundur/handbrake di beberapa game) + stick bawah
async function actionReverse(durationMs) {
  if (!controller) return simLog('reverse_vjoy', { durationMs })
  const snap = snapshotState()
  console.log(`[vJoy] Reverse ${durationMs}ms`)
  controller.report.leftTrigger  = toTriggerValue(1.0)   // rem/mundur
  controller.report.rightTrigger = toTriggerValue(0)
  controller.report.leftStickY   = toAxisValue(1.0)      // stick bawah
  await controller.update()
  await sleep(durationMs)
  await restoreState(snap)
}

// ── 9. VIBRATE (rumble) ───────────────────────────────────────────────
// Aktifkan motor rumble controller — bikin controller getar di tangan streamer
async function actionRumble(durationMs) {
  if (!controller) return simLog('rumble', { durationMs })
  console.log(`[vJoy] Rumble ${durationMs}ms`)
  // ViGEm tidak expose rumble output langsung dari Node.js (butuh FFB loop)
  // Fallback: steer chaos ringan sebagai "haptic" visual
  await actionRandomSteer(Math.min(durationMs, 2000))
}

// ── 10. DISCONNECT RECONNECT ──────────────────────────────────────────
// Simulasi controller dicabut-colok — pause game sejenak
async function actionDisconnect(durationMs) {
  if (!controller) return simLog('disconnect_vjoy', { durationMs })
  console.log(`[vJoy] Disconnect ${durationMs}ms`)
  try {
    await controller.disconnect()
    await sleep(durationMs)
    await controller.connect()
    console.log('[vJoy] Controller reconnected')
  } catch (err) {
    console.warn('[vJoy] Reconnect error:', err.message)
  }
}

// ══════════════════════════════════════════════════════════════════════
// ACTION REGISTRY — action_key → handler function
// ══════════════════════════════════════════════════════════════════════
const ACTION_REGISTRY = {
  'vjoy_brake':          actionFullBrake,
  'vjoy_throttle':       actionFullThrottle,
  'vjoy_steer_left':     actionSteerLeft,
  'vjoy_steer_right':    actionSteerRight,
  'vjoy_random_steer':   actionRandomSteer,
  'vjoy_handbrake':      actionHandbrake,
  'vjoy_drift_chaos':    actionDriftChaos,
  'vjoy_reverse':        actionReverse,
  'vjoy_rumble':         actionRumble,
  'vjoy_disconnect':     actionDisconnect,
}

// ── Utility ────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Event listener ─────────────────────────────────────────────────────
eventBus.on('effect', async ({ effect, donation }) => {
  if (effect.adapter !== 'vjoy') return   // bukan urusan adapter ini

  if (!isReady) {
    console.warn('[vJoy] Adapter belum siap, skip effect:', effect.action_key)
    return
  }

  const handler = ACTION_REGISTRY[effect.action_key]
  if (!handler) {
    console.warn(`[vJoy] action_key tidak dikenal: "${effect.action_key}"`)
    console.warn('       Tambahkan ke ACTION_REGISTRY di server/adapters/vjoy.js')
    return
  }

  console.log(`🕹️  [vJoy] Trigger: "${effect.name}" (${effect.action_key}) — ${effect.duration_ms}ms`)
  try {
    await handler(effect.duration_ms)
  } catch (err) {
    console.error(`[vJoy] Error saat menjalankan "${effect.action_key}":`, err.message)
  }
})

// ── Inisialisasi saat module di-load ───────────────────────────────────
initViGEm()

// ── Cleanup saat server mati ───────────────────────────────────────────
process.on('exit', () => {
  if (controller) { try { controller.disconnect() } catch {} }
  if (client)     { try { client.disconnect()     } catch {} }
})
process.on('SIGINT',  () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))

module.exports = { ACTION_REGISTRY, initViGEm }
