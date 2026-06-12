-- plugins/beamng/viewermerusuh/main.lua
-- Viewer Merusuh — BeamNG.drive Lua Plugin
--
-- INSTALASI:
--   Copy folder "viewermerusuh" ke:
--   Documents/BeamNG.drive/mods/unpacked/viewermerusuh/lua/ge/extensions/
--   Lalu aktifkan via Extensions menu di BeamNG
--
-- CARA KERJA:
--   Plugin polling server VM tiap beberapa detik
--   Saat ada efek masuk → eksekusi via BeamNG API
--   Lapor selesai ke server

local M = {}

-- ── Konfigurasi ──────────────────────────────────────────────────────
local SERVER_URL    = "http://localhost:3000"
local GAME_ID       = "beamng"
local PLUGIN_SECRET = ""          -- isi jika set di .env server
local POLL_INTERVAL = 3           -- detik
-- ─────────────────────────────────────────────────────────────────────

local isConnected   = false
local pollTimer     = 0
local effectQueue   = {}
local isProcessing  = false

-- ── Helper: HTTP GET ─────────────────────────────────────────────────
local function httpGet(url, callback)
  local headers = {}
  if PLUGIN_SECRET ~= "" then
    headers["X-Plugin-Secret"] = PLUGIN_SECRET
  end
  Engine.net.httpGet(url, headers, function(result)
    if result and result.status == 200 then
      callback(true, result.body)
    else
      callback(false, nil)
    end
  end)
end

-- ── Helper: HTTP POST ────────────────────────────────────────────────
local function httpPost(url, body, callback)
  local headers = {
    ["Content-Type"] = "application/json",
  }
  if PLUGIN_SECRET ~= "" then
    headers["X-Plugin-Secret"] = PLUGIN_SECRET
  end
  Engine.net.httpPost(url, headers, body, function(result)
    if callback then callback(result and result.status == 200) end
  end)
end

-- ── Helper: JSON decode sederhana ─────────────────────────────────────
local function decodeJson(str)
  local ok, data = pcall(jsonDecode, str)
  if ok then return data end
  return nil
end

-- ── Tampilkan notifikasi di BeamNG ───────────────────────────────────
local function showNotif(effect)
  local donation = effect.donation or {}
  local msg = string.format(
    "[VM] %s — Rp %s\n⚡ %s",
    donation.donatorName or "Anonymous",
    tostring(donation.amount or 0),
    effect.effectName or effect.actionKey
  )
  guihooks.trigger("toastrMsg", {
    type    = "info",
    title   = "Viewer Merusuh",
    msg     = msg,
    timeout = 4000,
  })
  log("I", "ViewerMerusuh", msg)
end

-- ── Lapor efek selesai ke server ─────────────────────────────────────
local function reportDone(actionKey, success, errorMsg)
  local body = jsonEncode({
    game      = GAME_ID,
    actionKey = actionKey,
    success   = success,
    error     = errorMsg,
  })
  httpPost(SERVER_URL .. "/api/plugin/done", body, nil)
end

-- ══════════════════════════════════════════════════════════════════════
-- IMPLEMENTASI EFEK BEAMNG
-- ══════════════════════════════════════════════════════════════════════

local effectHandlers = {}

