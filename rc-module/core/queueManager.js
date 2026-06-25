/**
 * RC Module — Queue Manager
 * 
 * Mengelola antrian viewer yang menunggu giliran RC.
 * Ketika RC selesai dipakai, queue manager otomatis
 * mengambil viewer berikutnya dan trigger SessionManager.
 * 
 * Phase: 1 (fondasi)
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class QueueManager extends EventEmitter {
  constructor() {
    super();

    /**
     * Queue per RC
     * Key: rc_id
     * Value: Array of queue entries
     * 
     * Queue entry: {
     *   id, viewer_name, duration_sec, source,
     *   donation_amount, queued_at, queue_token
     * }
     */
    this.queues = new Map();

    this.maxQueuePerRc = 5; // Bisa diubah via config
  }

  /**
   * Set konfigurasi
   * @param {Object} config
   */
  configure({ maxQueuePerRc } = {}) {
    if (maxQueuePerRc) this.maxQueuePerRc = maxQueuePerRc;
  }

  /**
   * Viewer masuk antrian untuk RC tertentu
   * @param {Object} opts
   * @param {string} opts.rc_id
   * @param {string} opts.viewer_name
   * @param {number} opts.duration_sec
   * @param {string} opts.source
   * @param {number} [opts.donation_amount]
   * @returns {Object} queue entry + posisi antrian
   */
  enqueue(opts) {
    const { rc_id, viewer_name, duration_sec, source, donation_amount } = opts;

    // Inisialisasi queue untuk RC ini jika belum ada
    if (!this.queues.has(rc_id)) {
      this.queues.set(rc_id, []);
    }

    const queue = this.queues.get(rc_id);

    // Cek apakah queue penuh
    if (queue.length >= this.maxQueuePerRc) {
      return { success: false, error: 'QUEUE_FULL', position: null };
    }

    const entry = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      rc_id,
      viewer_name,
      duration_sec,
      source: source || 'manual',
      donation_amount: donation_amount || 0,
      queued_at: new Date().toISOString(),
      queue_token: crypto.randomBytes(8).toString('hex'),
    };

    queue.push(entry);

    const position = queue.length; // 1-indexed

    this.emit('queue_update', { rc_id, queue: this.getQueueForRc(rc_id) });

    console.log(`[QueueManager] ${viewer_name} masuk antrian RC ${rc_id} posisi ${position}`);

    return { success: true, entry, position };
  }

  /**
   * Ambil viewer berikutnya dari antrian
   * @param {string} rc_id
   * @returns {Object|null} queue entry atau null jika kosong
   */
  dequeue(rc_id) {
    const queue = this.queues.get(rc_id);
    if (!queue || queue.length === 0) return null;

    const next = queue.shift();

    this.emit('queue_update', { rc_id, queue: this.getQueueForRc(rc_id) });

    console.log(`[QueueManager] ${next.viewer_name} keluar antrian RC ${rc_id}`);
    return next;
  }

  /**
   * Viewer keluar antrian secara manual
   * @param {string} queue_token
   * @returns {boolean}
   */
  leave(queue_token) {
    for (const [rc_id, queue] of this.queues) {
      const idx = queue.findIndex(e => e.queue_token === queue_token);
      if (idx !== -1) {
        const removed = queue.splice(idx, 1)[0];
        this.emit('queue_update', { rc_id, queue: this.getQueueForRc(rc_id) });
        console.log(`[QueueManager] ${removed.viewer_name} keluar antrian RC ${rc_id}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Hitung estimasi tunggu untuk RC tertentu
   * @param {string} rc_id
   * @param {number} current_session_remaining_sec - sisa waktu sesi aktif
   * @returns {number} estimasi tunggu dalam detik
   */
  estimatedWait(rc_id, current_session_remaining_sec = 0) {
    const queue = this.queues.get(rc_id) || [];
    let wait = current_session_remaining_sec;
    for (const entry of queue) {
      wait += entry.duration_sec;
    }
    return wait;
  }

  /**
   * Ambil queue untuk satu RC (untuk API response)
   * @param {string} rc_id
   * @returns {Array}
   */
  getQueueForRc(rc_id) {
    const queue = this.queues.get(rc_id) || [];
    return queue.map((entry, idx) => ({
      position: idx + 1,
      id: entry.id,
      viewer_name: entry.viewer_name,
      duration_sec: entry.duration_sec,
      queued_at: entry.queued_at,
      queue_token: entry.queue_token,
    }));
  }

  /**
   * Ambil semua queue (untuk API response)
   * @returns {Object} map rc_id → queue array
   */
  getAll() {
    const result = {};
    for (const [rc_id] of this.queues) {
      result[rc_id] = this.getQueueForRc(rc_id);
    }
    return result;
  }

  /**
   * Berapa orang dalam antrian untuk RC tertentu?
   * @param {string} rc_id
   * @returns {number}
   */
  length(rc_id) {
    return (this.queues.get(rc_id) || []).length;
  }
}

// Singleton
module.exports = new QueueManager();
