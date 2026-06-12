// server/adapters/saweria.js
// Menerima & memvalidasi webhook dari Saweria
// Docs: https://saweria.co/developers

const crypto = require('crypto')
const eventBus = require('../core/eventBus')

// ──────────────────────────────────────────────
// Validasi signature dari Saweria
// Header: X-Saweria-Signature (HMAC-SHA256)
// ──────────────────────────────────────────────
function validateSignature(rawBody, signature) {
  const streamKey = process.env.SAWERIA_STREAM_KEY
  if (!streamKey) {
    console.warn('⚠️  SAWERIA_STREAM_KEY tidak di-set, skip validasi signature')
    return true // dev mode: skip validasi
  }

  const expected = crypto
    .createHmac('sha256', streamKey)
    .update(rawBody)
    .digest('hex')

  // Constant-time comparison untuk cegah timing attack
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature || '', 'hex'),
      Buffer.from(expected, 'hex')
    )
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────
// Parse & normalize payload Saweria
// Payload format Saweria 2021.07+:
// { version, created_at, id, type, amount_raw,
//   cut, donator_name, donator_email, message, etc }
// ──────────────────────────────────────────────
function parsePayload(body) {
  return {
    platform:     'saweria',
    donatorName:  body.donator_name || 'Anonymous',
    amount:       parseInt(body.amount_raw || body.amount || 0),
    message:      body.message || '',
    email:        body.donator_email || '',
    rawPayload:   body,
  }
}

// ──────────────────────────────────────────────
// Express route handler
// POST /webhook/saweria
// ──────────────────────────────────────────────
function saweriаWebhookHandler(req, res) {
  // Signature check
  const signature = req.headers['x-saweria-signature'] || ''
  const rawBody   = req.rawBody || JSON.stringify(req.body)

  if (!validateSignature(rawBody, signature)) {
    console.warn('🚨 [Saweria] Signature tidak valid — request ditolak')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const body = req.body

  // Saweria kadang kirim test ping (type: 'test')
  if (body.type === 'test') {
    console.log('🔔 [Saweria] Test webhook diterima')
    return res.json({ status: 'ok', message: 'Test received' })
  }

  // Hanya proses tipe 'donation'
  if (body.type !== 'donation') {
    return res.json({ status: 'ok', message: `Type "${body.type}" diabaikan` })
  }

  const donation = parsePayload(body)

  if (!donation.amount || donation.amount <= 0) {
    return res.status(400).json({ error: 'Amount tidak valid' })
  }

  // Publish ke eventBus → diterima effectEngine
  eventBus.emit('donation', donation)

  return res.json({ status: 'ok', received: donation.amount })
}

module.exports = { saweriаWebhookHandler, parsePayload }
