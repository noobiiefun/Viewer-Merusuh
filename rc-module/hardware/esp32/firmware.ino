/**
 * RC Module — ESP32 Firmware
 * 
 * Upload ke ESP32 menggunakan Arduino IDE.
 * 
 * Dependencies (install via Arduino Library Manager):
 * - "WebSockets" by Markus Sattler (v2.4+)
 * - "ArduinoJson" by Benoit Blanchon (v6+)
 * 
 * Cara upload:
 * 1. Buka Arduino IDE
 * 2. Board: ESP32 Dev Module
 * 3. Isi WIFI_SSID dan WIFI_PASSWORD
 * 4. Upload
 * 5. Buka Serial Monitor (115200 baud) untuk lihat IP address
 * 6. Masukkan IP tersebut di konfigurasi RC Module (ip_address)
 * 
 * Wiring (lihat HARDWARE_GUIDE.md untuk diagram lengkap):
 * - GPIO26 → L298N IN1
 * - GPIO27 → L298N IN2
 * - GPIO14 → L298N IN3
 * - GPIO12 → L298N IN4
 * - GPIO25 → L298N ENA (PWM kecepatan kiri)
 * - GPIO33 → L298N ENB (PWM kecepatan kanan)
 */

#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// ── Konfigurasi WiFi ─────────────────────────────────────────────────────────
const char* WIFI_SSID     = "NAMA_WIFI_KAMU";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_KAMU";

// ── Pin Motor ────────────────────────────────────────────────────────────────
// Motor Kiri
#define MOTOR_L_IN1  26
#define MOTOR_L_IN2  27
#define MOTOR_L_ENA  25   // PWM

// Motor Kanan
#define MOTOR_R_IN3  14
#define MOTOR_R_IN4  12
#define MOTOR_R_ENB  33   // PWM

// PWM channels (ESP32)
#define PWM_CHANNEL_L  0
#define PWM_CHANNEL_R  1
#define PWM_FREQ       1000
#define PWM_RESOLUTION 8    // 8-bit = 0-255

// ── WebSocket Server ─────────────────────────────────────────────────────────
WebSocketsServer wsServer(81);

// ── State RC ─────────────────────────────────────────────────────────────────
float currentForward = 0.0;
float currentTurn    = 0.0;
bool  isBraking      = false;
unsigned long lastCommandTime = 0;
const unsigned long COMMAND_TIMEOUT_MS = 500;  // Stop jika tidak ada perintah > 500ms

// ── Setup ────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[ESP32 RC] Booting...");

  // Setup pin motor
  pinMode(MOTOR_L_IN1, OUTPUT);
  pinMode(MOTOR_L_IN2, OUTPUT);
  pinMode(MOTOR_R_IN3, OUTPUT);
  pinMode(MOTOR_R_IN4, OUTPUT);

  // Setup PWM
  ledcSetup(PWM_CHANNEL_L, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(PWM_CHANNEL_R, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(MOTOR_L_ENA, PWM_CHANNEL_L);
  ledcAttachPin(MOTOR_R_ENB, PWM_CHANNEL_R);

  // Stop motor
  stopMotors();

  // Konek WiFi
  Serial.printf("[WiFi] Menghubungkan ke %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());

  // Mulai WebSocket server
  wsServer.begin();
  wsServer.onEvent(onWsEvent);
  Serial.printf("[WS] WebSocket server di port 81\n");
  Serial.println("[ESP32 RC] Siap! Masukkan IP di atas ke konfigurasi RC Module.");
}

// ── Loop ─────────────────────────────────────────────────────────────────────
void loop() {
  wsServer.loop();

  // Safety: stop jika tidak ada perintah dalam COMMAND_TIMEOUT_MS
  if (millis() - lastCommandTime > COMMAND_TIMEOUT_MS && lastCommandTime > 0) {
    stopMotors();
    lastCommandTime = 0;
  }
}

// ── WebSocket Event Handler ───────────────────────────────────────────────────
void onWsEvent(uint8_t clientNum, WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    
    case WStype_CONNECTED:
      Serial.printf("[WS] Client %d terhubung\n", clientNum);
      // Kirim status awal
      sendStatus(clientNum);
      break;

    case WStype_DISCONNECTED:
      Serial.printf("[WS] Client %d disconnect\n", clientNum);
      stopMotors();
      break;

    case WStype_TEXT: {
      // Parse perintah JSON
      StaticJsonDocument<128> doc;
      DeserializationError err = deserializeJson(doc, payload, length);
      if (err) {
        Serial.printf("[WS] JSON error: %s\n", err.c_str());
        break;
      }

      const char* cmd = doc["cmd"];
      
      if (strcmp(cmd, "move") == 0) {
        currentForward = doc["f"] | 0.0f;
        currentTurn    = doc["t"] | 0.0f;
        isBraking      = false;
        lastCommandTime = millis();
        applyMotors();
        
      } else if (strcmp(cmd, "stop") == 0) {
        isBraking = true;
        stopMotors();
        lastCommandTime = millis();
        
      } else if (strcmp(cmd, "ping") == 0) {
        // Balas pong + kirim battery (dummy 87% untuk sekarang)
        String pong = "{\"type\":\"pong\",\"battery\":87}";
        wsServer.sendTXT(clientNum, pong);
      }
      break;
    }

    default:
      break;
  }
}

// ── Motor Control ─────────────────────────────────────────────────────────────
void applyMotors() {
  if (isBraking) {
    stopMotors();
    return;
  }

  // Hitung kecepatan kiri dan kanan dari forward + turn
  // forward: -1 (full mundur) s/d +1 (full maju)
  // turn: -1 (full kiri) s/d +1 (full kanan)
  float left  = currentForward - currentTurn;
  float right = currentForward + currentTurn;

  // Clamp ke -1..1
  left  = constrain(left,  -1.0, 1.0);
  right = constrain(right, -1.0, 1.0);

  setMotor(MOTOR_L_IN1, MOTOR_L_IN2, PWM_CHANNEL_L, left);
  setMotor(MOTOR_R_IN3, MOTOR_R_IN4, PWM_CHANNEL_R, right);
}

void setMotor(int pin1, int pin2, int pwmChannel, float value) {
  int speed = abs(value) * 255;
  
  if (value > 0.05) {
    // Maju
    digitalWrite(pin1, HIGH);
    digitalWrite(pin2, LOW);
    ledcWrite(pwmChannel, speed);
  } else if (value < -0.05) {
    // Mundur
    digitalWrite(pin1, LOW);
    digitalWrite(pin2, HIGH);
    ledcWrite(pwmChannel, speed);
  } else {
    // Stop
    digitalWrite(pin1, LOW);
    digitalWrite(pin2, LOW);
    ledcWrite(pwmChannel, 0);
  }
}

void stopMotors() {
  setMotor(MOTOR_L_IN1, MOTOR_L_IN2, PWM_CHANNEL_L, 0);
  setMotor(MOTOR_R_IN3, MOTOR_R_IN4, PWM_CHANNEL_R, 0);
}

// ── Send Status ───────────────────────────────────────────────────────────────
void sendStatus(uint8_t clientNum) {
  StaticJsonDocument<64> doc;
  doc["type"]    = "status";
  doc["battery"] = 87;  // TODO: baca dari ADC jika ada sensor baterai
  doc["ip"]      = WiFi.localIP().toString();
  
  String out;
  serializeJson(doc, out);
  wsServer.sendTXT(clientNum, out);
}
