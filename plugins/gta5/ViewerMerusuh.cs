// plugins/gta5/ViewerMerusuh.cs
// Viewer Merusuh — GTA 5 Native Plugin
// Framework: ScriptHookV .NET (SHVDN) v3
//
// INSTALASI:
//   1. Install ScriptHookV: http://www.dev-c.com/gtav/scripthookv/
//   2. Install ScriptHookV .NET: https://github.com/scripthookvdotnet/scripthookvdotnet
//   3. Copy ViewerMerusuh.cs ke folder: Grand Theft Auto V/scripts/
//   4. Jalankan Viewer Merusuh server terlebih dahulu
//   5. Jalankan GTA 5 — plugin otomatis aktif
//
// KONFIGURASI:
//   Edit konstanta SERVER_URL dan GAME_ID di bawah ini

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;
using GTA;
using GTA.Math;
using GTA.Native;
using Newtonsoft.Json;

public class ViewerMerusuh : Script
{
    // ── Konfigurasi ─────────────────────────────────────────────────
    private const string SERVER_URL   = "http://localhost:3000";
    private const string GAME_ID      = "gta5";
    private const string PLUGIN_SECRET = "";         // isi jika set di .env
    private const int    POLL_INTERVAL = 2000;       // ms — seberapa sering cek server
    // ────────────────────────────────────────────────────────────────

    private static readonly HttpClient _http = new HttpClient();
    private bool   _isConnected = false;
    private int    _tickCount   = 0;
    private int    _pollTicks;  // dikonversi dari POLL_INTERVAL ke game ticks (60 ticks/detik)
    private Queue<EffectItem> _effectQueue = new Queue<EffectItem>();

    public ViewerMerusuh()
    {
        _pollTicks = POLL_INTERVAL / 16;  // ~16ms per tick di GTA 5
        if (!string.IsNullOrEmpty(PLUGIN_SECRET))
            _http.DefaultRequestHeaders.Add("X-Plugin-Secret", PLUGIN_SECRET);

        Tick    += OnTick;
        KeyDown += OnKeyDown;

        Notification.Show("~p~Viewer Merusuh~s~ plugin loaded!");
        GTA.UI.Notification.Show("~p~VM~s~ Menghubungkan ke server...");

        // Test koneksi awal
        Task.Run(() => CheckConnection());
    }

    // ── Game loop (tiap frame) ───────────────────────────────────────
    private async void OnTick(object sender, EventArgs e)
    {
        _tickCount++;

        // Proses efek dari queue (satu per tick agar tidak blocking)
        if (_effectQueue.Count > 0)
        {
            var item = _effectQueue.Dequeue();
            await ExecuteEffect(item);
        }

        // Poll server setiap POLL_INTERVAL ms
        if (_tickCount % _pollTicks == 0)
        {
            await PollServer();
            _tickCount = 0;
        }
    }

    private void OnKeyDown(object sender, KeyEventArgs e)
    {
        // F9 = toggle status notifikasi
        if (e.KeyCode == Keys.F9)
        {
            GTA.UI.Notification.Show(_isConnected
                ? $"~p~VM~s~ Terhubung ke {SERVER_URL}"
                : "~r~VM~s~ Tidak terhubung ke server");
        }
    }

    // ── Poll server untuk efek baru ──────────────────────────────────
    private async Task PollServer()
    {
        try
        {
            var url      = $"{SERVER_URL}/api/plugin/pending?game={GAME_ID}";
            var response = await _http.GetStringAsync(url);
            var data     = JsonConvert.DeserializeObject<PendingResponse>(response);

            if (!_isConnected)
            {
                _isConnected = true;
                GTA.UI.Notification.Show("~p~VM~s~ Terhubung ke server!");
            }

            if (data?.effects != null && data.effects.Count > 0)
            {
                foreach (var effect in data.effects)
                    _effectQueue.Enqueue(effect);
            }
        }
        catch (Exception)
        {
            if (_isConnected)
            {
                _isConnected = false;
                GTA.UI.Notification.Show("~r~VM~s~ Koneksi terputus — pastikan server berjalan");
            }
        }
    }

