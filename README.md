# Q.P.E.E.G

Aplicación web (PWA) de entrenamiento y nutrición. Funciona sin conexión y se instala en el teléfono.

- **App:** https://qpeeg.digitalizayaa.workers.dev (Cloudflare; aquí viven la app y su servidor)
- **Dirección anterior:** https://digitalizayaa-glitch.github.io/Q.P.E.E.G/ (GitHub Pages; solo enseña cómo pasarse a la nueva)
- **Privacidad:** https://qpeeg.digitalizayaa.workers.dev/privacidad.html

## Cómo está montada

```
            push a main
                 │
   ┌─────────────┼──────────────────────────────┐
   ▼             ▼                              ▼
GitHub Actions   Cloudflare (Worker "qpeeg")    GitHub Pages
pruebas          app + sincronización + D1      dirección anterior
```

- Un solo Worker (`wrangler.jsonc`) sirve los archivos de la app y las rutas de sincronización
  (`cloudflare/worker.js`), con la base D1 `qpeeg-sync`, limpieza diaria, tope de peticiones por IP y registros.
- Sin compilación: los archivos se publican tal cual. `.assetsignore` deja fuera pruebas y herramientas.
- El Worker `qpeeg-sync` (el servidor anterior, misma base) sigue activo para la dirección anterior
  mientras dura la mudanza.

## Estructura

```
index.html                 Página única de la app (con la política de contenido, CSP)
privacidad.html, 404.html  Página pública de privacidad y página de "no encontrado"
manifest.json              Datos de instalación (nombre, iconos, colores)
service-worker.js          Caché offline (la lista de archivos se genera, ver abajo)
wrangler.jsonc             Configuración del Worker de Cloudflare
_headers, .assetsignore    Cabeceras de seguridad y archivos que no se publican
styles/stylesheet.css      Todos los estilos
icons/                     Iconos de la app
cloudflare/                Servidor: worker.js, esquema.sql y LEEME.md
scripts/
  core/tema.js             Tema claro/oscuro antes de pintar
  core/version.js          Versión de la app y novedades (CHANGELOG)
  core/config.js           Dirección de la app y del servidor, y mudanza
  core/errores.js          Registro anónimo de errores
  core/almacenamiento.js   IndexedDB + localStorage, versión de los datos y migraciones
  core/sincronizacion.js   Código de cuenta, cifrado, fusión de cambios y motor de sincronización
  app/                     Una pieza por área, se cargan en este orden (ver index.html):
    estado.js              Estado, limpieza de datos, guardar, respaldo
    inicio.js              Pantalla de inicio y logros
    semana.js              Pestaña Semana
    navegacion.js          Cambio entre secciones
    entreno.js             Entreno: pesos, repeticiones y semáforo
    rutinas.js             Creador de rutinas
    selector-numero.js     Cuadro para cambiar un número
    menu-emergente.js      Menús de selección
    dialogos.js            Diálogos propios (confirmar, texto, aviso, ventanas)
    historial.js           Historial, calendarios y gráficas
    arranque.js            Arranque, ajuste al espacio y gestos
    figuras.js             Dibujos de los ejercicios
    ajustes.js             Ajustes (tema, color, avatar, cuenta, privacidad)
    nutricion.js           Test TDEE y plan
    deportes.js            Deportes: tiempo, distancia, desnivel y carga
    comida-rapida.js       Catálogo de comida rápida y de supermercado
    comida.js              Registro de comida e historial del día
    cuenta.js              Cuenta: crear/entrar/vincular, versiones anteriores y sincronizar
    legal-textos.js        Textos de la política de privacidad y del aviso de salud
    legal.js               Acuerdos, compartir datos de entrenamiento (opcional) y borrar la cuenta
    novedades.js           Versión en la pantalla de inicio y aviso de novedades
    instalar.js            Guía para instalar, mudanza y bienvenida
    privacidad.js          Solo para privacidad.html
tests/
  unit/                    Lógica pura y servidor (Node, sin navegador; D1 simulada con SQLite)
  e2e/                     Interfaz real en Chromium y WebKit (Playwright)
tools/build-sw.mjs         Genera la caché del service worker
```

## Datos del usuario

- Se guardan en **IndexedDB** (copia principal) y en **localStorage** (espejo para arrancar al instante).
  Al abrir, gana el guardado más reciente de los dos.
- Cada guardado lleva `meta = { schema, savedAt, device }`.
- **Cambiar la forma de los datos:** sube `SCHEMA_VERSION` en `scripts/core/almacenamiento.js`
  y añade la migración `MIGRATIONS[n]` que convierte los datos de la versión anterior. Añade una prueba.

## Cuenta y sincronización

- La cuenta es un código de 20 caracteres (sin correo ni contraseña). Del código salen en el teléfono la llave
  de cifrado y el identificador; el código nunca se envía.
- Al sincronizar se hace una fusión a tres bandas (última versión común, este teléfono, servidor): se juntan los
  cambios de los dos lados; si los dos cambiaron el mismo dato, gana el más reciente.
- No se aplican cambios de otro teléfono mientras se entrena o hay una ventana de edición abierta.
- Para vincular otro teléfono sin teclear el código largo: código temporal de 8 caracteres, 10 min, un solo uso.

## Publicar una versión

1. Sube `APP_VERSION` en `scripts/core/version.js` y `version` en `package.json` (las pruebas comprueban que coincidan).
2. Añade arriba en `CHANGELOG` lo nuevo, en frases cortas para el usuario: cada teléfono lo verá una vez al actualizarse.
   Un arreglo rápido (hotfix) solo sube el último número y no lleva notas.
3. `npm run build:sw && npm run check && npm test` y push a `main`: Cloudflare publica la app y el servidor
   (unos 30 s) y GitHub Pages la dirección anterior. Si cambió `cloudflare/esquema.sql`, aplícalo antes en la base D1.

## Desarrollo

```sh
npm run serve        # http://localhost:8080
npm run check        # sintaxis + caché del service worker al día
npm test             # pruebas de lógica
npm run test:e2e     # pruebas de interfaz (requiere: pip install playwright && python -m playwright install chromium)
```

Activa una vez el gancho que regenera la caché en cada commit:

```sh
git config core.hooksPath .githooks
```

Sin el gancho, ejecuta `npm run build:sw` antes de publicar. GitHub Actions comprueba todo en cada push.

Pendientes y fases del proyecto: `PENDIENTES.md`.
