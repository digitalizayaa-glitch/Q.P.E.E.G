# Q.P.E.E.G

Aplicación web (PWA) de entrenamiento y nutrición. Funciona 100 % sin conexión y se instala en el teléfono.
Publicada en https://digitalizayaa-glitch.github.io/Q.P.E.E.G/

## Estructura

```
index.html                 Página única de la app
manifest.json              Datos de instalación (nombre, iconos, colores)
service-worker.js          Caché offline (la lista de archivos se genera, ver abajo)
styles/stylesheet.css      Todos los estilos
icons/                     Iconos de la app
supabase/                  Servidor de sincronización (esquema SQL y guía: supabase/LEEME.md)
scripts/
  core/config.js           Dirección y clave pública del servidor (vacío = sin sincronización)
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
    dialogos.js            Diálogos propios (confirmar, texto, aviso)
    historial.js           Historial y gráficas
    arranque.js            Arranque, ajuste al espacio y gestos
    figuras.js             Dibujos de los ejercicios
    ajustes.js             Ajustes (tema, color, avatar)
    nutricion.js           Test TDEE y plan
    comida.js              Registro de comida
    cuenta.js              Ajustes → Cuenta: crear/entrar/vincular y sincronizar
tests/
  unit/                    Lógica pura (Node, sin navegador)
  e2e/                     Interfaz real en Chromium (Playwright)
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
