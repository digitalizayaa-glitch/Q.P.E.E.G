/* =========================================================
    Q.P.E.E.G · servidor de sincronización (Cloudflare Worker + D1)

    Responde en las mismas rutas que usaba Supabase, así la app no cambia:
      POST /rest/v1/rpc/qpeeg_get        { p_id }                 → [{ blob, rev }] o []
      POST /rest/v1/rpc/qpeeg_put        { p_id, p_blob, p_rev }  → nueva versión, o -1 si otro teléfono guardó antes
      POST /rest/v1/rpc/qpeeg_pair_put   { p_id, p_payload }      → (vacío)   código temporal, 10 min
      POST /rest/v1/rpc/qpeeg_pair_take  { p_id }                 → payload o null (un solo uso)
    Todo lo demás lo sirven los archivos de la app (si están publicados en este Worker).
    El servidor nunca ve los datos: solo bloques cifrados en el teléfono.
========================================================= */

const ID_RE = /^[0-9a-f]{64}$/;
const MAX_BLOB = 1_900_000;          /* D1 admite filas de hasta ~2 MB */
const MAX_PAYLOAD = 4000;
const PAIR_TTL = 10 * 60 * 1000;
const ALLOWED_ORIGINS = [
    "https://digitalizayaa-glitch.github.io",
    "http://localhost:8080"
];

function cors(origin, env) {
    const extra = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const ok = origin && (ALLOWED_ORIGINS.includes(origin) || extra.includes(origin) || /\.workers\.dev$|\.pages\.dev$/.test(new URL(origin).hostname));
    return ok ? {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
    } : { "Vary": "Origin" };
}

const json = (data, status, headers) => new Response(data === undefined ? "" : JSON.stringify(data), {
    status, headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, headers)
});

class BadRequest extends Error {}
const needId = id => { if (typeof id !== "string" || !ID_RE.test(id)) throw new BadRequest("id no válido"); return id; };
const needText = (t, max, name) => { if (typeof t !== "string" || !t || t.length > max) throw new BadRequest(name + " no válido"); return t; };

export const handlers = {
    async qpeeg_get(db, a) {
        const row = await db.prepare("SELECT blob, rev FROM vaults WHERE id = ?").bind(needId(a.p_id)).first();
        return row ? [{ blob: row.blob, rev: row.rev }] : [];
    },

    async qpeeg_put(db, a) {
        const id = needId(a.p_id);
        const blob = needText(a.p_blob, MAX_BLOB, "blob");
        const rev = Number(a.p_rev);
        if (!Number.isInteger(rev) || rev < 0) throw new BadRequest("rev no válido");
        const now = Date.now();
        const row = rev === 0
            ? await db.prepare("INSERT INTO vaults (id, blob, rev, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT (id) DO NOTHING RETURNING rev").bind(id, blob, now).first()
            : await db.prepare("UPDATE vaults SET blob = ?, rev = rev + 1, updated_at = ? WHERE id = ? AND rev = ? RETURNING rev").bind(blob, now, id, rev).first();
        return row ? row.rev : -1;
    },

    async qpeeg_pair_put(db, a) {
        const id = needId(a.p_id);
        const payload = needText(a.p_payload, MAX_PAYLOAD, "payload");
        const now = Date.now();
        await db.batch([
            db.prepare("DELETE FROM pairs WHERE expires_at < ?").bind(now),
            db.prepare("INSERT INTO pairs (id, payload, expires_at) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at").bind(id, payload, now + PAIR_TTL)
        ]);
        return undefined;
    },

    async qpeeg_pair_take(db, a) {
        const id = needId(a.p_id);
        const now = Date.now();
        await db.prepare("DELETE FROM pairs WHERE expires_at < ?").bind(now).run();
        const row = await db.prepare("DELETE FROM pairs WHERE id = ? RETURNING payload").bind(id).first();
        return row ? row.payload : null;
    }
};

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = request.headers.get("Origin");
        const corsHeaders = cors(origin, env);
        const m = url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/);

        if (!m) {
            if (env.ASSETS) return env.ASSETS.fetch(request);       /* la app */
            return json({ app: "qpeeg-sync", ok: true }, 200, corsHeaders);
        }
        if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
        if (request.method !== "POST") return json({ error: "método" }, 405, corsHeaders);
        const fn = Object.hasOwn(handlers, m[1]) ? handlers[m[1]] : null;   /* solo las cuatro funciones propias */
        if (!fn) return json({ error: "función desconocida" }, 404, corsHeaders);

        try {
            const len = Number(request.headers.get("Content-Length") || 0);
            if (len > MAX_BLOB + 10_000) return json({ error: "demasiado grande" }, 413, corsHeaders);
            const args = await request.json();
            if (!args || typeof args !== "object") throw new BadRequest("cuerpo no válido");
            const out = await fn(env.DB, args);
            return out === undefined ? new Response("", { status: 200, headers: corsHeaders }) : json(out, 200, corsHeaders);
        } catch (e) {
            if (e instanceof BadRequest || e instanceof SyntaxError) return json({ error: e.message }, 400, corsHeaders);
            return json({ error: "error del servidor" }, 500, corsHeaders);
        }
    }
};
