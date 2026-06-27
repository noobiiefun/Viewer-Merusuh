/* ═══════════════════════════════════════════════════════════
   pick.js — Halaman Pilih Avatar | Viewer Merusuh
   Flow: Cek nama → Tampilkan grid tier → Submit pick
══════════════════════════════════════════════════════════════ */

const BASE_URL = window.location.origin; // http://localhost:3500

// ── State ─────────────────────────────────────────────────
let state = {
  youtubeName:    null,  // nama yang sudah dicek & valid
  tierId:         null,
  tierDisplayName: null,
  tierColor:      null,
  currentAvatarId:   null,  // avatar yang sudah dipilih sebelumnya (bisa null)
  currentAvatarName: null,
  selectedAvatarId:  null,  // pilihan baru yang belum disimpan
  avatars:        [],
};

// ── DOM refs ───────────────────────────────────────────────
const $ = id => document.getElementById(id);

const stepCheck   = $('step-check');
const stepPick    = $('step-pick');
const stepSuccess = $('step-success');

const inputYtName  = $('input-yt-name');
const btnCheck     = $('btn-check');
const checkError   = $('check-error');

const viewerNameDisplay  = $('viewer-name-display');
const tierBadgeDisplay   = $('tier-badge-display');
const btnChangeName      = $('btn-change-name');

const currentAvatarBar    = $('current-avatar-bar');
const currentAvatarSprite = $('current-avatar-sprite');
const currentAvatarName   = $('current-avatar-name');

const avatarGrid  = $('avatar-grid');
const pickError   = $('pick-error');

const selectedPreview = $('selected-preview');
const selectedSprite  = $('selected-sprite');
const selectedName    = $('selected-name');
const btnSave         = $('btn-save');

const successSprite     = $('success-sprite');
const successAvatarName = $('success-avatar-name');
const successViewerName = $('success-viewer-name');
const btnPickAgain      = $('btn-pick-again');

const toast = $('toast');

// ── Utils ──────────────────────────────────────────────────

function showStep(step) {
  [stepCheck, stepPick, stepSuccess].forEach(s => s.style.display = 'none');
  step.style.display = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setError(el, msg) {
  el.textContent = msg;
  el.style.display = msg ? '' : 'none';
}

let toastTimer;
function showToast(msg, type = 'success') {
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  toast.style.display = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.style.display = 'none', 250);
  }, 3000);
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn._origText = btn._origText ?? btn.innerHTML;
  btn.innerHTML = loading
    ? '<span class="spinner"></span>'
    : btn._origText;
}

/**
 * Buat sprite element untuk satu avatar.
 * @param {object} avatar - { id, frame_width, frame_height, frame_count }
 * @param {string} sizeClass - '' | 'sm' | 'lg'
 */
function applySprite(spriteEl, avatar, sizeClass = '') {
  const fw = avatar.frame_width  || 32;
  const fh = avatar.frame_height || 48;
  const fc = avatar.frame_count  || 4;

  spriteEl.style.backgroundImage = `url('/avatars/${avatar.id}')`;
  spriteEl.style.width  = fw + 'px';
  spriteEl.style.height = fh + 'px';
  spriteEl.style.setProperty('--sheet-width', `-${fw * fc}px`);

  spriteEl.className = 'avatar-sprite walking' + (sizeClass ? ' ' + sizeClass : '');
}

// ── Step 1: Cek viewer ─────────────────────────────────────

async function checkViewer() {
  const name = inputYtName.value.trim();
  if (!name) {
    setError(checkError, 'Masukkan nama YouTube Channel kamu dulu ya.');
    return;
  }

  setError(checkError, '');
  setLoading(btnCheck, true);

  try {
    const res  = await fetch(`${BASE_URL}/api/viewers/check?name=${encodeURIComponent(name)}`);
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Terjadi kesalahan. Coba lagi.');
    }

    const data = json.data;

    if (!data.registered) {
      setError(checkError,
        'Nama kamu belum ada di daftar. Minta link ke streamer setelah donasi atau sewa RC.'
      );
      return;
    }

    // Simpan state
    state.youtubeName      = data.youtube_name;
    state.tierId           = data.tier.id;
    state.tierDisplayName  = data.tier.display_name;
    state.tierColor        = data.tier.color_hex || '#7c5cfc';
    state.currentAvatarId  = data.has_avatar ? data.avatar_id : null;
    state.currentAvatarName = data.avatar_name || null;
    state.selectedAvatarId = null;

    await loadPickStep();

  } catch (err) {
    setError(checkError, err.message || 'Gagal menghubungi server. Coba lagi.');
  } finally {
    setLoading(btnCheck, false);
  }
}

// ── Step 2: Load pick step ─────────────────────────────────

async function loadPickStep() {
  // Update viewer info bar
  viewerNameDisplay.textContent = state.youtubeName;
  tierBadgeDisplay.textContent  = state.tierDisplayName;
  tierBadgeDisplay.style.background = state.tierColor;

  // Tampilkan avatar saat ini jika ada
  if (state.currentAvatarId) {
    currentAvatarBar.style.display = '';
    currentAvatarName.textContent  = state.currentAvatarName || state.currentAvatarId;
    // sprite diisi setelah avatar list dimuat
  } else {
    currentAvatarBar.style.display = 'none';
  }

  // Reset selected
  selectedPreview.style.visibility = 'hidden';
  btnSave.disabled = true;
  setError(pickError, '');

  showStep(stepPick);
  await loadAvatarGrid();
}

// ── Load avatar grid ───────────────────────────────────────

