# Servidor (Cloudflare Worker + D1)

Desde la 2.0 hay **un solo Worker, `qpeeg`**, en https://qpeeg.digitalizayaa.workers.dev: sirve los archivos de la
app y la sincronización. Se publica solo en cada push a `main` (Workers Builds ejecuta `npx wrangler deploy` con
`wrangler.jsonc`). No hay que subir nada a mano.

- `worker.js`: el servidor. Rutas `/rest/v1/rpc/qpeeg_*`; todo lo demás son archivos de la app (`/` = `index.html`).
- `esquema.sql`: tablas de la base D1 `qpeeg-sync` (id `825b350c-ea59-4235-ad1e-1b39195c15ee`). Usa
  `CREATE TABLE IF NOT EXISTS`: se puede volver a aplicar. Los cambios de esquema se aplican a mano antes de publicar.
- El Worker `qpeeg-sync` (https://qpeeg-sync.digitalizayaa.workers.dev) es el servidor anterior, con la misma base.
  Lo usa la dirección anterior de la app (GitHub Pages) mientras dura la mudanza; después se puede borrar.

El servidor no puede leer las cuentas: recibe bloques cifrados en el teléfono con una llave que sale del
código de cuenta, identificados por una huella del código (no el código).

| Tabla             | Contenido                                                                  |
|-------------------|----------------------------------------------------------------------------|
| `vaults`          | una fila por cuenta: huella, bloque cifrado, versión, fechas               |
| `vault_history`   | copias anteriores de cada cuenta (una cada 3 h como mucho, las 20 últimas) |
| `retired`         | cuentas dadas de baja (cambio de código o borrado): no se pueden recrear   |
| `pairs`           | códigos temporales de vinculación (10 min, un solo uso)                    |
| `app_errors`      | errores anónimos de la app                                                 |
| `shared_training` | datos de entrenamiento de quien aceptó compartirlos (sin cifrar, id anónimo) |

## Protección
- **Orígenes:** solo la app (su propio origen, la dirección anterior y `localhost:8080`). Otro dominio: añadirlo en
  `ALLOWED_ORIGINS` de `worker.js` o como variable de entorno `ALLOWED_ORIGINS` (separada por comas).
- **Tope de peticiones:** 120 por minuto por IP (binding `RL` en `wrangler.jsonc`); responde 429.
- **Cabeceras de seguridad** en los archivos (`_headers`) y política de contenido (CSP) en `index.html`.
- **Registros:** activados (`observability`); los errores 500 quedan con su traza en el panel del Worker.
- **Copias de la base:** D1 guarda sola el historial (Time Travel) para volver a un punto anterior:
  `npx wrangler d1 time-travel restore qpeeg-sync --timestamp=<fecha>`.

Pruebas: `node --test tests/unit/worker.test.mjs` (usa una D1 simulada sobre SQLite).

## Versiones anteriores y cambio de código (desde la 1.11.0)
- `vault_history`: antes de sobrescribir una cuenta se guarda una copia de la versión anterior, como mucho una cada 3 horas, y se conservan las 20 últimas. La app las lista en Ajustes → Cuenta → Versiones anteriores (`qpeeg_history`, `qpeeg_history_get`) y, antes de volver a una, guarda la actual (`qpeeg_snapshot`).
- `retired`: al cambiar el código, la cuenta vieja se borra con su historial y queda dada de baja (`qpeeg_retire`). Su código responde `[{ gone: true }]` y no se puede volver a crear.
- Si la base ya existía, crea las dos tablas nuevas con `esquema.sql` (usa `CREATE TABLE IF NOT EXISTS`).

## Límites y limpieza (desde la 1.12.0)
- 1 MB por cuenta (responde 413 y la app lo avisa). Si los datos del servidor pasan de 400 MB, no se crean cuentas nuevas (`qpeeg_put` → -3); las existentes siguen funcionando.
- `seen_at`: última vez que un teléfono abrió la cuenta (se anota como mucho una vez al día). En una base anterior: `ALTER TABLE vaults ADD COLUMN seen_at INTEGER; UPDATE vaults SET seen_at = updated_at;`
- Cron diario `23 9 * * *` (3:23 a. m. en Costa Rica): borra las cuentas sin uso en 76 días con sus copias, y los códigos temporales caducados. Si el teléfono vuelve después, sube lo que tiene y la cuenta se crea de nuevo.
- La app ya no consulta cada 90 s: sincroniza al abrir, al volver a la app, al salir, al recuperar la red y unos segundos después de cada cambio.

## Registro de errores (desde la 1.13.0)
- `qpeeg_error`: la app envía errores anónimos (mensaje técnico sin textos entre comillas ni números largos, versión y "iOS 17 · Safari 17"). Nada de cuentas ni datos.
- Tabla `app_errors`: los repetidos suman en `count`; 300 distintos como mucho; el cron borra los que llevan 60 días sin repetirse.
- Para verlos: `SELECT ver, count, msg, ua, datetime(last_at/1000,'unixepoch') FROM app_errors ORDER BY last_at DESC;`
