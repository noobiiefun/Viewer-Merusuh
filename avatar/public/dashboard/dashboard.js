/* ─────────────────────────────────────────────
   Avatar Overlay Dashboard — dashboard.js
   Connects to localhost:3500 via REST + Socket.IO
───────────────────────────────────────────── */

const API = '';  // same origin

// ─── State ───────────────────────────────────
const state = {
  viewers: [],
  tiers: [],
  avatars: [],
  pollingActive: false,
  pollingVideoId: null,
  chatCount: 0,
  editingTierId: null,         // null = buat baru
  changeTierViewerId: null,
  assignTierId: null,
  editingAvatarId: null,
  tierAvatarAssignments: {},   // { tier_id: Set<avatar_id> }
};

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSocket();
  initPollingTab();
  initViewersTab();
  initTiersTab();
  initAvatarsTab();
  initEventsTab();
  initModals();
  loadAll();
});

// ─── Tabs ─────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
    });
  });
}

// ─── Socket.IO ────────────────────────────────
function initSocket() {
  try {
    const socket = io();

    socket.on('connect', () => {
      setServerStatus(true);
    });
    socket.on('disconnect', () => {
      setServerStatus(false);
    });

    socket.on('chat_message', (data) => {
      appendChatLog(data);
      state.chatCount++;
      document.getElementById('stat-chat-today').textContent = state.chatCount;
    });

    socket.on('polling_status', (data) => {
      updatePollingUI(data.isRunning, data.videoId, data.stats);
    });

    socket.on('viewer_registered', () => loadViewers());
    socket.on('tier_updated', () => loadTiers());

  } catch (e) {
    setServerStatus(false);
  }
}

function setServerStatus(online) {
  const dot   = document.getElementById('status-dot');
  const label = document.getElementById('status-label');
  dot.className   = `status-dot ${online ? 'online' : 'offline'}`;
  label.textContent = online ? 'Terhubung' : 'Tidak terhubung';
}

// ─── Load All ─────────────────────────────────
async function loadAll() {
  await Promise.all([loadTiers(), loadAvatars(), loadViewers(), loadPollingStatus()]);
  loadDonorLog();
}

// ══════════════════════════════════════════════
// TAB 1: POLLING
// ══════════════════════════════════════════════

function initPollingTab() {
  document.getElementById('btn-start-poll').addEventListener('click', startPolling);
  document.getElementById('btn-stop-poll').addEventListener('click', stopPolling);
  document.getElementById('btn-clear-log').addEventListener('click', () => {
    document.getElementById('chat-log-box').innerHTML = '<div class="log-empty">Log dibersihkan.</div>';
    state.chatCount = 0;
    document.getElementById('chat-log-count').textContent = '0 pesan';
    document.getElementById('stat-chat-today').textContent = '0';
  });
}

async function loadPollingStatus() {
  try {
    const res  = await apiFetch('/admin/polling/status');
    const data = await res.json();
    updatePollingUI(data.isRunning, data.videoId, data.stats);
  } catch (e) { /* server belum siap */ }
}

async function startPolling() {
  const videoId = document.getElementById('input-video-id').value.trim();
  if (!videoId) { toast('Masukkan Video ID dulu!', 'err'); return; }

  const btn = document.getElementById('btn-start-poll');
  btn.disabled = true;
  btn.textContent = 'Menghubungkan…';

  try {
    const res = await apiFetch('/admin/polling/start', {
      method: 'POST',
      body: JSON.stringify({ video_id: videoId }),
    });
    const data = await res.json();
    if (data.success || data.isRunning) {
      updatePollingUI(true, videoId);
      toast('Polling dimulai!', 'ok');
    } else {
      toast(data.error || 'Gagal memulai polling', 'err');
    }
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = '▶ Mulai';
  }
}

