/* Service worker: guarda los archivos de la app para que funcione offline e instalada.
   Estrategia: primero la caché, si no está, la red.
   CACHE_NAME y CORE_ASSETS los genera `node tools/build-sw.mjs` (no editarlos a mano):
   el nombre lleva un hash del contenido, así cada cambio publica una caché nueva sola. */

/* <generado> */
const CACHE_NAME = "qpeeg-3cfbc6edd0";
const CORE_ASSETS = [
    "./",
    "./icons/apple-touch-icon.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./index.html",
    "./manifest.json",
    "./scripts/app/ajustes.js",
    "./scripts/app/arranque.js",
    "./scripts/app/comida.js",
    "./scripts/app/cuenta.js",
    "./scripts/app/dialogos.js",
    "./scripts/app/entreno.js",
    "./scripts/app/estado.js",
    "./scripts/app/figuras.js",
    "./scripts/app/historial.js",
    "./scripts/app/inicio.js",
    "./scripts/app/menu-emergente.js",
    "./scripts/app/navegacion.js",
    "./scripts/app/nutricion.js",
    "./scripts/app/rutinas.js",
    "./scripts/app/selector-numero.js",
    "./scripts/app/semana.js",
    "./scripts/core/almacenamiento.js",
    "./scripts/core/config.js",
    "./scripts/core/sincronizacion.js",
    "./styles/stylesheet.css"
];
/* </generado> */

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            /* cache: "reload" se salta la caché HTTP del servidor y baja la versión nueva de verdad */
            .then((cache) => cache.addAll(CORE_ASSETS.map((url) => new Request(url, { cache: "reload" }))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys.filter((key) => key.startsWith("qpeeg-") && key !== CACHE_NAME).map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    if (new URL(event.request.url).origin !== self.location.origin) return;   /* el futuro servidor de sincronización va directo a la red */

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then((cached) => {
            if (cached) return cached;
            return fetch(event.request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return response;
                })
                /* sin red: las páginas caen en la app; el resto simplemente falla */
                .catch(() => (event.request.mode === "navigate" ? caches.match("./index.html") : Response.error()));
        })
    );
});