async function loadAvatarGrid() {
  avatarGrid.innerHTML = '<div class="grid-loading"><div class="spinner"></div><span>Memuat avatar…</span></div>';

  try {
    const res  = await fetch(`${BASE_URL}/api/avatars?tier_id=${encodeURIComponent(state.tierId)}`);
    const json = await res.json();

    if (!res.ok || !json.success) throw new Error(json.error || 'Gagal memuat avatar.');

    state.avatars = json.data;

    if (!state.avatars.length) {
      avatarGrid.innerHTML = '<div class="grid-empty">Belum ada avatar yang tersedia untuk tier kamu. Hubungi streamer.</div>';
      return;
    }

    renderGrid();

    // Isi sprite current avatar setelah data dimuat
    if (state.currentAvatarId) {
      const cur = state.avatars.find(a => a.id === state.currentAvatarId);
      if (cur) applySprite(currentAvatarSprite, cur);
    }

  } catch (err) {
    avatarGrid.innerHTML = `<div class="grid-empty">Gagal memuat avatar: ${err.message}</div>`;
  }
}

function renderGrid() {
  avatarGrid.innerHTML = '';

  state.avatars.forEach(avatar => {
    const card = document.createElement('div');
    card.className = 'avatar-card';
    if (avatar.id === state.selectedAvatarId) card.classList.add('selected');
    if (avatar.id === state.currentAvatarId)  card.dataset.isCurrent = '1';
    card.dataset.avatarId = avatar.id;

    // Sprite container
    const spriteWrap = document.createElement('div');
    spriteWrap.className = 'avatar-card-sprite';

    const spriteEl = document.createElement('div');
    applySprite(spriteEl, avatar);
    spriteWrap.appendChild(spriteEl);

    // Nama
    const nameEl = document.createElement('div');
    nameEl.className = 'avatar-card-name';
    nameEl.textContent = avatar.display_name || avatar.id;

    // Badge "Saat ini" jika sudah dipilih sebelumnya
    if (avatar.id === state.currentAvatarId) {
      const badge = document.createElement('div');
      badge.style.cssText = 'font-size:10px;color:#34d399;margin-top:4px;font-weight:700;';
      badge.textContent = '▸ Saat ini';
      card.appendChild(spriteWrap);
      card.appendChild(nameEl);
      card.appendChild(badge);
    } else {
      card.appendChild(spriteWrap);
      card.appendChild(nameEl);
    }

    card.addEventListener('click', () => selectAvatar(avatar));
    avatarGrid.appendChild(card);
  });
}

// ── Pilih avatar ───────────────────────────────────────────

function selectAvatar(avatar) {
  state.selectedAvatarId = avatar.id;

  // Update card highlights
  document.querySelectorAll('.avatar-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.avatarId === avatar.id);
  });

  // Update bottom preview
  applySprite(selectedSprite, avatar, 'sm');
  selectedName.textContent = avatar.display_name || avatar.id;
  selectedPreview.style.visibility = '';

  // Aktifkan tombol simpan (kecuali kalau sama dengan yang sudah ada)
  const isSame = avatar.id === state.currentAvatarId;
  btnSave.disabled = isSame;
  if (isSame) {
    showToast('Itu sudah avatar kamu sekarang 😄', 'success');
  } else {
    setError(pickError, '');
  }
}

// ── Submit pick ────────────────────────────────────────────

async function submitPick() {
  if (!state.selectedAvatarId || !state.youtubeName) return;

  setLoading(btnSave, true);
  setError(pickError, '');

  try {
    const res = await fetch(`${BASE_URL}/api/viewers/pick`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        youtube_name: state.youtubeName,
        avatar_id:    state.selectedAvatarId,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan pilihan.');

    // Tampilkan sukses
    const chosenAvatar = state.avatars.find(a => a.id === state.selectedAvatarId);
    if (chosenAvatar) applySprite(successSprite, chosenAvatar, 'lg');
    successAvatarName.textContent = chosenAvatar?.display_name || state.selectedAvatarId;
    successViewerName.textContent = state.youtubeName;

    showStep(stepSuccess);

  } catch (err) {
    setError(pickError, err.message || 'Gagal menyimpan. Coba lagi.');
    showToast(err.message || 'Terjadi kesalahan.', 'error');
  } finally {
    setLoading(btnSave, false);
  }
}

// ── Event listeners ────────────────────────────────────────

btnCheck.addEventListener('click', checkViewer);

inputYtName.addEventListener('keydown', e => {
  if (e.key === 'Enter') checkViewer();
});

btnChangeName.addEventListener('click', () => {
  // Reset ke step 1 tapi pertahankan input nama
  state.selectedAvatarId = null;
  setError(checkError, '');
  showStep(stepCheck);
  inputYtName.focus();
});

btnSave.addEventListener('click', submitPick);

btnPickAgain.addEventListener('click', () => {
  // Kembali ke step pick dengan state yang sama (refresh grid)
  state.currentAvatarId   = state.selectedAvatarId;
  state.currentAvatarName = state.avatars.find(a => a.id === state.selectedAvatarId)?.display_name || null;
  state.selectedAvatarId  = null;
  loadPickStep();
});

// ── Init ───────────────────────────────────────────────────

(function init() {
  showStep(stepCheck);
  inputYtName.focus();

  // Support ?name=... dari query string (misal link langsung dari streamer)
  const params = new URLSearchParams(window.location.search);
  const prefill = params.get('name');
  if (prefill) {
    inputYtName.value = prefill;
    // Auto-check setelah halaman siap
    setTimeout(checkViewer, 300);
  }
})();