    // ── Eksekusi efek berdasarkan action_key ─────────────────────────
    private async Task ExecuteEffect(EffectItem effect)
    {
        bool success = true;
        string errorMsg = null;

        try
        {
            // Tampilkan notifikasi di game
            ShowEffectNotif(effect);

            switch (effect.actionKey)
            {
                // ── Wanted Level ──────────────────────────────────────
                case "gta5_wanted_up":
                    AddWanted(3);
                    break;

                case "gta5_wanted_max":
                    AddWanted(6);
                    break;

                case "gta5_wanted_clear":
                    Game.Player.WantedLevel = 0;
                    break;

                // ── Ledakan ───────────────────────────────────────────
                case "gta5_explosion":
                    SpawnExplosionNearPlayer(ExplosionType.Grenade, 1);
                    break;

                case "gta5_explosion_rain":
                    await ExplosionRain(effect.durationMs);
                    break;

                // ── Kendaraan ─────────────────────────────────────────
                case "gta5_vehicle_brake":
                    await VehicleBrake(effect.durationMs);
                    break;

                case "gta5_vehicle_boost":
                    await VehicleBoost(effect.durationMs);
                    break;

                case "gta5_vehicle_flip":
                    FlipVehicle();
                    break;

                case "gta5_vehicle_horn":
                    await VehicleHorn(effect.durationMs);
                    break;

                case "gta5_vehicle_engine_off":
                    await VehicleEngineOff(effect.durationMs);
                    break;

                // ── Karakter ──────────────────────────────────────────
                case "gta5_ragdoll":
                    await Ragdoll(effect.durationMs);
                    break;

                case "gta5_super_jump":
                    await SuperJump(effect.durationMs);
                    break;

                case "gta5_drunk":
                    await DrunkEffect(effect.durationMs);
                    break;

                case "gta5_give_weapon":
                    GiveRandomWeapon();
                    break;

                case "gta5_remove_weapon":
                    Game.Player.Character.Weapons.RemoveAll();
                    break;

                // ── Cuaca & Lingkungan ────────────────────────────────
                case "gta5_weather_rain":
                    SetWeather("RAIN", effect.durationMs);
                    break;

                case "gta5_weather_snow":
                    SetWeather("XMAS", effect.durationMs);
                    break;

                case "gta5_weather_thunder":
                    SetWeather("THUNDER", effect.durationMs);
                    break;

                case "gta5_time_night":
                    await SetTimeOfDay(0, effect.durationMs);
                    break;

                // ── NPC Chaos ─────────────────────────────────────────
                case "gta5_npc_attack":
                    await NpcAttack(effect.durationMs);
                    break;

                case "gta5_spawn_cop":
                    SpawnPed(PedHash.Cop01SMY, 5f);
                    break;

                case "gta5_spawn_enemy":
                    SpawnPed(PedHash.ArmBoss01GMM, 8f);
                    break;

                // ── Chaos Mode ────────────────────────────────────────
                case "gta5_chaos_mode":
                    await ChaosMode(effect.durationMs);
                    break;

                default:
                    GTA.UI.Notification.Show($"~y~VM~s~ Action tidak dikenal: {effect.actionKey}");
                    break;
            }
        }
        catch (Exception ex)
        {
            success  = false;
            errorMsg = ex.Message;
        }
        finally
        {
            // Lapor ke server bahwa efek sudah selesai
            await ReportDone(effect.actionKey, success, errorMsg);
        }
    }

    // ══════════════════════════════════════════════════════════════
    // IMPLEMENTASI EFEK
    // ══════════════════════════════════════════════════════════════

    private void AddWanted(int level)
    {
        int current = Game.Player.WantedLevel;
        Game.Player.WantedLevel = Math.Min(6, current + level);
    }

