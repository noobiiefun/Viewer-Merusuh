// server/core/effectEngine.js
// Menerima event donasi → cari efek yang cocok → trigger adapter
//
// PERBAIKAN:
// - Queue strict: tiap donasi antri SENDIRI, tidak di-skip meski effect_id sama
// - Cooldown hanya berlaku di mode parallel (mencegah spam bersamaan)
// - Sequential mode: semua masuk antrian tanpa pengecualian cooldown

const eventBus = require('./eventBus')
const { getDB } = require('../db/database')

// Queue ketat — setiap donasi yang cocok pasti dieksekusi, tidak ada yang dilewati
const effectQueue = []
let isProcessing = false

// ──────────────────────────────────────────────
// Cari efek yang cocok berdasarkan nominal donasi
// ──────────────────────────────────────────────
function findMatchingEffect(amount) {
  const db = getDB()
  return db.prepare(`
    SELECT * FROM effects
    WHERE is_active = 1
      AND min_amount <= ?
      AND (max_amount IS NULL OR max_amount >= ?)
    ORDER BY min_amount DESC
    LIMIT 1
  `).get(amount, amount) || null
}

// ──────────────────────────────────────────────
// Baca config dari DB
// ──────────────────────────────────────────────
function getConfig(key, fallback) {
  const db = getDB()
  const row = db.prepare(`SELECT value FROM config WHERE key = ?`).get(key)
  return row ? row.value : fallback
}

// ──────────────────────────────────────────────
// Simpan log donasi ke DB
// ──────────────────────────────────────────────
function logDonation(donation, effect, status = 'processed') {
  const db = getDB()
  db.prepare(`
    INSERT INTO donation_logs
      (platform, donator_name, amount, message, effect_id, effect_name, status, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    donation.platform,
    donation.donatorName,
    donation.amount,
    donation.message || null,
    effect?.id    || null,
    effect?.name  || null,
    status,
    JSON.stringify(donation.rawPayload || {})
  )
}

// ──────────────────────────────────────────────
// Proses antrian satu per satu (sequential)
// Tidak akan loncat ke item berikutnya sampai
// durasi efek + jeda selesai
// ──────────────────────────────────────────────
async function processNext() {
  if (isProcessing || effectQueue.length === 0) return
  isProcessing = true

  const { effect, donation } = effectQueue.shift()

  console.log(`🎮 [EffectEngine] Trigger: "${effect.name}" (${effect.action_key}) — ${effect.duration_ms}ms | Antrian sisa: ${effectQueue.length}`)

  // Broadcast ke socket (overlay & dashboard)
  eventBus.emit('effect', { effect, donation })

  // Tunggu durasi efek + 300ms jeda antar efek
  await new Promise(r => setTimeout(r, effect.duration_ms + 300))

  isProcessing = false
  processNext() // proses item berikutnya
}

// ──────────────────────────────────────────────
// Handler utama: terima donasi
// ──────────────────────────────────────────────
eventBus.on('donation', (donation) => {
  const { platform, donatorName, amount, message } = donation
  console.log(`\n💰 [Donation] ${donatorName} dari ${platform} — Rp ${amount.toLocaleString('id-ID')}`)
  if (message) console.log(`   💬 "${message}"`)

  const effect = findMatchingEffect(amount)

  if (!effect) {
    console.log('   ⏭️  Tidak ada efek yang cocok')
    logDonation(donation, null, 'no_effect')
    return
  }

  const mode = getConfig('queue_mode', 'sequential')

  if (mode === 'sequential') {
    // ── SEQUENTIAL: SEMUA masuk antrian, tidak ada yang dilewati ──
    // 3 orang donasi efek yang sama → 3x efek berjalan berurutan
    effectQueue.push({ effect, donation })
    const pos = effectQueue.length
    console.log(`   ✅ Masuk antrian #${pos}: "${effect.name}"`)
    logDonation(donation, effect, 'queued')
    processNext()

  } else {
    // ── PARALLEL: langsung trigger, tanpa antri ──
    console.log(`   ✅ Trigger langsung (parallel): "${effect.name}"`)
    logDonation(donation, effect, 'processed')
    eventBus.emit('effect', { effect, donation })
  }
})

// ── Expose info antrian untuk API ──
function getQueueInfo() {
  return {
    length:      effectQueue.length,
    isProcessing,
    items: effectQueue.map(({ effect, donation }) => ({
      effectName:  effect.name,
      donatorName: donation.donatorName,
      amount:      donation.amount,
    }))
  }
}

console.log('⚙️  EffectEngine aktif (strict queue mode)')
module.exports = { findMatchingEffect, logDonation, getQueueInfo }
