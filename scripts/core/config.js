/* Dónde vive la app y su servidor (ver wrangler.jsonc y cloudflare/LEEME.md).
   Desde la versión 2.0 la app y la sincronización están en el mismo Worker de Cloudflare.
   La "key" no es secreta (el servidor no la usa): la seguridad está en que los datos viajan
   cifrados con el código de cuenta. url vacía = la sincronización no aparece en la app. */
const QPEEG_HOME = "https://qpeeg.digitalizayaa.workers.dev";
const QPEEG_AT_HOME = typeof location !== "undefined" && location.origin === QPEEG_HOME;

const QPEEG_SYNC = {
    /* en casa: el mismo servidor que sirve la app; desde la dirección anterior: el servidor de siempre */
    url: QPEEG_AT_HOME ? QPEEG_HOME : "https://qpeeg-sync.digitalizayaa.workers.dev",
    key: "publica"
};

/* Mudanza de la app: abierta desde un dominio que termina en "from" (el anterior) enseña cómo pasarse a "to";
   abierta en "to", da la bienvenida (poner el código y cómo instalarla). to vacío = sin mudanza. */
const QPEEG_MOVE = {
    from: "github.io",
    to: QPEEG_HOME + "/"
};
