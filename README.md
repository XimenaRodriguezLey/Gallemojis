# Gallemojis

Sistema de inteligencia emocional escolar con tarjetas NFC.
Los niños tocan un módulo PN532 (cada módulo representa una emoción) y la app registra el evento. Los padres ven el historial y reciben notificaciones; los maestros ven estadísticas grupales.

## Estructura

```
gallemojis/
├── frontend/                  # HTML + JS (servido estático)
│   ├── index.html             # login
│   ├── home.html              # dashboard (maestro/padre)
│   ├── calendario.html        # calendario emocional
│   ├── notifications.html     # notificaciones + mensajes
│   └── js/
│       └── gallemojis-api.js  # cliente HTTP que consume el backend
│
└── backend/                   # Node + Express + PostgreSQL
    ├── server.js              # entry point
    ├── package.json
    ├── .env.example
    ├── config/                # db pool, jwt
    ├── middlewares/           # auth, errores
    ├── db/                    # schema_nfc_escolar.sql + seed.js
    └── slices/                # vertical slicing por feature
        ├── auth/              # login + endpoints /maestros/me
        ├── salones/           # alumnos e historial del salón
        ├── ninos/             # historial individual
        ├── padres/            # /padres/me/{hijos,notificaciones,mensajes}
        ├── registros/         # consultas al historial emocional
        ├── notificaciones/    # marcar leídas
        ├── mensajes/          # chat maestro <-> padre
        └── nfc/               # endpoint para los módulos PN532
```

Cada slice contiene `routes.js`, `controller.js`, `service.js` y `repository.js`. Los slices solo se hablan entre sí a nivel de **service**, no de repository.

## Puesta en marcha

### 1. Base de datos
```bash
createdb gallemojis
psql gallemojis -f backend/db/schema_nfc_escolar.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env       # ajusta DATABASE_URL, JWT_SECRET, MODULE_API_KEY
npm install
npm run seed               # opcional: crea usuarios y tarjeta demo
npm start                  # http://localhost:3001
```

El backend también sirve la carpeta `frontend/` estática, así que basta abrir `http://localhost:3001/`.

### 3. Credenciales demo (tras `npm run seed`)
| Rol     | Correo                       | Contraseña  |
|---------|------------------------------|-------------|
| Maestro | `maria@gallemojis.test`      | `maestro123`|
| Padre   | `juan@gallemojis.test`       | `padre123`  |

## Endpoints

| Método | Ruta                                  | Auth         | Descripción                              |
|--------|---------------------------------------|--------------|------------------------------------------|
| POST   | `/api/auth/login`                     | —            | Login maestro o padre                    |
| GET    | `/api/maestros/me/salones`            | maestro      | Mis salones                              |
| GET    | `/api/salones/:id/ninos`              | maestro      | Niños del salón                          |
| GET    | `/api/salones/:id/historial?limit=`   | maestro      | Historial del salón                      |
| GET    | `/api/padres/me/hijos`                | padre        | Mis hijos                                |
| GET    | `/api/ninos/:id/historial?limit=`     | padre/maestro| Historial del niño                       |
| GET    | `/api/padres/me/notificaciones?noLeidas=true` | padre | Mis notificaciones                  |
| PATCH  | `/api/notificaciones/:id/leida`       | padre        | Marcar notificación como leída           |
| GET    | `/api/padres/me/mensajes`             | padre        | Mensajes del maestro                     |
| GET    | `/api/mensajes?maestro=&padre=`       | participante | Hilo de chat                             |
| POST   | `/api/mensajes`                       | maestro/padre| Enviar mensaje                           |
| POST   | `/api/nfc/tap`                        | `X-Module-Key`| Tap NFC desde el módulo PN532           |

## El flujo NFC

```
Niño acerca tarjeta al módulo  →  módulo POST /api/nfc/tap
                                         │
                                         ▼
       busca tarjeta por UID → busca módulo por emoción
                                         │
                                         ▼
        inserta registros_emocionales (resultado='ok')
                                         │
                                         ▼
        inserta notificaciones_push para el padre
                                         │
                                         ▼
        padre la ve en notifications.html (y badge en home)
```

Ejemplo desde un módulo:
```bash
curl -X POST http://localhost:3001/api/nfc/tap \
     -H "Content-Type: application/json" \
     -H "X-Module-Key: clave-del-modulo-nfc" \
     -d '{"uid":"NFC-DEMO-0001","emocion":"alegria"}'
```
