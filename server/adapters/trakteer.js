// server/adapters/trakteer.js
// Menerima & memvalidasi webhook dari Trakteer
// Docs: https://trakteer.id/manage/integration

const eventBus = require('../core/eventBus')

// ──────────────────────────────────────────────
// Validasi API Key dari header Trakteer
// Header: X-Api-Key
// ──────────────────────────────────────────────
function validateApiKey(req) {
  const apiKey = process.env.TRAKTEER_API_KEY
  if (!apiKey) {
    console.warn('⚠️  TRAKTEER_API_KEY tidak di-set, skip validasi')
    return true
  }
  return req.headers['x-api-key'] === apiKey
}

// ──────────────────────────────────────────────
// Parse & normalize payload Trakteer
// Payload Trakteer berisi unit & quantity
// misal: unit = 1000 (1 unit = Rp 1.000), quantity = 5 → Rp 5.000
// ──────────────────────────────────────────────
function parsePayload(body) {
  const unitPrice = parseInt(body.unit_price || body.unit || 1000)
  const quantity  = parseInt(body.quantity || 1)
  const amount    = body.amount
    ? parseInt(body.amount)
    : unitPrice * quantity

  return {
    platform:    'trakteer',
    donatorName: body.supporter_name || body.name || 'Anonymous',
    amount:      amount,
    message:     body.message || body.supporter_message || '',
    email:       body.supporter_email || '',
    rawPayload:  body,
  }
}

// ──────────────────────────────────────────────
// Express route handler
// POST /webhook/trakteer
// ──────────────────────────────────────────────
function trakteerWebhookHandler(req, res) {
  if (!validateApiKey(req)) {
    console.warn('🚨 [Trakteer] API Key tidak valid — request ditolak')
    return res.status(401).json({ error: 'Invalid API key' })
  }

  const body = req.body

  // Skip jika bukan tipe dukungan/donasi
  const validTypes = ['donation', 'support', undefined]
  if (body.type && !validTypes.includes(body.type)) {
    return res.json({ status: 'ok', message: `Type "${body.type}" diabaikan` })
  }

  const donation = parsePayload(body)

  if (!donation.amount || donation.amount <= 0) {
    return res.status(400).json({ error: 'Amount tidak valid' })
  }

  eventBus.emit('donation', donation)

  return res.json({ status: 'ok', received: donation.amount })
}

module.exports = { trakteerWebhookHandler, parsePayload }