async function stopPolling() {
  const btn = document.getElementById('btn-stop-poll');
  btn.disabled = true;
  btn.textContent = 'Menghentikan…';

  try {
    await apiFetch('/admin/polling/stop', { method: 'POST' });
    updatePollingUI(false, null);
    toast('Polling dihentikan.', 'info');
  } catch (e) {
    toast('Error: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = '⏹ Stop Polling';
  }
}

function updatePollingUI(isRunning, videoId, stats) {
  state.pollingActive = isRunning;
  state.pollingVideoId = videoId;

  const dot    = document.querySelector('.ind-dot');
  const txt    = document.getElementById('poll-status-text');
  const form   = document.getElementById('poll-form');
  const active = document.getElementById('poll-active-actions');
  const meta   = document.getElementById('poll-meta');

  dot.className   = `ind-dot ${isRunning ? 'on' : 'off'}`;
  txt.textContent = isRunning ? 'Aktif' : 'Tidak Aktif';
  form.style.display   = isRunning ? 'none' : 'block';
  active.style.display = isRunning ? 'block' : 'none';
  meta.style.display   = isRunning ? 'block' : 'none';

  if (isRunning && videoId) {
    document.getElementById('poll-video-label').textContent = videoId;
    if (stats) {
      document.getElementById('poll-stats').textContent =
        `${stats.messagesReceived ?? 0} diterima · ${stats.messagesEmitted ?? 0} diteruskan`;
    }
  }
}

function appendChatLog(data) {
  const box = document.getElementById('chat-log-box');
  const empty = box.querySelector('.log-empty');
  if (empty) empty.remove();

  const time  = new Date(data.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const entry = document.createElement('div');
  entry.className = 'chat-entry';

  // Get tier color
  const tier = state.tiers.find(t => t.id === data.tier_id);
  const color = tier?.color_hex || '#9090a8';

  entry.innerHTML = `
    <span class="chat-time">${time}</span>
    <span class="chat-name" style="color:${color}">${esc(data.viewer_name)}</span>
    <span class="chat-msg">${esc(data.message)}</span>
  `;
  box.appendChild(entry);
  box.scrollTop = box.scrollHeight;

  const count = box.querySelectorAll('.chat-entry').length;
  document.getElementById('chat-log-count').textContent = `${count} pesan`;
}

// ══════════════════════════════════════════════
// VIEWERS
// ══════════════════════════════════════════════

function initViewersTab() {
  document.getElementById('viewer-search').addEventListener('input', renderViewersTable);
  document.getElementById('viewer-filter-tier').addEventListener('change', renderViewersTable);
  document.getElementById('btn-add-viewer').addEventListener('click', () => {
    populateTierSelect('new-viewer-tier');
    openModal('modal-add-viewer');
  });
  document.getElementById('btn-confirm-add-viewer').addEventListener('click', submitAddViewer);
  document.getElementById('btn-confirm-change-tier').addEventListener('click', submitChangeTier);
}

async function loadViewers() {
  try {
    const res  = await apiFetch('/admin/viewers');
    const data = await res.json();
    state.viewers = data.viewers || data || [];
    updateViewerBadge();
    renderViewersTable();
    updateStats();
  } catch (e) {
    console.error('loadViewers:', e);
  }
}

function updateViewerBadge() {
  document.getElementById('badge-viewers').textContent = state.viewers.length;
}

function updateStats() {
  document.getElementById('stat-viewers').textContent = state.viewers.length;
  const withAvatar = state.viewers.filter(v => v.avatar_id).length;
  document.getElementById('stat-active').textContent = withAvatar;
  document.getElementById('stat-tiers').textContent = state.tiers.length;
}

function renderViewersTable() {
  const search = document.getElementById('viewer-search').value.toLowerCase();
  const tierFilter = document.getElementById('viewer-filter-tier').value;

  let filtered = state.viewers;
  if (search)     filtered = filtered.filter(v => v.youtube_name.toLowerCase().includes(search));
  if (tierFilter) filtered = filtered.filter(v => v.tier_id === tierFilter);

  const tbody = document.getElementById('viewers-tbody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="table-empty">Tidak ada viewer yang cocok.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(v => {
    const tier     = state.tiers.find(t => t.id === v.tier_id);
    const tierBadge = tier
      ? `<span class="tier-badge" style="color:${tier.color_hex};border-color:${tier.color_hex}40;background:${tier.color_hex}18">${esc(tier.display_name)}</span>`
      : '<span class="chip-inactive">—</span>';
    const avatarLabel = v.avatar_id
      ? `<code style="font-size:11px;color:var(--text-secondary)">${esc(v.avatar_id)}</code>`
      : '<span style="color:var(--text-muted)">Belum pilih</span>';
    const lastSeen = v.last_seen
      ? new Date(v.last_seen).toLocaleDateString('id-ID', { day:'2-digit', month:'short' })
      : '—';
    const status = v.is_active
      ? '<span class="chip-active">Aktif</span>'
      : '<span class="chip-inactive">Nonaktif</span>';
    const donasi = v.total_donation
      ? `Rp ${Number(v.total_donation).toLocaleString('id-ID')}`
      : '—';

    return `<tr>
      <td><strong>${esc(v.youtube_name)}</strong></td>
      <td>${tierBadge}</td>
      <td>${avatarLabel}</td>
      <td style="font-family:var(--font-mono);font-size:12px">${donasi}</td>
      <td style="font-family:var(--font-mono);font-size:12px;text-align:center">${v.total_rc_sessions || 0}</td>
      <td style="font-size:12px;color:var(--text-secondary)">${lastSeen}</td>
      <td>${status}</td>
      <td>
        <div class="action-group">
          <button class="btn btn-ghost btn-sm" onclick="openChangeTier(${v.id})">Tier</button>
          <button class="btn btn-ghost btn-sm" onclick="toggleViewer(${v.id},${v.is_active})">${v.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteViewer(${v.id}, '${esc(v.youtube_name)}')">Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function openChangeTier(viewerId) {
  state.changeTierViewerId = viewerId;
  const viewer = state.viewers.find(v => v.id === viewerId);
  document.getElementById('change-tier-viewer-name').textContent = viewer?.youtube_name || '';
  populateTierSelect('change-tier-select', viewer?.tier_id);
  openModal('modal-change-tier');
}

async function submitChangeTier() {
  const tierId = document.getElementById('change-tier-select').value;
  try {
    const res = await apiFetch(`/admin/viewers/${state.changeTierViewerId}/tier`, {
      method: 'PUT',
      body: JSON.stringify({ tier_id: tierId }),
    });
    const data = await res.json();
    if (data.success) {
      toast('Tier berhasil diubah!', 'ok');
      closeModal('modal-change-tier');
      loadViewers();
    } else {
      toast(data.error || 'Gagal mengubah tier', 'err');
    }
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

async function toggleViewer(id, currentActive) {
  try {
    const res  = await apiFetch(`/admin/viewers/${id}/toggle`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      toast(currentActive ? 'Viewer dinonaktifkan' : 'Viewer diaktifkan', 'ok');
      loadViewers();
    }
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

async function deleteViewer(id, name) {
  if (!confirm(`Hapus viewer "${name}"? Data ini tidak bisa dikembalikan.`)) return;
  try {
    const res  = await apiFetch(`/admin/viewers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { toast('Viewer dihapus.', 'ok'); loadViewers(); }
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

async function submitAddViewer() {
  const name   = document.getElementById('new-viewer-name').value.trim();
  const tierId = document.getElementById('new-viewer-tier').value;
  if (!name)   { toast('Nama YouTube wajib diisi', 'err'); return; }
  if (!tierId) { toast('Pilih tier dulu', 'err'); return; }

  try {
    const res  = await apiFetch('/admin/viewers', {
      method: 'POST',
      body: JSON.stringify({ youtube_name: name, tier_id: tierId }),
    });
    const data = await res.json();
    if (data.success) {
      toast('Viewer ditambahkan!', 'ok');
      closeModal('modal-add-viewer');
      document.getElementById('new-viewer-name').value = '';
      loadViewers();
    } else {
      toast(data.error || 'Gagal menambah viewer', 'err');
    }
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

// ══════════════════════════════════════════════
// TIERS
// ══════════════════════════════════════════════

function initTiersTab() {
  document.getElementById('btn-add-tier').addEventListener('click', () => {
    state.editingTierId = null;
    document.getElementById('tier-form-title').textContent = 'Buat Tier Baru';
    document.getElementById('tier-id-input').value      = '';
    document.getElementById('tier-id-input').disabled   = false;
    document.getElementById('tier-name-input').value    = '';
    document.getElementById('tier-color-input').value   = '#7c3aed';
    document.getElementById('tier-color-picker').value  = '#7c3aed';
    document.getElementById('tier-min-don').value       = '0';
    document.getElementById('tier-min-rc').value        = '0';
    document.getElementById('tier-priority').value      = '0';
    document.getElementById('tier-allow-manual').checked = true;
    openModal('modal-tier-form');
  });

  // Sync color picker ↔ text input
  document.getElementById('tier-color-picker').addEventListener('input', e => {
    document.getElementById('tier-color-input').value = e.target.value;
  });
  document.getElementById('tier-color-input').addEventListener('input', e => {
    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
      document.getElementById('tier-color-picker').value = e.target.value;
    }
  });

  document.getElementById('btn-confirm-tier-form').addEventListener('click', submitTierForm);
  document.getElementById('btn-confirm-assign-avatars').addEventListener('click', submitAssignAvatars);
}

async function loadTiers() {
  try {
    const res  = await apiFetch('/admin/tiers');
    const data = await res.json();
    state.tiers = data.tiers || data || [];
    renderTiersList();
    populateTierFilter();
    updateStats();
  } catch (e) { console.error('loadTiers:', e); }
}

function renderTiersList() {
  const container = document.getElementById('tiers-list');
  if (!state.tiers.length) {
    container.innerHTML = '<div class="list-empty">Belum ada tier. Buat tier pertamamu!</div>';
    return;
  }

  container.innerHTML = state.tiers.map(tier => {
    const viewerCount = state.viewers.filter(v => v.tier_id === tier.id).length;
    const conditions  = [];
    if (tier.min_donation   > 0) conditions.push(`<span class="tier-cond-item"><span class="tier-cond-icon">💵</span>Min. Rp ${Number(tier.min_donation).toLocaleString('id-ID')}</span>`);
    if (tier.min_rc_sessions > 0) conditions.push(`<span class="tier-cond-item"><span class="tier-cond-icon">🎮</span>Min. ${tier.min_rc_sessions}x sewa RC</span>`);
    if (!conditions.length)       conditions.push('<span class="tier-cond-item" style="color:var(--yellow)">⚠ Hanya assign manual</span>');

    return `<div class="tier-card">
      <div class="tier-color-bar" style="background:${tier.color_hex}"></div>
      <div class="tier-info">
        <div class="tier-name-row">
          <span class="tier-display-name">${esc(tier.display_name)}</span>
          <span class="tier-id-chip">${esc(tier.id)}</span>
        </div>
        <div class="tier-conditions">${conditions.join('')}</div>
      </div>
      <div class="tier-stats">
        <div class="tier-stat">
          <div class="tier-stat-val">${viewerCount}</div>
          <div class="tier-stat-label">Viewer</div>
        </div>
        <div class="tier-stat">
          <div class="tier-stat-val">${tier.priority}</div>
          <div class="tier-stat-label">Prioritas</div>
        </div>
      </div>
      <div class="tier-actions">
        <button class="btn btn-secondary btn-sm" onclick="openAssignAvatars('${esc(tier.id)}')">🎭 Avatar</button>
        <button class="btn btn-ghost btn-sm" onclick="openEditTier('${esc(tier.id)}')">Edit</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="deleteTier('${esc(tier.id)}', '${esc(tier.display_name)}')">Hapus</button>
      </div>
    </div>`;
  }).join('');
}

function openEditTier(tierId) {
  const tier = state.tiers.find(t => t.id === tierId);
  if (!tier) return;
  state.editingTierId = tierId;
  document.getElementById('tier-form-title').textContent = `Edit Tier: ${tier.display_name}`;
  document.getElementById('tier-id-input').value       = tier.id;
  document.getElementById('tier-id-input').disabled    = true;
  document.getElementById('tier-name-input').value     = tier.display_name;
  document.getElementById('tier-color-input').value    = tier.color_hex;
  document.getElementById('tier-color-picker').value   = tier.color_hex;
  document.getElementById('tier-min-don').value        = tier.min_donation;
  document.getElementById('tier-min-rc').value         = tier.min_rc_sessions;
  document.getElementById('tier-priority').value       = tier.priority;
  document.getElementById('tier-allow-manual').checked = !!tier.allow_manual;
  openModal('modal-tier-form');
}

async function submitTierForm() {
  const id          = document.getElementById('tier-id-input').value.trim();
  const displayName = document.getElementById('tier-name-input').value.trim();
  const colorHex    = document.getElementById('tier-color-input').value.trim() || '#7c3aed';
  const minDon      = parseInt(document.getElementById('tier-min-don').value) || 0;
  const minRc       = parseInt(document.getElementById('tier-min-rc').value) || 0;
  const priority    = parseInt(document.getElementById('tier-priority').value) || 0;
  const allowManual = document.getElementById('tier-allow-manual').checked ? 1 : 0;

  if (!displayName) { toast('Nama tier wajib diisi', 'err'); return; }
  if (!state.editingTierId && !id) { toast('ID tier wajib diisi', 'err'); return; }

  const payload = { display_name: displayName, color_hex: colorHex, min_donation: minDon, min_rc_sessions: minRc, priority, allow_manual: allowManual };
  const isEdit  = !!state.editingTierId;

  if (!isEdit) payload.id = id;

  try {
    const res = await apiFetch(
      isEdit ? `/admin/tiers/${state.editingTierId}` : '/admin/tiers',
      { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(payload) }
    );
    const data = await res.json();
    if (data.success) {
      toast(isEdit ? 'Tier diperbarui!' : 'Tier dibuat!', 'ok');
      closeModal('modal-tier-form');
      loadTiers();
    } else {
      toast(data.error || 'Gagal menyimpan tier', 'err');
    }
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

async function deleteTier(id, name) {
  if (!confirm(`Hapus tier "${name}"? Viewer di tier ini tidak akan otomatis pindah.`)) return;
  try {
    const res  = await apiFetch(`/admin/tiers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { toast('Tier dihapus.', 'ok'); loadTiers(); loadViewers(); }
    else toast(data.error || 'Gagal menghapus tier', 'err');
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

async function openAssignAvatars(tierId) {
  state.assignTierId = tierId;
  const tier = state.tiers.find(t => t.id === tierId);
  document.getElementById('assign-tier-label').textContent = tier?.display_name || tierId;

  // Load current assignments for this tier
  let assigned = new Set();
  try {
    const res  = await apiFetch(`/admin/tiers/${tierId}`);
    const data = await res.json();
    assigned = new Set((data.avatars || []).map(a => a.id || a.avatar_id));
  } catch (e) {}

  state.tierAvatarAssignments[tierId] = assigned;

  const container = document.getElementById('avatar-checklist');
  if (!state.avatars.length) {
    container.innerHTML = '<div class="log-empty">Belum ada avatar. Scan folder dulu di tab Avatar Manager.</div>';
  } else {
    container.innerHTML = state.avatars.map(av => {
      const checked = assigned.has(av.id) ? 'checked' : '';
      return `<label class="avatar-check-item ${checked ? 'checked' : ''}" data-avatar-id="${esc(av.id)}">
        <input type="checkbox" value="${esc(av.id)}" ${checked} onchange="toggleCheckItem(this)" />
        <div class="avatar-check-name">${esc(av.display_name)}</div>
        <div class="avatar-check-name" style="color:var(--text-muted);font-size:10px">${esc(av.id)}</div>
      </label>`;
    }).join('');
  }

  openModal('modal-assign-avatars');
}

function toggleCheckItem(checkbox) {
  const label = checkbox.closest('.avatar-check-item');
  label.classList.toggle('checked', checkbox.checked);
}

async function submitAssignAvatars() {
  const tierId     = state.assignTierId;
  const checkboxes = document.querySelectorAll('#avatar-checklist input[type="checkbox"]');
  const selected   = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
  const deselected = Array.from(checkboxes).filter(c => !c.checked).map(c => c.value);

  try {
    // Add selected
    await Promise.all(selected.map(avId =>
      apiFetch(`/admin/tiers/${tierId}/avatars`, {
        method: 'POST', body: JSON.stringify({ avatar_id: avId })
      })
    ));
    // Remove deselected
    await Promise.all(deselected.map(avId =>
      apiFetch(`/admin/tiers/${tierId}/avatars/${avId}`, { method: 'DELETE' })
    ));
    toast('Assign avatar disimpan!', 'ok');
    closeModal('modal-assign-avatars');
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

function populateTierFilter() {
  const sel = document.getElementById('viewer-filter-tier');
  const cur = sel.value;
  sel.innerHTML = '<option value="">Semua Tier</option>' +
    state.tiers.map(t => `<option value="${esc(t.id)}" ${t.id === cur ? 'selected' : ''}>${esc(t.display_name)}</option>`).join('');
}

function populateTierSelect(selectId, currentVal = '') {
  const sel = document.getElementById(selectId);
  sel.innerHTML = state.tiers.length
    ? state.tiers.map(t => `<option value="${esc(t.id)}" ${t.id === currentVal ? 'selected' : ''}>${esc(t.display_name)}</option>`).join('')
    : '<option value="">Belum ada tier</option>';
}

// ══════════════════════════════════════════════
// AVATARS
// ══════════════════════════════════════════════

function initAvatarsTab() {
  document.getElementById('btn-scan-avatars').addEventListener('click', scanAvatars);
  document.getElementById('show-disabled-avatars').addEventListener('change', renderAvatarGrid);
  document.getElementById('btn-confirm-edit-avatar').addEventListener('click', submitEditAvatar);
}

async function loadAvatars() {
  try {
    const res  = await apiFetch('/admin/avatars');
    const data = await res.json();
    state.avatars = data.avatars || data || [];
    renderAvatarGrid();
  } catch (e) { console.error('loadAvatars:', e); }
}

async function scanAvatars() {
  const btn = document.getElementById('btn-scan-avatars');
  btn.disabled = true; btn.textContent = '⏳ Scanning…';
  try {
    const res  = await apiFetch('/admin/avatars/sync', { method: 'POST' });
    const data = await res.json();
    toast(`Scan selesai. ${data.added || 0} avatar baru ditemukan.`, 'ok');
    loadAvatars();
  } catch (e) {
    toast('Scan gagal: ' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '🔄 Scan Folder';
  }
}

function renderAvatarGrid() {
  const showDisabled = document.getElementById('show-disabled-avatars').checked;
  const grid = document.getElementById('avatar-grid');
  let avatars = state.avatars;
  if (!showDisabled) avatars = avatars.filter(a => a.is_enabled);

  if (!avatars.length) {
    grid.innerHTML = '<div class="list-empty">Belum ada avatar. Klik "Scan Folder" untuk memuat dari folder avatars/</div>';
    return;
  }

  grid.innerHTML = avatars.map(av => {
    const spriteW = (av.frame_count || 4) * (av.frame_width || 32);
    const displayW = (av.frame_width  || 32) * 2;
    const displayH = (av.frame_height || 48) * 2;

    return `<div class="avatar-card ${av.is_enabled ? '' : 'disabled'}">
      <div class="avatar-preview-box" style="width:${displayW}px;height:${displayH}px">
        <div class="avatar-sprite-preview" style="
          width:${displayW}px;
          height:${displayH}px;
          background-image:url('/avatars/${esc(av.id)}');
          background-size:${spriteW * 2}px ${displayH}px;
          background-repeat:no-repeat;
          animation:walk-preview 0.5s steps(${av.frame_count || 4}) infinite;
        "></div>
      </div>
      <div class="avatar-card-name">${esc(av.display_name)}</div>
      <div class="avatar-card-id">${esc(av.id)}</div>
      <div class="avatar-card-meta">${av.frame_count || 4} frame · ${av.frame_width || 32}×${av.frame_height || 48}px</div>
      <div class="avatar-card-actions">
        <button class="btn btn-ghost btn-xs" onclick="openEditAvatar('${esc(av.id)}')">Edit</button>
        <button class="btn btn-ghost btn-xs" onclick="toggleAvatar('${esc(av.id)}',${av.is_enabled})">
          ${av.is_enabled ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </div>
    </div>`;
  }).join('');
}

function openEditAvatar(avatarId) {
  const av = state.avatars.find(a => a.id === avatarId);
  if (!av) return;
  state.editingAvatarId = avatarId;
  document.getElementById('edit-avatar-id-label').textContent = avatarId;
  document.getElementById('edit-avatar-name').value    = av.display_name;
  document.getElementById('edit-avatar-frames').value  = av.frame_count || 4;
  document.getElementById('edit-avatar-width').value   = av.frame_width || 32;
  document.getElementById('edit-avatar-height').value  = av.frame_height || 48;
  openModal('modal-edit-avatar');
}

async function submitEditAvatar() {
  const id = state.editingAvatarId;
  const payload = {
    display_name: document.getElementById('edit-avatar-name').value.trim(),
    frame_count:  parseInt(document.getElementById('edit-avatar-frames').value) || 4,
    frame_width:  parseInt(document.getElementById('edit-avatar-width').value) || 32,
    frame_height: parseInt(document.getElementById('edit-avatar-height').value) || 48,
  };
  try {
    const res  = await apiFetch(`/admin/avatars/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    const data = await res.json();
    if (data.success) { toast('Avatar diperbarui!', 'ok'); closeModal('modal-edit-avatar'); loadAvatars(); }
    else toast(data.error || 'Gagal', 'err');
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

async function toggleAvatar(id, current) {
  try {
    const res  = await apiFetch(`/admin/avatars/${id}/toggle`, { method: 'POST' });
    const data = await res.json();
    if (data.success) { toast(current ? 'Avatar dinonaktifkan' : 'Avatar diaktifkan', 'ok'); loadAvatars(); }
  } catch (e) { toast('Error: ' + e.message, 'err'); }
}

// Add keyframe for avatar preview animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes walk-preview {
    from { background-position-x: 0; }
    to   { background-position-x: -100%; }
  }
`;
document.head.appendChild(styleSheet);

// ══════════════════════════════════════════════
// EVENTS (Manual Input)
// ══════════════════════════════════════════════

function initEventsTab() {
  document.getElementById('btn-submit-donation').addEventListener('click', submitDonation);
  document.getElementById('btn-submit-rc').addEventListener('click', submitRcSession);
  document.getElementById('btn-refresh-log').addEventListener('click', loadDonorLog);
}

async function submitDonation() {
  const name     = document.getElementById('don-name').value.trim();
  const amount   = parseInt(document.getElementById('don-amount').value) || 0;
  const platform = document.getElementById('don-platform').value;
  const note     = document.getElementById('don-note').value.trim();
  const fb       = document.getElementById('don-feedback');

  if (!name)    { setFeedback(fb, 'Nama YouTube wajib diisi', true); return; }
  if (amount <= 0) { setFeedback(fb, 'Nominal harus lebih dari 0', true); return; }

  try {
    // First ensure viewer exists or find by name
    const res = await apiFetch('/admin/viewers', {
      method: 'GET',
    });
    const viewers = (await res.json()).viewers || [];
    let viewer = viewers.find(v => v.youtube_name.toLowerCase() === name.toLowerCase());

    if (!viewer) {
      // Tambah viewer dulu tanpa tier
      await apiFetch('/admin/viewers', {
        method: 'POST',
        body: JSON.stringify({ youtube_name: name, tier_id: null }),
      });
      const viewers2 = ((await (await apiFetch('/admin/viewers')).json()).viewers) || [];
      viewer = viewers2.find(v => v.youtube_name.toLowerCase() === name.toLowerCase());
    }

    if (!viewer) { setFeedback(fb, 'Gagal menemukan/membuat viewer', true); return; }

    const donRes = await apiFetch(`/admin/viewers/${viewer.id}/donation`, {
      method: 'POST',
      body: JSON.stringify({ amount, platform, meta: note ? { note } : {} }),
    });
    const donData = await donRes.json();
    if (donData.success) {
      setFeedback(fb, `✓ Donasi Rp ${amount.toLocaleString('id-ID')} dari ${name} disimpan!${donData.new_tier ? ` Tier baru: ${donData.new_tier}` : ''}`, false);
      document.getElementById('don-name').value   = '';
      document.getElementById('don-amount').value  = '';
      document.getElementById('don-note').value    = '';
      loadViewers(); loadDonorLog();
    } else {
      setFeedback(fb, donData.error || 'Gagal menyimpan donasi', true);
    }
  } catch (e) { setFeedback(fb, 'Error: ' + e.message, true); }
}

async function submitRcSession() {
  const name      = document.getElementById('rc-name').value.trim();
  const rcId      = document.getElementById('rc-id').value.trim();
  const duration  = parseInt(document.getElementById('rc-duration').value) || 0;
  const sessionId = document.getElementById('rc-session-id').value.trim() || `manual_${Date.now()}`;
  const fb        = document.getElementById('rc-feedback');

  if (!name)  { setFeedback(fb, 'Nama YouTube wajib diisi', true); return; }
  if (!rcId)  { setFeedback(fb, 'RC ID wajib diisi', true); return; }

  try {
    const res = await apiFetch('/admin/viewers');
    const viewers = (await res.json()).viewers || [];
    let viewer = viewers.find(v => v.youtube_name.toLowerCase() === name.toLowerCase());

    if (!viewer) {
      await apiFetch('/admin/viewers', {
        method: 'POST',
        body: JSON.stringify({ youtube_name: name, tier_id: null }),
      });
      const v2 = ((await (await apiFetch('/admin/viewers')).json()).viewers) || [];
      viewer = v2.find(v => v.youtube_name.toLowerCase() === name.toLowerCase());
    }

    if (!viewer) { setFeedback(fb, 'Gagal menemukan/membuat viewer', true); return; }

    const rcRes = await apiFetch(`/admin/viewers/${viewer.id}/rc-session`, {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, rc_id: rcId, duration_sec: duration }),
    });
    const rcData = await rcRes.json();
    if (rcData.success) {
      setFeedback(fb, `✓ Sesi RC "${rcId}" untuk ${name} disimpan!${rcData.new_tier ? ` Tier baru: ${rcData.new_tier}` : ''}`, false);
      document.getElementById('rc-name').value       = '';
      document.getElementById('rc-id').value          = '';
      document.getElementById('rc-duration').value    = '';
      document.getElementById('rc-session-id').value  = '';
      loadViewers(); loadDonorLog();
    } else {
      setFeedback(fb, rcData.error || 'Gagal menyimpan sesi RC', true);
    }
  } catch (e) { setFeedback(fb, 'Error: ' + e.message, true); }
}

async function loadDonorLog() {
  try {
    const res  = await apiFetch('/admin/donor-log?limit=30');
    const data = await res.json();
    const logs = data.logs || data || [];
    renderEventLog(logs);
  } catch (e) {}
}

function renderEventLog(logs) {
  const box = document.getElementById('event-log-box');
  if (!logs.length) {
    box.innerHTML = '<div class="log-empty">Belum ada event tercatat.</div>';
    return;
  }
  box.innerHTML = logs.map(log => {
    const time   = new Date(log.created_at).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    const detail = log.event_type === 'donation'
      ? `${log.youtube_name} — Rp ${Number(log.amount || 0).toLocaleString('id-ID')} via ${log.platform || '?'}`
      : log.event_type === 'rc_session'
        ? `${log.youtube_name} — Sesi RC (${log.platform || '?'})`
        : `${log.youtube_name} — manual`;
    const tierChange = log.tier_after && log.tier_after !== log.tier_before
      ? ` → <span style="color:var(--accent-light)">${log.tier_after}</span>`
      : '';

    return `<div class="event-entry">
      <span class="event-time">${time}</span>
      <span class="event-type ${log.event_type}">${log.event_type}</span>
      <span class="event-detail">${esc(detail)}${tierChange}</span>
    </div>`;
  }).join('');
}

// ─── Helpers ──────────────────────────────────
function setFeedback(el, msg, isErr) {
  el.textContent = msg;
  el.className = `form-feedback ${isErr ? 'err' : 'ok'}`;
  if (!isErr) setTimeout(() => { el.textContent = ''; el.className = 'form-feedback'; }, 5000);
}

function apiFetch(path, options = {}) {
  return fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toast(msg, type = 'info') {
  const icons = { ok: '✓', err: '✗', info: 'ℹ' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── Modals ───────────────────────────────────
function initModals() {
  document.querySelectorAll('.modal-close, [data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.close || btn.closest('.modal-overlay')?.id;
      if (id) closeModal(id);
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