-- ── 1. Rem Mendadak ───────────────────────────────────────────────────
effectHandlers["beamng_brake"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  local durationSec = (effect.durationMs or 3000) / 1000

  -- Set brake input ke 1.0 (penuh) selama durationSec
  local endTime = Engine.getTime() + durationSec
  local function applyBrake()
    if Engine.getTime() < endTime then
      vehicle:queueLuaCommand("input.event('brake', 1.0, 'INJECTED')")
      Engine.schedule(0.05, applyBrake)  -- repeat tiap 50ms
    else
      vehicle:queueLuaCommand("input.event('brake', 0, 'INJECTED')")
    end
  end
  applyBrake()
end

-- ── 2. Gas Penuh ─────────────────────────────────────────────────────
effectHandlers["beamng_throttle"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  local durationSec = (effect.durationMs or 3000) / 1000
  local endTime = Engine.getTime() + durationSec

  local function applyThrottle()
    if Engine.getTime() < endTime then
      vehicle:queueLuaCommand("input.event('throttle', 1.0, 'INJECTED')")
      Engine.schedule(0.05, applyThrottle)
    else
      vehicle:queueLuaCommand("input.event('throttle', 0, 'INJECTED')")
    end
  end
  applyThrottle()
end

-- ── 3. Steer Acak ────────────────────────────────────────────────────
effectHandlers["beamng_random_steer"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  local durationSec = (effect.durationMs or 5000) / 1000
  local endTime = Engine.getTime() + durationSec

  local function applySteer()
    if Engine.getTime() < endTime then
      local dir = (math.random() * 2) - 1  -- -1 sampai 1
      vehicle:queueLuaCommand(string.format(
        "input.event('steering', %f, 'INJECTED')", dir
      ))
      Engine.schedule(0.1, applySteer)
    else
      vehicle:queueLuaCommand("input.event('steering', 0, 'INJECTED')")
    end
  end
  applySteer()
end

-- ── 4. Handbrake ─────────────────────────────────────────────────────
effectHandlers["beamng_handbrake"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  local durationSec = (effect.durationMs or 2000) / 1000
  local endTime = Engine.getTime() + durationSec

  local function applyHandbrake()
    if Engine.getTime() < endTime then
      vehicle:queueLuaCommand("input.event('parkingbrake', 1.0, 'INJECTED')")
      Engine.schedule(0.05, applyHandbrake)
    else
      vehicle:queueLuaCommand("input.event('parkingbrake', 0, 'INJECTED')")
    end
  end
  applyHandbrake()
end

-- ── 5. Matikan Mesin ─────────────────────────────────────────────────
effectHandlers["beamng_engine_off"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  local durationSec = (effect.durationMs or 5000) / 1000

  vehicle:queueLuaCommand("controller.mainController.setEngineEnabled(false)")
  Engine.schedule(durationSec, function()
    vehicle:queueLuaCommand("controller.mainController.setEngineEnabled(true)")
  end)
end

-- ── 6. Ledakan Di Sekitar ────────────────────────────────────────────
effectHandlers["beamng_explosion"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  -- Kirim perintah lua ke vehicle untuk spawn explosion
  vehicle:queueLuaCommand([[
    local pos = obj:getPosition()
    local offset = vec3(math.random(-5,5), math.random(-5,5), 1)
    be:addExplosion(pos + offset, 5, 1)
  ]])
end

-- ── 7. Slow Motion ───────────────────────────────────────────────────
effectHandlers["beamng_slow_motion"] = function(effect)
  local durationSec = (effect.durationMs or 5000) / 1000
  Engine.setTimescale(0.3)  -- 30% kecepatan normal
  Engine.schedule(durationSec, function()
    Engine.setTimescale(1.0)
  end)
end

-- ── 8. Reset Kendaraan ───────────────────────────────────────────────
effectHandlers["beamng_vehicle_reset"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  -- Respawn kendaraan di posisi terdekat yang valid
  vehicle:queueLuaCommand("recovery.startRecovering()")
end

-- ── 9. Random Damage ─────────────────────────────────────────────────
effectHandlers["beamng_random_damage"] = function(effect)
  local vehicle = be:getPlayerVehicle(0)
  if not vehicle then return end
  vehicle:queueLuaCommand([[
    local dmg = beamstate.beams
    for i = 1, math.min(50, #dmg) do
      local idx = math.random(#dmg)
      beamstate.beams[idx].damage = math.random(50, 200)
    end
    beamstate:update()
  ]])
end

-- ── 10. Chaos Mode ───────────────────────────────────────────────────
effectHandlers["beamng_chaos"] = function(effect)
  -- Semua efek sekaligus
  local chaosEffect = { durationMs = (effect.durationMs or 10000) / 3 }
  effectHandlers["beamng_random_steer"](chaosEffect)
  effectHandlers["beamng_throttle"](chaosEffect)
  Engine.schedule(1, function()
    effectHandlers["beamng_random_damage"]({ durationMs = 1000 })
    effectHandlers["beamng_slow_motion"]({ durationMs = (effect.durationMs or 10000) })
  end)
end

-- ══════════════════════════════════════════════════════════════════════
-- ENGINE UTAMA
-- ══════════════════════════════════════════════════════════════════════

-- Proses satu efek dari queue
local function processNextEffect()
  if isProcessing or #effectQueue == 0 then return end
  isProcessing = true

  local effect = table.remove(effectQueue, 1)
  showNotif(effect)

  local handler = effectHandlers[effect.actionKey]
  if handler then
    local ok, err = pcall(handler, effect)
    reportDone(effect.actionKey, ok, ok and nil or tostring(err))
  else
    log("W", "ViewerMerusuh", "Action tidak dikenal: " .. (effect.actionKey or "nil"))
    reportDone(effect.actionKey, false, "Action tidak dikenal")
  end

  -- Tunggu durasi + buffer sebelum proses berikutnya
  Engine.schedule((effect.durationMs or 3000) / 1000 + 0.3, function()
    isProcessing = false
    processNextEffect()
  end)
end

-- Poll server untuk efek baru
local function pollServer()
  local url = string.format("%s/api/plugin/pending?game=%s", SERVER_URL, GAME_ID)
  httpGet(url, function(success, body)
    if not success then
      if isConnected then
        isConnected = false
        guihooks.trigger("toastrMsg", {
          type = "error", title = "Viewer Merusuh",
          msg  = "Koneksi ke server terputus", timeout = 3000,
        })
      end
      return
    end

    if not isConnected then
      isConnected = true
      guihooks.trigger("toastrMsg", {
        type = "success", title = "Viewer Merusuh",
        msg  = "Terhubung ke server!", timeout = 3000,
      })
    end

    local data = decodeJson(body)
    if data and data.effects and #data.effects > 0 then
      for _, effect in ipairs(data.effects) do
        table.insert(effectQueue, effect)
      end
      processNextEffect()
    end
  end)
end

-- ── Lifecycle ──────────────────────────────────────────────────────
function M.onInit()
  log("I", "ViewerMerusuh", "Plugin aktif — server: " .. SERVER_URL)
  pollServer()  -- poll langsung saat init
end

function M.onUpdate(dt)
  pollTimer = pollTimer + dt
  if pollTimer >= POLL_INTERVAL then
    pollTimer = 0
    pollServer()
  end
end

function M.onExtensionUnloaded()
  -- Reset timescale saat plugin dinonaktifkan
  Engine.setTimescale(1.0)
  log("I", "ViewerMerusuh", "Plugin dinonaktifkan")
end

return M
