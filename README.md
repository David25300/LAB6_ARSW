# Lab 6 — BluePrints en Tiempo Real (STOMP y Socket.IO)

Front en React + Vite que integra el CRUD de planos (REST con JWT) y la colaboración en vivo: dos o más pestañas dibujan sobre el mismo plano y ven los puntos de las demás casi al instante. El enunciado original del profesor está en [ENUNCIADO.md](./ENUNCIADO.md).

- **Tiempo real principal: STOMP**, sobre el mismo backend Spring Boot del CRUD ([`lab5/backend`](./lab5/backend)).
- **Socket.IO** también está disponible en el selector y usa el [backend guía de Node](https://github.com/DECSIS-ECI/example-backend-socketio-node-).
- **None** deja el front sin tiempo real (solo CRUD).

## Arquitectura

```
React (Vite)
 ├─ REST /api/v1/blueprints (JWT) ────────────────┐
 └─ Tiempo real (selector None / Socket.IO / STOMP)│
     ├─ STOMP: /ws-blueprints ─────────────────────┼──> Spring Boot (lab5/backend) ──> PostgreSQL
     │    SEND /app/draw  →  /topic/blueprints.{author}.{name}
     └─ Socket.IO: join-room / draw-event ─────────────> backend guía Node (:3001)
```

Este repositorio contiene una copia del Lab 5 en [`lab5/`](./lab5), que a su vez trae el backend del Lab 4 en `lab5/backend`. Los repositorios de los laboratorios anteriores no se modifican: el soporte de tiempo real se agregó sobre esta copia.

## Puesta en marcha

Requisitos: Node.js 20+, JDK 21, Maven 3.9+ y Docker.

### 1. Base de datos y backend (CRUD + STOMP)

```bash
cd lab5/backend
cp .env.example .env      # escribe una contraseña en DB_PASSWORD
docker compose up -d      # PostgreSQL 16 en el puerto DB_PORT (5433 por defecto)
mvn spring-boot:run       # API y WebSocket en http://localhost:8080
```

Comprobación rápida: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}` (incluye la conexión a la base de datos).

Usuario de prueba: `student` / `student123`.

### 2. Backend Socket.IO (opcional)

Solo se necesita para la opción **Socket.IO** del selector:

```bash
git clone https://github.com/DECSIS-ECI/example-backend-socketio-node-.git
cd example-backend-socketio-node-
npm install
npm run dev               # http://localhost:3001
```

### 3. Front (este repositorio)

```bash
cp .env.example .env.local
npm install
npm run dev               # http://localhost:5173
```

| Variable          | Uso                     | Valor por defecto       |
| ----------------- | ----------------------- | ----------------------- |
| `VITE_API_BASE`   | API REST (CRUD y login) | `http://localhost:8080` |
| `VITE_STOMP_BASE` | Servidor STOMP          | igual a `VITE_API_BASE` |
| `VITE_IO_BASE`    | Servidor Socket.IO      | `http://localhost:3001` |

### Uso

1. Inicia sesión.
2. Escribe un autor y pulsa **Get blueprints** para ver su tabla de planos y el total de puntos.
3. Abre un plano con **Open** (en la tabla o escribiendo el nombre). Si no existe, se abre como borrador: dibújalo y pulsa **Create**.
4. Abre el mismo plano en otra pestaña, elige la misma tecnología en el selector y haz clic en el lienzo de cualquiera de las dos.

## Endpoints usados

El backend expone el CRUD bajo `/api/v1` y responde con el envoltorio `{ code, message, data }` de los labs anteriores.

| Operación                | Enunciado                              | Implementación                              |
| ------------------------ | -------------------------------------- | ------------------------------------------- |
| Login                    | —                                      | `POST /auth/login` → `{ access_token }`     |
| Planos de un autor       | `GET /api/blueprints?author=:author`   | `GET /api/v1/blueprints/{author}`           |
| Puntos de un plano       | `GET /api/blueprints/:author/:name`    | `GET /api/v1/blueprints/{author}/{name}`    |
| Crear                    | `POST /api/blueprints`                 | `POST /api/v1/blueprints`                   |
| Actualizar (Save/Update) | `PUT /api/blueprints/:author/:name`    | `PUT /api/v1/blueprints/{author}/{name}`    |
| Eliminar                 | `DELETE /api/blueprints/:author/:name` | `DELETE /api/v1/blueprints/{author}/{name}` |
| Salud                    | —                                      | `GET /actuator/health`                      |

El total de puntos del autor se calcula en el front con `reduce` sobre la lista de planos.

