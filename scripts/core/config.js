/* Servidor de sincronización: Cloudflare Worker + D1 (ver cloudflare/LEEME.md).
   Responde en las mismas rutas que Supabase. La "key" no es secreta (el servidor no la usa):
   la seguridad está en que los datos viajan cifrados con el código de cuenta.
   Vacío = la sincronización no aparece en la app. */
const QPEEG_SYNC = {
    url: "https://qpeeg-sync.digitalizayaa.workers.dev",
    key: "publica"
};

/* Mudanza de la app: abierta desde un dominio que termina en "from" (el viejo) enseña cómo pasarse a "to";
   abierta en "to", da la bienvenida (poner el código y cómo instalarla). to vacío = sin mudanza. */
const QPEEG_MOVE = {
    from: "github.io",
    to: "https://qpeeg.digitalizayaa.workers.dev/"
};
