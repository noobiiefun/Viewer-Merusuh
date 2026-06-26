--[[
  Viewer Merusuh — GTA5 Plugin (ScriptHookV + Lua via LuaPlugin)
  ──────────────────────────────────────────────────────────────
  Polling efek dari Viewer Merusuh Client (plugin adapter)
  dan mengeksekusinya di dalam game GTA5.

  Requirement:
    - ScriptHookV          : http://www.dev-c.com/gtav/scripthookv/
    - LuaPlugin for SHVDN  : https://github.com/Silverlan/gtalua
      ATAU gunakan standalone Lua executor lain yang support ScriptHookV

  Cara pasang:
    1. Salin file ini ke folder scripts/ di LuaPlugin
    2. Pastikan Viewer Merusuh Client berjalan (npm start)
    3. Pastikan ADAPTER_PLUGIN=true di .env client
    4. Load GTA5 — efek otomatis berjalan saat ada donasi

  Port default: 3001 (sesuaikan dengan PLUGIN_LOCAL_PORT di .env)
]]

local BASE_URL   = "http://127.0.0.1:3001"
local POLL_INTERVAL = 2000  -- poll tiap 2 detik (ms)
local lastPoll   = 0

-- ── HTTP Helper (butuh library json + http di LuaPlugin) ──────────────────

local function httpGet(url)
  -- Implementasi HTTP GET bergantung pada LuaPlugin yang digunakan.
  -- Ganti bagian ini sesuai library yang tersedia.
  -- Contoh placeholder:
  return nil
end

local function httpPost(url)
  return nil
end

-- ── Action Handlers ───────────────────────────────────────────────────────

local handlers = {}

-- Balik kendaraan pemain
handlers["flip_car"] = function(params)
  local vehicle = GET_VEHICLE_PED_IS_IN(PLAYER_PED_ID(), false)
  if vehicle ~= 0 then
    local heading = GET_ENTITY_HEADING(vehicle)
    SET_ENTITY_ROTATION(vehicle, 0, 0, heading, 2, true)
    APPLY_FORCE_TO_ENTITY(vehicle, 1, 0, 0, 5.0, 0, 0, 0, false, true, true, false, false, true)
  end
end

-- Spawn polisi
handlers["spawn_cops"] = function(params)
  local level = params and params.wanted_level or 2
  SET_PLAYER_WANTED_LEVEL(PlayerId(), level, false)
  SET_PLAYER_WANTED_LEVEL_NOW(PlayerId(), false)
end

-- Hilangkan wanted level
handlers["clear_wanted"] = function(params)
  SET_PLAYER_WANTED_LEVEL(PlayerId(), 0, false)
  SET_PLAYER_WANTED_LEVEL_NOW(PlayerId(), false)
end

-- Ganti cuaca
handlers["change_weather"] = function(params)
  local weather = params and params.weather or "RAIN"
  SET_WEATHER_TYPE_NOW(string.upper(weather))
end

-- Teleport ke lokasi random
handlers["random_teleport"] = function(params)
  local coords = {
    { x=-259.0, y=-955.0,  z=31.0  },  -- Pusat kota
    { x=407.0,  y=-981.0,  z=30.0  },  -- Pelabuhan
    { x=-1037.0,y=-2733.0, z=13.0  },  -- Pantai
    { x=1694.0, y=4925.0,  z=42.0  },  -- Utara peta
    { x=-3000.0,y=600.0,   z=7.0   },  -- Barat peta
  }
  local c = coords[math.random(#coords)]
  SET_ENTITY_COORDS(PLAYER_PED_ID(), c.x, c.y, c.z, false, false, false, true)
end

-- Ledakan di posisi pemain
handlers["explosion"] = function(params)
  local ped = PLAYER_PED_ID()
  local coords = GET_ENTITY_COORDS(ped, true)
  local radius  = params and params.radius or 5.0
  ADD_EXPLOSION(coords.x, coords.y, coords.z, 0, radius, true, false, 0.0)
end

-- Matikan engine kendaraan
handlers["kill_engine"] = function(params)
  local vehicle = GET_VEHICLE_PED_IS_IN(PLAYER_PED_ID(), false)
  if vehicle ~= 0 then
    SET_VEHICLE_ENGINE_ON(vehicle, false, true, false)
  end
end

-- Maksimalkan kecepatan (turbo)
handlers["max_speed"] = function(params)
  local vehicle = GET_VEHICLE_PED_IS_IN(PLAYER_PED_ID(), false)
  if vehicle ~= 0 then
    local speed = params and params.speed or 50.0
    SET_VEHICLE_FORWARD_SPEED(vehicle, speed)
  end
end

-- Repair kendaraan
handlers["repair_vehicle"] = function(params)
  local vehicle = GET_VEHICLE_PED_IS_IN(PLAYER_PED_ID(), false)
  if vehicle ~= 0 then
    SET_VEHICLE_FIXED(vehicle)
    SET_VEHICLE_DEFORMATION_FIXED(vehicle)
  end
end

-- Tambah / kurangi HP
handlers["set_health"] = function(params)
  local ped = PLAYER_PED_ID()
  local hp  = params and params.health or 100
  SET_ENTITY_HEALTH(ped, math.min(200, math.max(100, hp)), 0)
end

-- ── Dispatcher ────────────────────────────────────────────────────────────

local function dispatch(effect)
  local handler = handlers[effect.action]
  if handler then
    local ok, err = pcall(handler, effect.params)
    if ok then
      print("[VM-Plugin] ✓ Efek dieksekusi: " .. effect.action)
    else
      print("[VM-Plugin] Error di handler " .. effect.action .. ": " .. tostring(err))
    end
  else
    print("[VM-Plugin] Action tidak dikenal: " .. tostring(effect.action))
  end
  -- Konfirmasi ke client
  httpPost(BASE_URL .. "/api/plugin/complete/" .. effect.id)
end

-- ── Main Loop ─────────────────────────────────────────────────────────────

function tick()
  local now = GetGameTimer()
  if now - lastPoll < POLL_INTERVAL then return end
  lastPoll = now

  local raw = httpGet(BASE_URL .. "/api/plugin/pending")
  if not raw then return end

  local ok, data = pcall(json.decode, raw)
  if not ok or not data or not data.effects then return end

  for _, effect in ipairs(data.effects) do
    dispatch(effect)
    Wait(100) -- sedikit delay antar efek
  end
end

-- Register tick
AddEventHandler('onClientResourceStart', function(resourceName)
  if GetCurrentResourceName() ~= resourceName then return end
  print("[VM-Plugin] Viewer Merusuh GTA5 Plugin aktif!")
  print("[VM-Plugin] Polling ke " .. BASE_URL)
end)

Citizen.CreateThread(function()
  while true do
    tick()
    Citizen.Wait(POLL_INTERVAL)
  end
end)
