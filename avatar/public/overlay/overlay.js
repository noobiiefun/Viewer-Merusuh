/* ─────────────────────────────────────────────
   Avatar Overlay — overlay.js
   State machine: SPAWN → WALK_IN → ARRIVE →
   BUBBLE_SHOW → BUBBLE_HIDE → IDLE → WALK_OUT → REMOVED
───────────────────────────────────────────── */

// ── Config (di-serve dari server via GET /api/status, fallback ke default) ──
const CONFIG = {
  BUBBLE_DURATION_MS : 5000,
  IDLE_DURATION_MS   : 12000,
  MAX_AVATARS        : 8,
  AVATAR_SCALE       : 2,
  WALK_SPEED_PX_S    : 80,    // px/detik saat berjalan
  STAGE_W            : 1920,
  STAGE_H            : 1080,
};

// ── State Map: viewer_name → { el, state, timers, avatarData } ──
const activeAvatars = new Map();

// ── Stage ──
const stage = document.getElementById('overlay-stage');

// ── Socket.IO ──
const socket = io('http://localhost:3500');

socket.on('chat_message', (data) => {
  handleChatMessage(data);
});

// ─────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────

function handleChatMessage({ viewer_name, avatar_id, tier_id, tier_color, message, timestamp }) {
  if (activeAvatars.has(viewer_name)) {
    // Avatar sudah di layar — cukup update bubble
    showBubble(activeAvatars.get(viewer_name), message);
    return;
  }

  // Cek MAX_AVATARS
  if (activeAvatars.size >= CONFIG.MAX_AVATARS) return;

  spawnAvatar({ viewer_name, avatar_id, tier_id, tier_color, message });
}

// ─────────────────────────────────────────────
// SPAWN
// ─────────────────────────────────────────────

async function spawnAvatar({ viewer_name, avatar_id, tier_id, tier_color, message }) {
  // Ambil data avatar (frame info) dari server
  let avatarData = await fetchAvatarData(avatar_id);
  if (!avatarData) {
    // Fallback default jika API gagal
    avatarData = { id: avatar_id, frame_count: 4, frame_width: 32, frame_height: 48, display_name: avatar_id };
  }

  const scale      = CONFIG.AVATAR_SCALE;
  const frameW     = avatarData.frame_width  || 32;
  const frameH     = avatarData.frame_height || 48;
  const frameCount = avatarData.frame_count  || 4;
  const dispW      = frameW  * scale;
  const dispH      = frameH  * scale;
  const totalW     = frameW  * frameCount * scale;   // sprite sheet total width di layar
  const walkDuration = dispW * 4 / CONFIG.WALK_SPEED_PX_S;  // detik untuk jalan masuk

  // Tentukan sisi masuk: 0=kiri, 1=kanan (random)
  const fromRight = Math.random() < 0.5;

  // Posisi X awal (di luar layar)
  const startX = fromRight ? CONFIG.STAGE_W + 10 : -(dispW + 10);

  // Posisi X tujuan (random zona tengah, tidak terlalu ke pojok)
  const margin  = 120;
  const targetX = margin + Math.random() * (CONFIG.STAGE_W - margin * 2 - dispW);

  // Posisi Y (tepat di bawah layar, kaki menyentuh bawah)
  const bottomY = 0;  // bottom:0 diatur CSS

  // Buat elemen
  const container = document.createElement('div');
  container.className = 'avatar-container';
  container.dataset.viewer = viewer_name;
  container.style.left   = `${startX}px`;
  container.style.bottom = `${bottomY}px`;
  container.style.setProperty('--walk-duration', `${walkDuration}s`);

  // Speech bubble
  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  const bubbleText = document.createElement('span');
  bubbleText.className = 'bubble-text';
  bubble.appendChild(bubbleText);

  // Nama viewer
  const nameEl = document.createElement('div');
  nameEl.className = 'avatar-name';
  nameEl.textContent = viewer_name;

  // Tier badge (opsional — muncul jika ada warna tier)
  if (tier_color) {
    const badge = document.createElement('div');
    badge.className = 'avatar-tier-badge';
    badge.textContent = tier_id || '';
    badge.style.background = tier_color + '33';   // 20% opacity background
    badge.style.color       = tier_color;
    badge.style.border      = `1px solid ${tier_color}66`;
    nameEl.appendChild(document.createElement('br'));
    nameEl.appendChild(badge);
  }

  // Sprite
  const sprite = document.createElement('div');
  sprite.className  = 'avatar-sprite';
  sprite.style.width  = `${dispW}px`;
  sprite.style.height = `${dispH}px`;
  sprite.style.backgroundImage = `url('/avatars/${encodeURIComponent(avatar_id)}')`;
  sprite.style.backgroundSize  = `${totalW}px ${dispH}px`;

  // Scale transform
  const scaleTransform     = `scale(1)`;  // skala sudah via dispW/dispH
  const scaleTransformFlip = `scaleX(-1)`;
  sprite.style.setProperty('--sprite-scale-transform',      scaleTransform);
  sprite.style.setProperty('--sprite-scale-transform-flip', scaleTransformFlip);

  // Arah hadap
  sprite.classList.add(fromRight ? 'facing-left' : 'facing-right');

  // Susun elemen
  container.appendChild(bubble);
  container.appendChild(nameEl);
  container.appendChild(sprite);
  stage.appendChild(container);

  // Mulai walk animation sprite
  sprite.style.animation = `walk-cycle ${frameCount * 0.12}s steps(${frameCount}) infinite`;
  sprite.style.setProperty('--sprite-total-width', `-${totalW}px`);

  // Simpan ke map
  const avatarObj = {
    el: container,
    sprite,
    bubble,
    bubbleText,
    state: 'SPAWN',
    timers: {},
    fromRight,
    targetX,
    startX,
    dispW,
    dispH,
    frameCount,
  };
  activeAvatars.set(viewer_name, avatarObj);

  // Mulai state machine
  transitionTo(avatarObj, 'WALK_IN', { message });
}

