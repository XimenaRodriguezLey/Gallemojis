# Firmware del módulo PN532 (ESP32 · Arduino IDE)

Sketch: `gallemojis_modulo/gallemojis_modulo.ino`

## Cableado

| ESP32 | Componente        |
|-------|-------------------|
| GPIO 21 (SDA) | PN532 SDA   |
| GPIO 22 (SCL) | PN532 SCL   |
| 3V3 / GND     | PN532 VCC / GND (¡3.3 V, no 5 V!) |
| GPIO 18       | Buzzer (+)  |

> El PN532 debe estar en modo **I²C** (interruptores SEL0=0, SEL1=1 según el clon que uses).

## Antes de compilar

En la parte superior del `.ino` hay un bloque CONFIGURACIÓN. Edita:

```cpp
const char* EMOCION    = "alegria";          // por módulo: alegria | tristeza | enojo
const char* WIFI_SSID  = "TU_RED_WIFI";
const char* WIFI_PASS  = "TU_PASSWORD";
const char* SERVER_URL = "http://<IP-DEL-BACKEND>:3001/api/nfc/tap";
const char* MODULE_KEY = "clave-del-modulo-nfc"; // = MODULE_API_KEY de backend/.env
```

Para los tres módulos físicos: **solo cambia `EMOCION`** y graba. El resto idéntico.

## Librerías (Arduino IDE → Library Manager)

- `Adafruit PN532`
- `Adafruit BusIO` (la pide la anterior)

`WiFi.h` y `HTTPClient.h` ya vienen con el core de ESP32 (instala el **boards manager** "esp32 by Espressif").

## Formato del UID

El sketch envía el UID como hex en mayúsculas separado por `:`, p. ej. `04:A2:1F:B6`.

Cuando registres tarjetas reales en la base de datos, usa exactamente ese formato en la columna `tarjetas_nfc.uid`. Si quieres, primero acerca la tarjeta al módulo, mira el `Serial` (115200 baud) y copia el UID que imprime.

```sql
INSERT INTO tarjetas_nfc (uid, id_nino)
VALUES ('04:A2:1F:B6', '<uuid del niño>');
```

## Cómo se ve el flujo

1. Niño acerca la tarjeta → ESP32 lee el UID.
2. ESP32 `POST /api/nfc/tap` con `{ "uid": "04:A2:1F:B6", "emocion": "alegria" }` y el header `X-Module-Key`.
3. Backend valida tarjeta + emoción, inserta `registros_emocionales`, crea `notificaciones_push` para el padre.
4. ESP32 lee el HTTP code y da feedback:
   - **200/201** → melodía OK + LED verde
   - **403/404** → tarjeta inactiva o no registrada → tono descendente + LED rojo
   - cualquier otro / sin red → tres bips + LED rojo

## Probar sin tarjeta real

Con el seed del backend ya queda registrada la tarjeta `NFC-DEMO-0001`. Para reproducir un tap desde tu PC:

```bash
curl -X POST http://localhost:3001/api/nfc/tap \
     -H "Content-Type: application/json" \
     -H "X-Module-Key: clave-del-modulo-nfc" \
     -d '{"uid":"NFC-DEMO-0001","emocion":"alegria"}'
```

El padre verá la notificación en `notifications.html`.
