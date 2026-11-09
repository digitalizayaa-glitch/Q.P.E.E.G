# Servidor de sincronización (Cloudflare Worker + D1)

Publicado en **https://qpeeg-sync.digitalizayaa.workers.dev** (cuenta digitalizayaa@gmail.com).

- `worker.js`: el servidor. Responde en las mismas rutas que Supabase (`/rest/v1/rpc/qpeeg_*`), así la app
  no depende de qué servidor se use.
- `esquema.sql`: tablas de la base D1 `qpeeg-sync` (id `825b350c-ea59-4235-ad1e-1b39195c15ee`).

El servidor no puede leer los datos: recibe bloques cifrados en el teléfono con una llave que sale del
código de cuenta, identificados por una huella del código (no el código).

| Tabla    | Contenido                                                      |
|----------|----------------------------------------------------------------|
| `vaults` | una fila por cuenta: huella, bloque cifrado, versión, fecha     |
| `pairs`  | códigos temporales de vinculación (10 min, se borran al usarse) |

Solo se aceptan peticiones del navegador desde la app publicada (GitHub Pages, `*.workers.dev`, `*.pages.dev`);
para otro dominio, añadirlo en `ALLOWED_ORIGINS` (o como variable de entorno `ALLOWED_ORIGINS`, separada por comas).

Límites: hasta ~1,9 MB por cuenta (D1 admite filas de ~2 MB). En el plan gratuito de Cloudflare no se pausa.

Pruebas: `node --test tests/unit/worker.test.mjs` (usa una D1 simulada sobre SQLite).