// ─────────────────────────────────────────────
// STATE MACHINE
// ─────────────────────────────────────────────

function transitionTo(av, newState, ctx = {}) {
  // Bersihkan semua timer lama kecuali yang dipertahankan
  clearAllTimers(av);
  av.state = newState;

  switch (newState) {

    case 'WALK_IN': {
      av.el.classList.add('walking');
      // Trigger CSS transition dengan sedikit delay (biar browser register posisi awal)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          av.el.style.left = `${av.targetX}px`;
        });
      });

      // Estimasi waktu sampai
      const dist = Math.abs(av.targetX - av.startX);
      const dur  = (dist / CONFIG.WALK_SPEED_PX_S) * 1000;

      av.timers.arrive = setTimeout(() => {
        transitionTo(av, 'ARRIVE', ctx);
      }, dur + 50);   // +50ms buffer
      break;
    }

    case 'ARRIVE': {
      av.el.classList.remove('walking');
      av.el.classList.add('arrived');

      // Sprite idle: pause di frame pertama
      av.sprite.style.animationPlayState = 'paused';
      av.sprite.style.backgroundPositionX = '0px';

      transitionTo(av, 'BUBBLE_SHOW', ctx);
      break;
    }

    case 'BUBBLE_SHOW': {
      showBubble(av, ctx.message || '');
      av.timers.hideBubble = setTimeout(() => {
        transitionTo(av, 'BUBBLE_HIDE');
      }, CONFIG.BUBBLE_DURATION_MS);
      break;
    }

    case 'BUBBLE_HIDE': {
      hideBubble(av);
      av.timers.idle = setTimeout(() => {
        transitionTo(av, 'IDLE');
      }, 300);
      break;
    }

    case 'IDLE': {
      // Avatar diam, tunggu pesan baru atau timeout → walk out
      av.timers.walkOut = setTimeout(() => {
        transitionTo(av, 'WALK_OUT');
      }, CONFIG.IDLE_DURATION_MS);
      break;
    }

    case 'WALK_OUT': {
      // Resume sprite walk
      av.sprite.style.animationPlayState = 'running';
      av.el.classList.remove('arrived');

      // Balik arah: keluar ke sisi yang berlawanan dari arah masuk
      // (atau bisa pilih sisi terdekat)
      const exitRight = av.targetX < CONFIG.STAGE_W / 2 ? false : true;
      const exitX     = exitRight ? CONFIG.STAGE_W + 10 : -(av.dispW + 10);

      // Balik hadap sprite sesuai arah exit
      av.sprite.classList.remove('facing-left', 'facing-right');
      av.sprite.classList.add(exitRight ? 'facing-right' : 'facing-left');

      av.el.classList.add('walking', 'exiting');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          av.el.style.left = `${exitX}px`;
        });
      });

      const dist = Math.abs(exitX - av.targetX);
      const dur  = (dist / CONFIG.WALK_SPEED_PX_S) * 1000;

      av.timers.remove = setTimeout(() => {
        transitionTo(av, 'REMOVED');
      }, dur + 600);   // +600ms karena ada fade out
      break;
    }

    case 'REMOVED': {
      av.el.remove();
      activeAvatars.delete(av.el.dataset.viewer);
      break;
    }
  }
}

// ─────────────────────────────────────────────
// BUBBLE HELPERS
// ─────────────────────────────────────────────

function showBubble(av, message) {
  // Reset timer idle jika avatar sudah di IDLE
  if (av.state === 'IDLE') {
    clearTimeout(av.timers.walkOut);
    clearTimeout(av.timers.hideBubble);

    // Langsung ke BUBBLE_SHOW tanpa re-trigger state machine penuh
    av.state = 'BUBBLE_SHOW';
    av.bubbleText.textContent = message;
    av.bubble.classList.add('visible');

    av.timers.hideBubble = setTimeout(() => {
      transitionTo(av, 'BUBBLE_HIDE');
    }, CONFIG.BUBBLE_DURATION_MS);
    return;
  }

  av.bubbleText.textContent = message;
  av.bubble.classList.add('visible');
}

function hideBubble(av) {
  av.bubble.classList.remove('visible');
}

// ─────────────────────────────────────────────
// FETCH AVATAR DATA
// ─────────────────────────────────────────────

const avatarCache = new Map();

async function fetchAvatarData(avatarId) {
  if (avatarCache.has(avatarId)) return avatarCache.get(avatarId);
  try {
    const res  = await fetch(`/api/avatars/info?id=${encodeURIComponent(avatarId)}`);
    const data = await res.json();
    const av   = data.avatar || null;
    if (av) avatarCache.set(avatarId, av);
    return av;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────

function clearAllTimers(av) {
  Object.values(av.timers).forEach(t => clearTimeout(t));
  av.timers = {};
}

// ─────────────────────────────────────────────
// LOAD CONFIG dari server
// ─────────────────────────────────────────────

async function loadConfig() {
  try {
    const res  = await fetch('/api/status');
    const data = await res.json();
    if (data.config) {
      Object.assign(CONFIG, data.config);
    }
  } catch { /* pakai default */ }
}

loadConfig();
