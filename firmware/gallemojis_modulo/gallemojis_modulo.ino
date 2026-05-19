/* ================================================================
 *  Gallemojis — firmware del módulo PN532 (ESP32 + Arduino IDE)
 *
 *  Cada módulo representa UNA emoción. Cuando un niño acerca su
 *  tarjeta NFC, el ESP32:
 *    1. Lee el UID de la tarjeta por I²C.
 *    2. Envía  POST /api/nfc/tap  al backend (con la API key).
 *    3. Reproduce un sonido según la respuesta.
 *
 *  Para los 3 módulos (alegría / tristeza / enojo) se sube el mismo
 *  sketch cambiando únicamente la constante EMOCION.
 *
 *  Hardware:
 *    PN532   → I²C (SDA=21, SCL=22)  [3.3 V]
 *    Buzzer  → GPIO 18
 *
 *  Dependencias en el Library Manager:
 *    · Adafruit PN532
 *    · Adafruit BusIO
 *    · WiFi       (incluido en ESP32 core)
 *    · HTTPClient (incluido en ESP32 core)
 * ================================================================ */

#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClient.h>          // ← REQUERIDO en ESP32 core ≥2.x
#include <Adafruit_PN532.h>

/* ─────────────── CONFIGURACIÓN (editar por módulo) ─────────────── */

// 👉 ÚNICA línea que cambia entre los tres módulos.
//    Valores válidos (deben coincidir con la tabla `modulos` del backend):
//    "alegria" | "tristeza" | "enojo" | "calma" | "miedo"
const char* EMOCION = "alegria";

// WiFi
const char* WIFI_SSID = "INFINITUME99D_2.4";
const char* WIFI_PASS = "mN66Bp3NNm";

// Backend Gallemojis
// ⚠️  Usa la IP local del SERVIDOR (la PC donde corre `npm start`),
//     NO "localhost" y NO la IP del ESP32.
//     Sácala en Windows con: ipconfig   →   IPv4 del adaptador WiFi.
//     Ejemplo: "http://192.168.1.100:3001"
const char* SERVER_HOST = "192.168.1.224";
const uint16_t SERVER_PORT = 3001;

// Rutas
const char* PATH_TAP    = "/api/nfc/tap";
const char* PATH_HEALTH = "/api/health";

// Debe coincidir exactamente con MODULE_API_KEY en backend/.env
const char* MODULE_KEY = "clave-del-modulo-nfc";

// Pines
#define SDA_PIN    21
#define SCL_PIN    22
#define BUZZER_PIN 18

/* ──────────────────────── NOTAS MUSICALES ──────────────────────── */
#define NOTE_G3 196
#define NOTE_A3 220
#define NOTE_B3 247
#define NOTE_C4 262
#define NOTE_E4 330
#define NOTE_G4 392
#define NOTE_C5 523

// Melodía corta de "tarjeta OK"
int melodyOk[]   = { NOTE_C4, NOTE_E4, NOTE_G4, NOTE_C5 };
int durOk[]      = { 8, 8, 8, 4 };

// "Tarjeta inactiva / no registrada" → dos tonos descendentes
int melodyWarn[] = { NOTE_B3, NOTE_G3 };
int durWarn[]    = { 4, 2 };

// "Error de red / servidor" → tres bips
int melodyErr[]  = { NOTE_A3, NOTE_A3, NOTE_A3 };
int durErr[]     = { 8, 8, 8 };

/* ─────────────────────────── OBJETOS ───────────────────────────── */
Adafruit_PN532 nfc(SDA_PIN, SCL_PIN);
WiFiClient     wifiClient;   // cliente persistente para HTTPClient

/* ─────────────────────────── HELPERS ───────────────────────────── */

void tocarMelodia(int* notas, int* durs, int n) {
    for (int i = 0; i < n; i++) {
        int d = 1000 / durs[i];
        tone(BUZZER_PIN, notas[i], d);
        delay((int)(d * 1.30));
        noTone(BUZZER_PIN);
    }
}

void feedbackOk()    { tocarMelodia(melodyOk,   durOk,   4); }
void feedbackWarn()  { tocarMelodia(melodyWarn,  durWarn, 2); }
void feedbackError() { tocarMelodia(melodyErr,   durErr,  3); }

/* Convierte el UID a string hex con separadores ":" (ej. "04:A2:1F:B6") */
String uidToString(uint8_t* uid, uint8_t len) {
    String s = "";
    for (uint8_t i = 0; i < len; i++) {
        if (i > 0) s += ':';
        if (uid[i] < 0x10) s += '0';
        s += String(uid[i], HEX);
    }
    s.toUpperCase();
    return s;
}

/* Construye una URL http://host:port + path */
String buildUrl(const char* path) {
    String u = "http://";
    u += SERVER_HOST;
    u += ':';
    u += String(SERVER_PORT);
    u += path;
    return u;
}

/* ────────────────────────── CONEXIÓN WIFI ──────────────────────── */
bool conectarWiFi() {
    if (WiFi.status() == WL_CONNECTED) return true;

    Serial.printf("\n[WiFi] Conectando a \"%s\"", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);

    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
        delay(400);
        Serial.print('.');
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.printf("[WiFi] Conectado. IP del ESP32: %s\n",
                      WiFi.localIP().toString().c_str());
        Serial.printf("[WiFi] Gateway: %s   Mask: %s\n",
                      WiFi.gatewayIP().toString().c_str(),
                      WiFi.subnetMask().toString().c_str());
        return true;
    }

    Serial.println("[WiFi] ⚠️  Fallo de conexión.");
    return false;
}

