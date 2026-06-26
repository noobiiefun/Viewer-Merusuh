--[[
  Viewer Merusuh — BeamNG.drive Plugin
  ─────────────────────────────────────
  Polling efek dari Viewer Merusuh Client dan mengeksekusinya di BeamNG.

  Cara pasang:
    1. Salin folder ini ke: Documents/BeamNG.drive/mods/viewer_merusuh/lua/ge/extensions/
    2. Rename file ini menjadi: viewer_merusuh.lua
    3. Di BeamNG: Main Menu → Mods → aktifkan viewer_merusuh
    4. Saat di dalam game: Ctrl+L → ketik "viewer_merusuh.init()" untuk aktifkan

  Port default: 3001 (sesuaikan dengan PLUGIN_LOCAL_PORT di .env client)

  Referensi BeamNG Lua API:
    https://documentation.beamng.com/modding/lua/ge_lua/
]]

local M = {}

local BASE_URL      = "http://127.0.0.1:3001"
local POLL_INTERVAL = 2.0   -- detik
local timer         = 0
local running       = false

-- ── HTTP Helper ───────────────────────────────────────────────────────────

local function httpGet(url, callback)
  -- BeamNG menggunakan async HTTP
  Engine.asyncHttpGet(url, function(result, status)
    if status == 200 then
      callback(result)
    else
      log('W', 'viewer_merusuh', 'HTTP error ' .. tostring(status))
    end
  end)
end

local function httpPost(url)
  -- POST kosong untuk konfirmasi
  Engine.asyncHttpPost(url, '', function() end)
end

-- ── Action Handlers ───────────────────────────────────────────────────────

local handlers = {}

-- Reset kendaraan (flip/repair)
handlers["reset_vehicle"] = function(params)
  local mode = params and params.mode or "flip"
  if mode == "flip" then
    be:getObjectByID(be:getPlayerVehicleID(0)):resetBrokenRefNodes()
    be:getObjectByID(be:getPlayerVehicleID(0)):reset()
  elseif mode == "repair" then
    be:getObjectByID(be:getPlayerVehicleID(0)):resetBrokenRefNodes()
  end
end

-- Tambahkan gaya/force ke kendaraan
handlers["apply_force"] = function(params)
  local veh = be:getObjectByID(be:getPlayerVehicleID(0))
  if not veh then return end
  local x = params and params.x or 0
  local y = params and params.y or 0
  local z = params and params.z or 50000
  veh:applyWorldForce(x, y, z)
end

-- Lempar kendaraan ke atas
handlers["launch_vehicle"] = function(params)
  handlers["apply_force"]({ x = 0, y = 0, z = params and params.force or 100000 })
end

-- Set kecepatan kendaraan
handlers["set_speed"] = function(params)
  local veh = be:getObjectByID(be:getPlayerVehicleID(0))
  if not veh then return end
  local speed = params and params.speed or 50  -- m/s
  -- BeamNG: set velocity via Lua vehicle controller
  veh:queueLuaCommand(string.format(
    "electrics.values.wheelspeed = %f; input.event('throttle', 1.0, 'FILTER_DIRECT')", speed
  ))
end

-- Ganti cuaca
handlers["change_weather"] = function(params)
  local preset = params and params.preset or "rainy"
  -- BeamNG weather system
  core_weather.switchWeather(preset, 0.5)
end

-- Tambahkan kerusakan acak
handlers["random_damage"] = function(params)
  local veh = be:getObjectByID(be:getPlayerVehicleID(0))
  if not veh then return end
  local intensity = params and params.intensity or 500
  veh:queueLuaCommand(string.format(
    "beamstate.damageRandom(%d)", intensity
  ))
end

-- Nonaktifkan rem sementara (durasi dikontrol server)
handlers["disable_brakes"] = function(params)
  local veh = be:getObjectByID(be:getPlayerVehicleID(0))
  if not veh then return end
  local dur = params and params.duration_ms or 3000
  veh:queueLuaCommand("input.event('brake', 0, 'FILTER_DIRECT')")
  -- Re-enable setelah durasi
  extensions.hook("onUpdate") -- handled via timer di game
end

-- Teleport ke titik random di map
handlers["random_teleport"] = function(params)
  local veh = be:getObjectByID(be:getPlayerVehicleID(0))
  if not veh then return end
  -- Koordinat acak di tengah map (tergantung map aktif)
  local offsets = { {50,50,5}, {-50,30,5}, {100,-20,5}, {-80,80,5} }
  local pos = veh:getPosition()
  local off = offsets[math.random(#offsets)]
  veh:setPosition(vec3(pos.x + off[1], pos.y + off[2], pos.z + off[3]))
end

-- ── Dispatcher ────────────────────────────────────────────────────────────

local function dispatch(effect)
  local handler = handlers[effect.action]
  if handler then
    local ok, err = xpcall(function() handler(effect.params) end, debug.traceback)
    if ok then
      log('I', 'viewer_merusuh', '✓ Efek: ' .. effect.action)
    else
      log('E', 'viewer_merusuh', 'Error: ' .. tostring(err))
    end
  else
    log('W', 'viewer_merusuh', 'Action tidak dikenal: ' .. tostring(effect.action))
  end
  httpPost(BASE_URL .. "/api/plugin/complete/" .. effect.id)
end

local function poll()
  httpGet(BASE_URL .. "/api/plugin/pending", function(raw)
    local ok, data = xpcall(function() return jsonDecode(raw) end, debug.traceback)
    if not ok or not data or not data.effects then return end
    for _, effect in ipairs(data.effects) do
      dispatch(effect)
    end
  end)
end

-- ── Extension Interface ───────────────────────────────────────────────────

function M.init()
  running = true
  log('I', 'viewer_merusuh', 'Viewer Merusuh Plugin aktif! Polling ke ' .. BASE_URL)
end

function M.stop()
  running = false
  log('I', 'viewer_merusuh', 'Viewer Merusuh Plugin nonaktif.')
end

function M.onUpdate(dt)
  if not running then return end
  timer = timer + dt
  if timer >= POLL_INTERVAL then
    timer = 0
    poll()
  end
end

return M
