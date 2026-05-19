-- ============================================================
--  Gallemojis — PostgreSQL DDL
--  Sistema de inteligencia emocional con NFC para niños
--
--  Entidades principales:
--    · Maestros     → dirigen salones, mensajean padres
--    · Padres       → reciben notificaciones, ven historial
--    · Niños        → identificados por tarjeta NFC
--    · Módulos      → lectores PN532, uno por emoción
--    · Registros    → niño + módulo + timestamp (el corazón)
--    · Mensajes     → chat privado maestro → padre
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- Maestros
-- Tienen acceso al panel de estadísticas grupales del salón
-- y pueden enviar mensajes privados a padres
-- ------------------------------------------------------------
CREATE TABLE maestros (
    id_maestro          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    correo              VARCHAR(255)    NOT NULL UNIQUE,
    -- Igual que padres: si NULL, la cuenta espera ser activada
    -- con su activacion_token (lo genera el director al darla de alta
    -- o al reiniciar la contraseña).
    password_hash       TEXT,
    activacion_token    TEXT,
    activacion_expira   TIMESTAMPTZ,
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maestros_activacion_token
    ON maestros (activacion_token)
    WHERE activacion_token IS NOT NULL;

-- ------------------------------------------------------------
-- Directores
-- Rol administrativo: gestionan maestros, salones, niños, padres
-- y pueden reiniciar contraseñas de maestros y padres.
-- ------------------------------------------------------------
CREATE TABLE directores (
    id_director         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    correo              VARCHAR(255)    NOT NULL UNIQUE,
    password_hash       TEXT,
    activacion_token    TEXT,
    activacion_expira   TIMESTAMPTZ,
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_creacion      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ultimo_login        TIMESTAMPTZ
);

CREATE INDEX idx_directores_activacion_token
    ON directores (activacion_token)
    WHERE activacion_token IS NOT NULL;

-- ------------------------------------------------------------
-- Salones / grupos
-- Un maestro dirige uno o más salones
-- ------------------------------------------------------------
CREATE TABLE salones (
    id_salon        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100)    NOT NULL,
    grado           VARCHAR(50)     NOT NULL,
    id_maestro      UUID            NOT NULL REFERENCES maestros (id_maestro),
    activo          BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- Padres de familia
-- Acceden a la app móvil: historial + notificaciones de su hijo
-- ------------------------------------------------------------
CREATE TABLE padres (
    id_padre            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(100)    NOT NULL,
    apellido            VARCHAR(100)    NOT NULL,
    correo              VARCHAR(255)    NOT NULL UNIQUE,
    telefono            VARCHAR(20),
    -- NULL = cuenta recién dada de alta por la maestra; el padre
    -- la establecerá con su activacion_token.
    password_hash       TEXT,
    activacion_token    TEXT,
    activacion_expira   TIMESTAMPTZ,
    activo              BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_registro      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ultimo_login        TIMESTAMPTZ
);

CREATE INDEX idx_padres_activacion_token
    ON padres (activacion_token)
    WHERE activacion_token IS NOT NULL;

-- ------------------------------------------------------------
-- Niños
-- Cada niño pertenece a un salón y tiene un padre registrado
-- ------------------------------------------------------------
CREATE TABLE ninos (
    id_nino         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          VARCHAR(100)    NOT NULL,
    apellido        VARCHAR(100)    NOT NULL,
    fecha_nacimiento DATE,
    id_padre        UUID            NOT NULL REFERENCES padres (id_padre),
    id_salon        UUID            NOT NULL REFERENCES salones (id_salon),
    avatar_url      TEXT,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- Tarjetas NFC
-- Relación 1:1 con el niño — cada niño tiene exactamente una
-- tarjeta activa. El uid es el identificador físico del chip.
-- ------------------------------------------------------------
CREATE TABLE tarjetas_nfc (
    id_tarjeta          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid                 VARCHAR(100)    NOT NULL UNIQUE,
    id_nino             UUID            NOT NULL UNIQUE REFERENCES ninos (id_nino),
    activa              BOOLEAN         NOT NULL DEFAULT TRUE,
    fecha_asignacion    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Módulos PN532
-- Cada módulo representa una emoción específica.
-- color_hex e icono se usan en la UI de la app.
-- Ejemplos de emocion: 'alegria', 'tristeza', 'enojo', 'calma', 'miedo'
-- ------------------------------------------------------------
CREATE TABLE modulos (
    id_modulo           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(100)    NOT NULL,
    emocion             VARCHAR(80)     NOT NULL UNIQUE,
    color_hex           CHAR(7)         NOT NULL DEFAULT '#CCCCCC',
    icono               VARCHAR(100),
    ubicacion           VARCHAR(255),
    ip_modulo           INET,
    estado              VARCHAR(50)     NOT NULL DEFAULT 'activo'
                            CHECK (estado IN ('activo', 'inactivo', 'error')),
    ultima_conexion     TIMESTAMPTZ
);

-- Seed de los 3 módulos iniciales (ajusta colores e iconos a tu diseño)
INSERT INTO modulos (nombre, emocion, color_hex, icono, ubicacion) VALUES
    ('Módulo Alegría',  'alegria',  '#FFD700', 'emoji-alegria',  'Aula principal'),
    ('Módulo Tristeza', 'tristeza', '#6495ED', 'emoji-tristeza', 'Aula principal'),
    ('Módulo Enojo',    'enojo',    '#FF6347', 'emoji-enojo',    'Aula principal');

-- ------------------------------------------------------------
-- Registros emocionales
-- El evento central: niño acerca tarjeta a módulo → registro.
-- Esta tabla es el historial que consultan padres y maestros.
-- resultado: 'ok' | 'tarjeta_inactiva' | 'error_lectura'
-- ------------------------------------------------------------
CREATE TABLE registros_emocionales (
    id_registro     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_tarjeta      UUID            NOT NULL REFERENCES tarjetas_nfc (id_tarjeta),
    id_modulo       UUID            NOT NULL REFERENCES modulos (id_modulo),
    fecha_hora      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resultado       VARCHAR(50)     NOT NULL DEFAULT 'ok'
                        CHECK (resultado IN ('ok', 'tarjeta_inactiva', 'error_lectura'))
);

-- Índices clave: el historial se consulta siempre por tarjeta y por fecha
CREATE INDEX idx_registros_tarjeta  ON registros_emocionales (id_tarjeta);
CREATE INDEX idx_registros_modulo   ON registros_emocionales (id_modulo);
CREATE INDEX idx_registros_fecha    ON registros_emocionales (fecha_hora DESC);

-- Vista útil: historial enriquecido (niño + emoción + timestamp)
CREATE VIEW v_historial_emocional AS
    SELECT
        r.id_registro,
        r.fecha_hora,
        n.id_nino,
        n.nombre        AS nombre_nino,
        n.apellido      AS apellido_nino,
        n.id_padre,
        n.id_salon,
        m.emocion,
        m.color_hex,
        m.icono,
        r.resultado
    FROM registros_emocionales r
    JOIN tarjetas_nfc           t ON t.id_tarjeta = r.id_tarjeta
    JOIN ninos                  n ON n.id_nino    = t.id_nino
    JOIN modulos                m ON m.id_modulo  = r.id_modulo;

-- ------------------------------------------------------------
-- Notificaciones push
-- Cada registro ok dispara una notificación al padre del niño.
-- Se crean pending (enviada = false) y un worker las despacha.
-- ------------------------------------------------------------
CREATE TABLE notificaciones_push (
    id_notif        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_registro     UUID            NOT NULL REFERENCES registros_emocionales (id_registro),
    id_padre        UUID            NOT NULL REFERENCES padres (id_padre),
    mensaje         TEXT            NOT NULL,
    enviada         BOOLEAN         NOT NULL DEFAULT FALSE,
    leida           BOOLEAN         NOT NULL DEFAULT FALSE,
    fecha           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_padre   ON notificaciones_push (id_padre, leida);
CREATE INDEX idx_notif_enviada ON notificaciones_push (enviada) WHERE enviada = FALSE;

-- ------------------------------------------------------------
-- Dispositivos push (tokens FCM / APNs de la app de padres)
-- Un padre puede tener varios dispositivos registrados
-- ------------------------------------------------------------
CREATE TABLE dispositivos_push (
    id_dispositivo  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_padre        UUID            NOT NULL REFERENCES padres (id_padre),
    token_push      TEXT            NOT NULL UNIQUE,
    plataforma      VARCHAR(20)     NOT NULL CHECK (plataforma IN ('ios', 'android')),
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    ultima_conexion TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- Mensajes
-- Canal privado maestro → padre (y respuesta padre → maestro).
-- No es broadcast: cada mensaje tiene un destinatario concreto.
-- ------------------------------------------------------------
CREATE TABLE mensajes (
    id_mensaje      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_maestro      UUID            NOT NULL REFERENCES maestros (id_maestro),
    id_padre        UUID            NOT NULL REFERENCES padres (id_padre),
    -- NULL = enviado por el maestro, NOT NULL = respuesta del padre
    remitente       VARCHAR(10)     NOT NULL CHECK (remitente IN ('maestro', 'padre')),
    contenido       TEXT            NOT NULL,
    leido           BOOLEAN         NOT NULL DEFAULT FALSE,
    fecha_envio     TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mensajes_hilo ON mensajes (id_maestro, id_padre, fecha_envio);

-- ------------------------------------------------------------
-- Bitácora del sistema (auditoría general)
-- ------------------------------------------------------------
CREATE TABLE bitacora (
    id_log          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor           VARCHAR(255),   -- correo o id del usuario que generó la acción
    accion          VARCHAR(255)    NOT NULL,
    tabla           VARCHAR(100),
    fecha           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    ip              INET
);

CREATE INDEX idx_bitacora_fecha ON bitacora (fecha DESC);
