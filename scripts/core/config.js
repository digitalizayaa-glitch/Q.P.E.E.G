/* Servidor de sincronización: Cloudflare Worker + D1 (ver cloudflare/LEEME.md).
   Responde en las mismas rutas que Supabase. La "key" no es secreta (el servidor no la usa):
   la seguridad está en que los datos viajan cifrados con el código de cuenta.
   Vacío = la sincronización no aparece en la app. */
const QPEEG_SYNC = {
    url: "https://qpeeg-sync.digitalizayaa.workers.dev",
    key: "publica"
};
