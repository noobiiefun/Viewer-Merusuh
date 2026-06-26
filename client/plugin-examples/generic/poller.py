"""
Viewer Merusuh — Generic Python Plugin
──────────────────────────────────────
Template polling plugin untuk game yang mendukung Python scripting.
Cocok untuk: modding framework custom, atau sebagai standalone bridge.

Cara pakai:
  1. Install requests: pip install requests
  2. Jalankan: python plugin-examples/generic/poller.py
  3. Tambahkan action handler sesuai game target

Port default: 3001 (sesuaikan PLUGIN_LOCAL_PORT di .env client)
"""

import requests
import time
import logging

logging.basicConfig(level=logging.INFO, format='[VM-Plugin] %(levelname)s %(message)s')
log = logging.getLogger(__name__)

BASE_URL      = "http://127.0.0.1:3001"
POLL_INTERVAL = 2.0   # detik
TOKEN         = ""    # isi jika PLUGIN_TOKEN diset di .env

HEADERS = {}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

# ── Action Handlers ──────────────────────────────────────────────────────────

def handle_test_action(params: dict):
    log.info(f"  test_action dipanggil! params={params}")

def handle_print_message(params: dict):
    msg = params.get("message", "Hello from Viewer Merusuh!")
    log.info(f"  PESAN: {msg}")

def handle_wait(params: dict):
    dur = float(params.get("seconds", 1.0))
    log.info(f"  Menunggu {dur} detik...")
    time.sleep(dur)

# ── Daftarkan handler di sini ────────────────────────────────────────────────
HANDLERS = {
    "test_action":    handle_test_action,
    "print_message":  handle_print_message,
    "wait":           handle_wait,

    # Tambahkan handler game spesifik di sini:
    # "flip_car":     handle_flip_car,
    # "spawn_enemy":  handle_spawn_enemy,
}

# ── Core ─────────────────────────────────────────────────────────────────────

def poll() -> list:
    try:
        res = requests.get(f"{BASE_URL}/api/plugin/pending", headers=HEADERS, timeout=3)
        res.raise_for_status()
        return res.json().get("effects", [])
    except requests.exceptions.ConnectionError:
        log.warning("Tidak bisa konek ke client. Pastikan client berjalan (npm start).")
        return []
    except Exception as e:
        log.error(f"Poll error: {e}")
        return []

def complete(effect_id: str):
    try:
        requests.post(f"{BASE_URL}/api/plugin/complete/{effect_id}", headers=HEADERS, timeout=3)
    except Exception as e:
        log.warning(f"Complete error untuk {effect_id}: {e}")

def dispatch(effect: dict):
    action = effect.get("action", "")
    params = effect.get("params", {})
    eid    = effect.get("id", "?")

    handler = HANDLERS.get(action)
    if handler:
        try:
            handler(params)
            log.info(f"✓ Efek selesai: {action} (id={eid})")
        except Exception as e:
            log.error(f"Error di handler '{action}': {e}")
    else:
        log.warning(f"Action tidak dikenal: '{action}'. Daftar handler: {list(HANDLERS.keys())}")

    complete(eid)

def main():
    log.info(f"Viewer Merusuh Python Plugin — polling ke {BASE_URL}")
    log.info(f"Poll interval: {POLL_INTERVAL}s | Token: {'aktif' if TOKEN else 'nonaktif'}")
    log.info("Tekan Ctrl+C untuk berhenti.\n")

    while True:
        effects = poll()
        if effects:
            log.info(f"{len(effects)} efek diterima:")
            for eff in effects:
                dispatch(eff)
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Plugin berhenti.")