/* ─────────────── TEST DE CONECTIVIDAD AL BACKEND ───────────────── */
/*
 *  Hace un GET /api/health para verificar que el servidor está vivo
 *  ANTES de intentar el POST. Si esto falla, el problema no es el
 *  endpoint /api/nfc/tap sino que el ESP32 no llega al servidor:
 *    · IP mal configurada
 *    · Backend apagado
 *    · Firewall de Windows bloqueando el puerto 3001
 *    · ESP32 en otra subred / VLAN aislada
 */
bool pingBackend() {
    if (!conectarWiFi()) return false;

    HTTPClient http;
    String url = buildUrl(PATH_HEALTH);

    if (!http.begin(wifiClient, url)) {
        Serial.println("[HTTP] ✗ http.begin() falló (health).");
        return false;
    }
    http.setTimeout(4000);
    int code = http.GET();
    if (code > 0) {
        Serial.printf("[HEALTH] ✓ %s → %d\n", url.c_str(), code);
        http.end();
        return code == 200;
    }
    Serial.printf("[HEALTH] ✗ %s → %s (code=%d)\n",
                  url.c_str(), http.errorToString(code).c_str(), code);
    http.end();
    return false;
}

/* ─────────────── ENVIAR TAP AL BACKEND DE GALLEMOJIS ──────────── */
/*
 *  Devuelve el código HTTP (200/201/4xx/5xx) o -1 si no hay red.
 */
int enviarTap(const String& uid) {
    if (!conectarWiFi()) return -1;

    HTTPClient http;
    String url = buildUrl(PATH_TAP);

    if (!http.begin(wifiClient, url)) {
        Serial.println("[HTTP] ✗ http.begin() falló. Verifica SERVER_HOST/PORT.");
        return -1;
    }

    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Module-Key",  MODULE_KEY);
    http.setTimeout(6000);

    char body[128];
    snprintf(body, sizeof(body),
             "{\"uid\":\"%s\",\"emocion\":\"%s\"}",
             uid.c_str(), EMOCION);

    Serial.printf("[HTTP] POST → %s\n", url.c_str());
    Serial.printf("[HTTP] Body → %s\n", body);

    int code = http.POST((uint8_t*)body, strlen(body));

    if (code > 0) {
        String respuesta = http.getString();
        Serial.printf("[HTTP] ← %d  %s\n", code, respuesta.c_str());
    } else {
        // HTTPClient devuelve un código negativo con el error interno.
        // code = -1   → connection refused (servidor apagado o IP/puerto malos)
        // code = -11  → timeout
        // code = -2   → send header failed
        Serial.printf("[HTTP] ✗ Error de red: %s  (code=%d)\n",
                      http.errorToString(code).c_str(), code);
        Serial.println("[HTTP]   Pista: verifica que el backend esté corriendo,");
        Serial.println("[HTTP]   que SERVER_HOST sea la IP de la PC (no del ESP32),");
        Serial.println("[HTTP]   y que el Firewall de Windows permita el puerto 3001.");
    }

    http.end();
    return code;
}

/* ───────────────────────────── SETUP ──────────────────────────── */
void setup() {
    Serial.begin(115200);
    while (!Serial) delay(10);

    pinMode(BUZZER_PIN, OUTPUT);

    Serial.println("\n=== Gallemojis · módulo NFC ===");
    Serial.printf("Emoción configurada: %s\n", EMOCION);
    Serial.printf("Endpoint: %s\n", buildUrl(PATH_TAP).c_str());

    // ── PN532 ────────────────────────────────────────────────────────
    nfc.begin();
    uint32_t v = nfc.getFirmwareVersion();
    if (!v) {
        Serial.println("[NFC] ✗ PN532 no responde. Revisa cableado I²C.");
        while (1) {
            tone(BUZZER_PIN, NOTE_A3, 150);
            delay(400);
        }
    }
    Serial.printf("[NFC] ✓ PN5%02X firmware %d.%d\n",
                  (v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF);
    nfc.SAMConfig();

    // ── WiFi ─────────────────────────────────────────────────────────
    conectarWiFi();

    // ── Diagnóstico de backend antes de empezar ──────────────────────
    if (pingBackend()) {
        Serial.println("[BOOT] ✓ Backend alcanzable. Todo listo.");
    } else {
        Serial.println("[BOOT] ⚠️  No se pudo contactar al backend en el arranque.");
        Serial.println("[BOOT]    Se reintentará en cada tap.");
    }

    // Pitido de listo
    tone(BUZZER_PIN, NOTE_C4, 100); delay(150);
    tone(BUZZER_PIN, NOTE_E4, 100); delay(150);
    Serial.println("[NFC] Esperando tarjeta...\n");
}

/* ───────────────────────────── LOOP ───────────────────────────── */
void loop() {
    uint8_t uid[7] = { 0 };
    uint8_t uidLen = 0;

    bool detectada = nfc.readPassiveTargetID(
        PN532_MIFARE_ISO14443A, uid, &uidLen, 1000
    );
    if (!detectada) return;

    String uidStr = uidToString(uid, uidLen);
    Serial.printf("[TAP] Tarjeta detectada: %s\n", uidStr.c_str());

    int code = enviarTap(uidStr);

    if (code == 200 || code == 201) {
        feedbackOk();
    } else if (code == 403 || code == 404) {
        feedbackWarn();
    } else {
        feedbackError();
    }

    delay(1200);
    Serial.println("---");
}