## Protocolo de tiempo real

### STOMP (Spring Boot)

| Paso          | Frame / destino                                 | Contenido                                                         |
| ------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Conexión      | `CONNECT` a `ws://localhost:8080/ws-blueprints` | header `Authorization: Bearer <jwt>`                              |
| Suscribirse   | `SUBSCRIBE /topic/blueprints.{author}.{name}`   | requiere el scope `blueprints.read`                               |
| Dibujar       | `SEND /app/draw`                                | `{ author, name, point: { x, y } }` — requiere `blueprints.write` |
| Actualización | `MESSAGE /topic/blueprints.{author}.{name}`     | `{ author, name, points: [...] }` (plano completo)                |
| Errores       | `SUBSCRIBE /user/queue/errors`                  | `{ message }` solo para quien envió el evento                     |

### Socket.IO (backend guía)

| Evento             | Dirección          | Contenido                           |
| ------------------ | ------------------ | ----------------------------------- |
| `join-room`        | cliente → servidor | `blueprints.{author}.{name}`        |
| `draw-event`       | cliente → servidor | `{ room, author, name, point }`     |
| `blueprint-update` | servidor → otros   | `{ author, name, points: [point] }` |

## Decisiones de diseño

- **Un canal por plano.** STOMP usa el tópico `blueprints.{author}.{name}` y Socket.IO la sala con el mismo nombre. Así cada plano queda aislado: dibujar en un plano no afecta a quien tenga otro abierto.
- **En STOMP el servidor es la fuente de verdad.** Cada `SEND /app/draw` agrega el punto en PostgreSQL dentro de una transacción (`BlueprintsServices.addPointAndGet`) y el servidor publica el plano completo. Los clientes reemplazan sus puntos con ese estado, de modo que todas las pestañas convergen al mismo plano, aunque alguna se haya unido tarde.
- **Orden de los puntos.** `CollaborativeDrawingService` serializa por plano el paso "guardar y publicar", para que los estados salgan en el mismo orden en que se confirmaron. `setPreservePublishOrder(true)` conserva ese orden hasta cada cliente.
- **Seguridad del WebSocket.** El navegador no puede mandar headers en el handshake HTTP, así que `/ws-blueprints` es público y el JWT viaja en el frame `CONNECT`. `StompAuthenticationInterceptor` valida el token con el mismo `JwtDecoder` del API REST y exige `blueprints.read` para suscribirse y `blueprints.write` para dibujar. Los eventos se validan con Bean Validation (`DrawEvent`); los errores (plano inexistente, evento mal formado) se devuelven solo al remitente por `/user/queue/errors`.
- **Orígenes permitidos configurables.** `blueprints.cors.allowed-origin-patterns` (por defecto `http://localhost:*`) se usa tanto para el CORS del API como para el endpoint WebSocket. En producción se restringe con la variable `BLUEPRINTS_CORS_ALLOWEDORIGINPATTERNS`.
- **Transportes intercambiables en el front.** None, Socket.IO y STOMP implementan la misma interfaz (`connect`, `watch`, `publish`, `disconnect`), y el hook `useRealtimeBlueprint` no depende de ninguna tecnología concreta. Agregar otra tecnología no obliga a tocar la UI.
- **Borradores y colaboración.** Un plano que todavía no existe se dibuja solo en local y se guarda con **Create**. La colaboración en vivo aplica a planos ya guardados.
- **Socket.IO es un relay.** El backend guía retransmite los puntos a la sala, pero no los guarda; en ese modo los puntos se persisten con **Save/Update**.

## Observabilidad

- **Backend:** `StompSessionEventLogger` registra cada conexión, suscripción y desconexión con el usuario y la sesión. Cada punto dibujado se registra en nivel `DEBUG` (`co.edu.eci.blueprints.realtime`). `/actuator/health` reporta el estado de la aplicación y de la base de datos.
- **Front:** la consola muestra los eventos `[STOMP]` y `[Socket.IO]` (conexión, suscripción, cierre, rechazos). La barra del editor muestra el estado de la conexión: Sin tiempo real, Conectando, Conectado, Reconectando o Sin conexión.

## Análisis

### Hallazgos