    private void SpawnExplosionNearPlayer(ExplosionType type, int count)
    {
        var pos = Game.Player.Character.Position;
        var rng = new Random();
        for (int i = 0; i < count; i++)
        {
            float dx = (float)(rng.NextDouble() * 10 - 5);
            float dy = (float)(rng.NextDouble() * 10 - 5);
            World.AddExplosion(pos + new Vector3(dx, dy, 0), type, 1.0f, 1.0f);
        }
    }

    private async Task ExplosionRain(int durationMs)
    {
        var end = DateTime.Now.AddMilliseconds(durationMs);
        while (DateTime.Now < end)
        {
            SpawnExplosionNearPlayer(ExplosionType.Grenade, 2);
            await Task.Delay(800);
        }
    }

    private async Task VehicleBrake(int durationMs)
    {
        var vehicle = Game.Player.Character.CurrentVehicle;
        if (vehicle == null) return;

        var end = DateTime.Now.AddMilliseconds(durationMs);
        while (DateTime.Now < end)
        {
            vehicle.Speed = Math.Max(0, vehicle.Speed - 5f);
            Function.Call(Hash.SET_VEHICLE_BRAKE_LIGHTS, vehicle, true);
            await Task.Delay(50);
        }
        Function.Call(Hash.SET_VEHICLE_BRAKE_LIGHTS, vehicle, false);
    }

    private async Task VehicleBoost(int durationMs)
    {
        var vehicle = Game.Player.Character.CurrentVehicle;
        if (vehicle == null) return;

        float origMaxSpeed = vehicle.MaxSpeed;
        vehicle.MaxSpeed = origMaxSpeed * 3f;

        var end = DateTime.Now.AddMilliseconds(durationMs);
        while (DateTime.Now < end)
        {
            vehicle.Speed = vehicle.MaxSpeed;
            await Task.Delay(100);
        }
        vehicle.MaxSpeed = origMaxSpeed;
    }

    private void FlipVehicle()
    {
        var vehicle = Game.Player.Character.CurrentVehicle;
        if (vehicle == null) return;
        var rot = vehicle.Rotation;
        vehicle.Rotation = new Vector3(rot.X + 180f, rot.Y, rot.Z);
    }

    private async Task VehicleHorn(int durationMs)
    {
        var vehicle = Game.Player.Character.CurrentVehicle;
        if (vehicle == null) return;
        var end = DateTime.Now.AddMilliseconds(durationMs);
        while (DateTime.Now < end)
        {
            Function.Call(Hash.START_VEHICLE_HORN, vehicle, 500, Game.GenerateHash("HORN_STANDARD"), false);
            await Task.Delay(600);
        }
    }

    private async Task VehicleEngineOff(int durationMs)
    {
        var vehicle = Game.Player.Character.CurrentVehicle;
        if (vehicle == null) return;
        vehicle.IsEngineRunning = false;
        await Task.Delay(durationMs);
        vehicle.IsEngineRunning = true;
    }

    private async Task Ragdoll(int durationMs)
    {
        var ped = Game.Player.Character;
        Function.Call(Hash.SET_PED_TO_RAGDOLL, ped, durationMs, durationMs, 0, false, false, false);
        await Task.Delay(durationMs);
    }

    private async Task SuperJump(int durationMs)
    {
        Function.Call(Hash.SET_SUPER_JUMP_THIS_FRAME, Game.Player);
        var end = DateTime.Now.AddMilliseconds(durationMs);
        while (DateTime.Now < end)
        {
            Function.Call(Hash.SET_SUPER_JUMP_THIS_FRAME, Game.Player);
            await Task.Delay(16);
        }
    }

    private async Task DrunkEffect(int durationMs)
    {
        Function.Call(Hash.SET_PED_IS_DRUNK, Game.Player.Character, true);
        await Task.Delay(durationMs);
        Function.Call(Hash.SET_PED_IS_DRUNK, Game.Player.Character, false);
    }

    private void GiveRandomWeapon()
    {
        var weapons = new[] {
            WeaponHash.Pistol, WeaponHash.MicroSMG, WeaponHash.Shotgun,
            WeaponHash.AssaultRifle, WeaponHash.RPG, WeaponHash.Grenade,
        };
        var rng = new Random();
        var wep = weapons[rng.Next(weapons.Length)];
        Game.Player.Character.Weapons.Give(wep, 99, true, true);
    }

