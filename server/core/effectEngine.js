// server/core/effectEngine.js
// Menerima event donasi → cari efek yang cocok → trigger adapter

const eventBus = require('./eventBus')
const { getDB } = require('../db/database')

// Queue untuk cegah efek tumpang tindih (mode sequential)
const effectQueue = []
let isProcessing = false

// Cooldown tracker per effect id
const cooldownMap = new Map()

// ──────────────────────────────────────────────
// Cari efek yang cocok berdasarkan nominal donasi
// ──────────────────────────────────────────────
function findMatchingEffect(amount) {
  const db = getDB()
  const effect = db.prepare(`
    SELECT * FROM effects
    WHERE is_active = 1
      AND min_amount <= ?
      AND (max_amount IS NULL OR max_amount >= ?)
    ORDER BY min_amount DESC
    LIMIT 1
  `).get(amount, amount)
  return effect || null
}

// ──────────────────────────────────────────────
// Simpan log donasi ke DB
// ──────────────────────────────────────────────
function logDonation(donation, effect, status = 'processed') {
  const db = getDB()
  db.prepare(`
    INSERT INTO donation_logs (platform, donator_name, amount, message, effect_id, effect_name, status, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    donation.platform,
    donation.donatorName,
    donation.amount,
    donation.message || null,
    effect?.id || null,
    effect?.name || null,
    status,
    JSON.stringify(donation.rawPayload || {})
  )
}

// ──────────────────────────────────────────────
// Cek apakah efek sedang cooldown
// ──────────────────────────────────────────────
function isOnCooldown(effectId, cooldownMs) {
  if (!cooldownMs) return false
  const lastUsed = cooldownMap.get(effectId)
  if (!lastUsed) return false
  return (Date.now() - lastUsed) < cooldownMs
}

// ──────────────────────────────────────────────
// Proses satu efek dari queue
// ──────────────────────────────────────────────
async function processNext() {
  if (isProcessing || effectQueue.length === 0) return
  isProcessing = true

  const { effect, donation } = effectQueue.shift()

  // Emit ke adapter (Phase 2 nanti)
  eventBus.emit('effect', { effect, donation })
  console.log(`🎮 [EffectEngine] Trigger: "${effect.name}" (${effect.action_key}) — ${effect.duration_ms}ms`)

  // Tunggu durasi efek selesai sebelum proses berikutnya
  await new Promise(r => setTimeout(r, effect.duration_ms + 500))
  isProcessing = false
  processNext()
}

// ──────────────────────────────────────────────
// Handler utama: terima donasi dari eventBus
// ──────────────────────────────────────────────
eventBus.on('donation', (donation) => {
  const { platform, donatorName, amount, message } = donation
  console.log(`\n💰 [Donation] ${donatorName} dari ${platform} — Rp ${amount.toLocaleString('id-ID')}`)
  if (message) console.log(`   💬 "${message}"`)

  const effect = findMatchingEffect(amount)

  if (!effect) {
    console.log('   ⏭️  Tidak ada efek yang cocok untuk nominal ini')
    logDonation(donation, null, 'no_effect')
    return
  }

  if (isOnCooldown(effect.id, effect.cooldown_ms)) {
    console.log(`   ⏳ Efek "${effect.name}" sedang cooldown`)
    logDonation(donation, effect, 'cooldown')
    return
  }

  console.log(`   ✅ Efek cocok: "${effect.name}"`)
  cooldownMap.set(effect.id, Date.now())
  logDonation(donation, effect, 'queued')

  const db = getDB()
  const configMode = db.prepare(`SELECT value FROM config WHERE key = 'queue_mode'`).get()
  const mode = configMode?.value || 'sequential'

  if (mode === 'sequential') {
    effectQueue.push({ effect, donation })
    processNext()
  } else {
    // Parallel: langsung trigger tanpa antri
    eventBus.emit('effect', { effect, donation })
  }
})

console.log('⚙️  EffectEngine aktif')

module.exports = { findMatchingEffect, logDonation }