- **Reconexión con STOMP.** Si el backend se cae, `@stomp/stompjs` reintenta cada segundo y la UI muestra "Reconectando…". Al volver, el front se suscribe de nuevo y, como el servidor es la fuente de verdad, recarga el plano y la tabla por REST. No se pierden los puntos que otros dibujaron mientras la pestaña estuvo desconectada.
- **Reconexión con Socket.IO.** El cliente reconecta solo y vuelve a unirse a la sala, pero el backend guía no guarda estado: lo que se emitió durante la desconexión se pierde hasta que alguien guarda el plano.
- **Latencia.** En `localhost`, entre el clic en una pestaña y el repintado en la otra pasan pocos milisegundos (unos 3 ms con el backend guía de Socket.IO). Con STOMP se suma la escritura de cada punto en PostgreSQL. Para medirlo: DevTools → Network → WS → Messages muestra la hora de cada `SEND` y de cada `MESSAGE`.
- **Orden de entrada y errores de autenticación.** Con `setPreserveReceiveOrder(true)` Spring procesa en orden los frames de cada cliente, pero las excepciones de los interceptores solo se registran en el log y no le llegan al cliente como frame `ERROR`: un `CONNECT` con un token inválido se quedaba sin respuesta y la UI seguía en "Conectando…". Lo detectó la prueba de integración, así que esa opción no se activó; el orden por plano lo garantiza el servicio de dibujo.
- **Eco al remitente.** STOMP entrega la actualización también a quien dibujó, lo que sirve como confirmación de que el punto quedó guardado. Socket.IO (`socket.to(room)`) no se la envía al emisor, así que el front agrega el punto localmente.

### Socket.IO vs STOMP

| Aspecto           | Socket.IO                                            | STOMP sobre WebSocket (Spring)                                                         |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Protocolo         | Propio, sobre WebSocket con respaldo de long-polling | Estándar de mensajería basado en frames de texto                                       |
| Agrupación        | Salas (`join`, `to(room)`)                           | Destinos y tópicos (`/topic/...`), colas por usuario (`/user/...`)                     |
| Integración       | Servidor Socket.IO (Node u otra implementación)      | `@MessageMapping`, `SimpMessagingTemplate`, Spring Security                            |
| Reconexión        | Automática; hay que volver a unirse a la sala        | La da la librería cliente; hay que volver a suscribirse                                |
| Escalabilidad     | Requiere adaptadores (por ejemplo Redis) entre nodos | Se puede delegar a un broker externo (RabbitMQ, ActiveMQ) con `enableStompBrokerRelay` |
| Interoperabilidad | Cliente y servidor deben hablar Socket.IO            | Cualquier cliente STOMP                                                                |

Para este laboratorio STOMP encaja mejor porque comparte el backend, la seguridad JWT y la persistencia del CRUD. Socket.IO es más simple de levantar como servicio independiente.

## Casos de prueba mínimos

| Caso             | Cómo se verifica                                                                    |
| ---------------- | ----------------------------------------------------------------------------------- |
| Estado inicial   | Al abrir un plano se cargan sus puntos con `GET /api/v1/blueprints/{author}/{name}` |
| Dibujo local     | Cada clic agrega un punto y redibuja el lienzo                                      |
| RT multi-pestaña | Con dos pestañas en el mismo plano, los puntos aparecen en ambas                    |
| CRUD             | Create, Save/Update y Delete refrescan la tabla y el total del autor                |

## Pruebas automatizadas

```bash
npm run lint && npm test && npm run build    # front: ESLint + Prettier, Vitest, build
cd lab5/backend && mvn verify                # backend: JUnit
```

- **Front (Vitest + Testing Library):** cliente REST y sesión, transportes STOMP y Socket.IO, el hook de tiempo real, la tabla con el total y los flujos de Create, Save/Update y Delete con colaboración.
- **Backend (JUnit):** interceptor JWT de STOMP, servicio de dibujo colaborativo, publicador y controlador. `CollaborativeDrawingIntegrationTest` levanta la aplicación con H2 y usa clientes STOMP reales para comprobar la persistencia, el broadcast al tópico del plano, el aislamiento entre planos, los errores al remitente y el rechazo de conexiones sin token.

El workflow [`ci.yml`](./.github/workflows/ci.yml) corre ambas suites en cada push.

## Estructura

```
├─ src/
│  ├─ components/        # Workspace, tabla, lienzo, barra de acciones, login
│  ├─ hooks/             # editor del plano, planos del autor, tiempo real, sesión
│  ├─ lib/               # cliente REST, sesión JWT, clientes STOMP y Socket.IO
│  └─ realtime/          # transportes None / Socket.IO / STOMP
├─ tests/                # Vitest
├─ lab5/                 # copia del Lab 5
│  └─ backend/           # Spring Boot: CRUD + JWT + STOMP (realtime/, services/, security/)
├─ .github/workflows/    # CI
└─ ENUNCIADO.md          # enunciado original
```