    private string _prevWeather = "EXTRASUNNY";
    private async void SetWeather(string weatherType, int durationMs)
    {
        Function.Call(Hash.SET_WEATHER_TYPE_NOW_PERSIST, weatherType);
        await Task.Delay(durationMs);
        Function.Call(Hash.SET_WEATHER_TYPE_NOW_PERSIST, _prevWeather);
    }

    private async Task SetTimeOfDay(int hour, int durationMs)
    {
        int prevHour   = Function.Call<int>(Hash.GET_CLOCK_HOURS);
        int prevMinute = Function.Call<int>(Hash.GET_CLOCK_MINUTES);
        Function.Call(Hash.SET_CLOCK_TIME, hour, 0, 0);
        await Task.Delay(durationMs);
        Function.Call(Hash.SET_CLOCK_TIME, prevHour, prevMinute, 0);
    }

    private async Task NpcAttack(int durationMs)
    {
        var pos  = Game.Player.Character.Position;
        var rng  = new Random();
        var peds = new List<Ped>();

        for (int i = 0; i < 3; i++)
        {
            float dx = (float)(rng.NextDouble() * 20 - 10);
            float dy = (float)(rng.NextDouble() * 20 - 10);
            var spawnPos = pos + new Vector3(dx, dy, 0);
            var ped = World.CreateRandomPed(spawnPos);
            if (ped != null)
            {
                peds.Add(ped);
                ped.Task.FightAgainst(Game.Player.Character);
            }
        }
        await Task.Delay(durationMs);
        foreach (var p in peds) if (p != null && p.Exists()) p.Delete();
    }

    private void SpawnPed(PedHash hash, float distanceAhead)
    {
        var pos  = Game.Player.Character.Position;
        var fwd  = Game.Player.Character.ForwardVector;
        var spawnPos = pos + fwd * distanceAhead;
        var ped = World.CreatePed(hash, spawnPos);
        if (ped != null) ped.Task.FightAgainst(Game.Player.Character);
    }

    private async Task ChaosMode(int durationMs)
    {
        AddWanted(6);
        SpawnExplosionNearPlayer(ExplosionType.Grenade, 3);
        await NpcAttack(durationMs / 2);
        await ExplosionRain(durationMs / 2);
    }

    // ── UI notifikasi efek di pojok kanan bawah ─────────────────────
    private void ShowEffectNotif(EffectItem effect)
    {
        var platform = effect.donation?.platform?.ToUpper() ?? "VM";
        var name     = effect.donation?.donatorName ?? "Anonymous";
        var amount   = effect.donation?.amount ?? 0;
        GTA.UI.Notification.Show(
            $"~p~[{platform}]~s~ ~b~{name}~s~ — Rp {amount:N0}\n" +
            $"~y~⚡ {effect.effectName}~s~"
        );
    }

    // ── Lapor ke server bahwa efek selesai ──────────────────────────
    private async Task ReportDone(string actionKey, bool success, string error = null)
    {
        try
        {
            var payload = JsonConvert.SerializeObject(new {
                game = GAME_ID,
                actionKey,
                success,
                error,
            });
            var content = new StringContent(payload, Encoding.UTF8, "application/json");
            await _http.PostAsync($"{SERVER_URL}/api/plugin/done", content);
        }
        catch { /* ignore — fire and forget */ }
    }

    // ── Data classes ─────────────────────────────────────────────────
    private class PendingResponse
    {
        public string           game    { get; set; }
        public int              count   { get; set; }
        public List<EffectItem> effects { get; set; }
    }
}

public class EffectItem
{
    public string   id          { get; set; }
    public string   actionKey   { get; set; }
    public int      durationMs  { get; set; }
    public string   effectName  { get; set; }
    public Donation donation    { get; set; }
}

public class Donation
{
    public string donatorName { get; set; }
    public long   amount      { get; set; }
    public string message     { get; set; }
    public string platform    { get; set; }
}
