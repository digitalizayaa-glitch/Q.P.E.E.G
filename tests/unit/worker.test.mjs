/* Servidor de Cloudflare probado con una D1 simulada sobre SQLite (node:sqlite).  node --test tests/unit/ */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { handlers, cleanup, LIMITS, SECURITY_HEADERS } from "../../cloudflare/worker.js";

function fakeD1() {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("../../cloudflare/esquema.sql", import.meta.url), "utf8"));
    const stmt = (sql, args = []) => ({
        bind: (...a) => stmt(sql, a),
        first: async () => db.prepare(sql).get(...args) ?? null,
        run: async () => { db.prepare(sql).run(...args); return { success: true }; },
        all: async () => ({ results: db.prepare(sql).all(...args) }),
        _exec: () => db.prepare(sql).run(...args)
    });
    return {
        prepare: sql => stmt(sql),
        batch: async list => { db.exec("BEGIN"); try { list.forEach(s => s._exec()); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } }
    };
}
const ID = "a".repeat(64), ID2 = "b".repeat(64);
const call = (env, name, body, origin = "https://digitalizayaa-glitch.github.io") =>
    worker.fetch(new Request("https://x.workers.dev/rest/v1/rpc/" + name, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) }), env);

test("versiones y conflictos", async () => {
    const db = fakeD1();
    assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "x1", p_rev: 0 }), 1);
    assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "x2", p_rev: 0 }), -1, "crear dos veces = conflicto");
    assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "x3", p_rev: 1 }), 2);
    assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "x4", p_rev: 1 }), -1, "versión vieja = conflicto");
    assert.deepEqual(await handlers.qpeeg_get(db, { p_id: ID }), [{ blob: "x3", rev: 2 }]);
    assert.deepEqual(await handlers.qpeeg_get(db, { p_id: ID2 }), []);
});

test("código temporal: un solo uso", async () => {
    const db = fakeD1();
    assert.equal(await handlers.qpeeg_pair_put(db, { p_id: ID, p_payload: "cifrado" }), undefined);
    assert.equal(await handlers.qpeeg_pair_take(db, { p_id: ID }), "cifrado");
    assert.equal(await handlers.qpeeg_pair_take(db, { p_id: ID }), null);
});

test("HTTP: respuestas, CORS y validación", async () => {
    const env = { DB: fakeD1() };
    let r = await call(env, "qpeeg_put", { p_id: ID, p_blob: "z", p_rev: 0 });
    assert.equal(r.status, 200); assert.equal(await r.json(), 1);
    assert.equal(r.headers.get("Access-Control-Allow-Origin"), "https://digitalizayaa-glitch.github.io");
    r = await call(env, "qpeeg_get", { p_id: ID });
    assert.deepEqual(await r.json(), [{ blob: "z", rev: 1 }]);
    r = await call(env, "qpeeg_pair_put", { p_id: ID2, p_payload: "p" });
    assert.equal(r.status, 200); assert.equal(await r.text(), "");
    r = await call(env, "qpeeg_pair_take", { p_id: ID2 });
    assert.equal(await r.json(), "p");
    r = await call(env, "qpeeg_pair_take", { p_id: ID2 });
    assert.equal(await r.json(), null);
    r = await call(env, "qpeeg_get", { p_id: "malo" });
    assert.equal(r.status, 400);
    r = await call(env, "borrar_todo", {});
    assert.equal(r.status, 404);
    r = await call(env, "constructor", {});
    assert.equal(r.status, 404, "nombres heredados no cuentan como funciones");
    r = await call(env, "qpeeg_get", { p_id: ID }, "https://sitio-malo.com");
    assert.equal(r.headers.get("Access-Control-Allow-Origin"), null, "otros sitios no pueden usarlo desde el navegador");
    r = await worker.fetch(new Request("https://x.workers.dev/rest/v1/rpc/qpeeg_get", { method: "OPTIONS", headers: { Origin: "https://digitalizayaa-glitch.github.io" } }), env);
    assert.equal(r.status, 204);
});

test("el cliente de la app funciona contra el Worker (dos teléfonos)", async () => {
    const { createRequire } = await import("node:module");
    const QSync = createRequire(import.meta.url)("../../scripts/core/sincronizacion.js");
    const env = { DB: fakeD1() };
    const rpc = QSync.client({ url: "https://x.workers.dev", key: "publica" },
        (url, init) => worker.fetch(new Request(url, init), env));
    const code = QSync.newAccountCode();
    const acc = await QSync.accountFromCode(code);
    const phone = () => {
        const ph = { data: { routines: [] }, savedAt: 0, acc: structuredClone(acc) };
        ph.engine = QSync.engine({ rpc, getLocal: () => ({ data: structuredClone(ph.data), savedAt: ph.savedAt }),
            applyRemote: d => { ph.data = structuredClone(d); return true; },
            loadAccount: async () => structuredClone(ph.acc), saveAccount: async a => { ph.acc = structuredClone(a); } });
        return ph;
    };
    const A = phone(), B = phone();
    A.data.routines.push({ id: "r1", name: "Push" }); A.savedAt = 1;
    B.data.routines.push({ id: "r2", name: "Pierna" }); B.savedAt = 2;
    assert.deepEqual(await Promise.all([A.engine.sync(), B.engine.sync()]), ["ok", "ok"]);
    await A.engine.sync(); await B.engine.sync();
    assert.deepEqual(A.data, B.data);
    assert.equal(A.data.routines.length, 2);
    const pair = await QSync.publishPair(rpc, code);
    assert.equal(await QSync.takePair(rpc, pair), code);
});

test("historial: una copia cada 3 horas como mucho, se guardan las 20 últimas", async () => {
    const db = fakeD1();
    const realNow = Date.now;
    let t = 1_800_000_000_000;
    Date.now = () => t;
    try {
        assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "v1", p_rev: 0 }), 1);
        assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "v2", p_rev: 1 }), 2);   /* primera copia: v1 */
        t += 60_000;
        assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "v3", p_rev: 2 }), 3);   /* hace 1 min: sin copia */
        let h = await handlers.qpeeg_history(db, { p_id: ID });
        assert.deepEqual(h.map(x => x.rev), [1]);
        assert.deepEqual(await handlers.qpeeg_history_get(db, { p_id: ID, p_rev: 1 }), [{ blob: "v1", rev: 1 }]);
        t += 3 * 3600 * 1000 + 1;
        assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "v4", p_rev: 3 }), 4);   /* 3 h después: copia de v3 */
        h = await handlers.qpeeg_history(db, { p_id: ID });
        assert.deepEqual(h.map(x => x.rev), [3, 1]);
        /* un conflicto no guarda copia */
        t += 4 * 3600 * 1000;
        assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "x", p_rev: 1 }), -1);
        assert.deepEqual((await handlers.qpeeg_history(db, { p_id: ID })).map(x => x.rev), [3, 1]);
        /* copia a pedido (antes de volver a una versión) y tope de 20 */
        await handlers.qpeeg_snapshot(db, { p_id: ID });
        assert.deepEqual((await handlers.qpeeg_history(db, { p_id: ID })).map(x => x.rev), [4, 3, 1]);
        let rev = 4;
        for (let i = 0; i < 25; i++) { t += 4 * 3600 * 1000; rev = await handlers.qpeeg_put(db, { p_id: ID, p_blob: "w" + i, p_rev: rev }); }
        h = await handlers.qpeeg_history(db, { p_id: ID });
        assert.equal(h.length, 20);
        assert.equal(h[0].rev, rev - 1);
    } finally { Date.now = realNow; }
});

test("cambio de código: la cuenta vieja queda dada de baja y no se puede recrear", async () => {
    const db = fakeD1();
    await handlers.qpeeg_put(db, { p_id: ID, p_blob: "v1", p_rev: 0 });
    await handlers.qpeeg_snapshot(db, { p_id: ID });
    await handlers.qpeeg_retire(db, { p_id: ID });
    assert.deepEqual(await handlers.qpeeg_get(db, { p_id: ID }), [{ gone: true }]);
    assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "otra", p_rev: 0 }), -2);
    assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "otra", p_rev: 1 }), -2);
    assert.deepEqual(await handlers.qpeeg_history(db, { p_id: ID }), [], "el historial del código viejo también se borra");
    assert.deepEqual(await handlers.qpeeg_get(db, { p_id: ID2 }), [], "las demás cuentas no cambian");
});

test("tamaño: 1 MB por cuenta (413) y no se crean cuentas si el servidor está lleno", async () => {
    const env = { DB: fakeD1() };
    const big = "x".repeat(1_000_001);
    let r = await call(env, "qpeeg_put", { p_id: ID, p_blob: big, p_rev: 0 });
    assert.equal(r.status, 413);
    r = await call(env, "qpeeg_put", { p_id: ID, p_blob: "x".repeat(900_000), p_rev: 0 });
    assert.equal(await r.json(), 1, "menos de 1 MB sí entra");
    const before = LIMITS.total;
    LIMITS.total = 1_000_000;
    try {
        assert.equal(await handlers.qpeeg_put(env.DB, { p_id: ID2, p_blob: "y".repeat(200_000), p_rev: 0 }), -3, "lleno: cuenta nueva no");
        assert.equal(await handlers.qpeeg_put(env.DB, { p_id: ID, p_blob: "z", p_rev: 1 }), 2, "lleno: las que existen siguen guardando");
    } finally { LIMITS.total = before; }
});

test("limpieza diaria: se borran las cuentas sin uso en 2 meses y medio, con sus copias", async () => {
    const db = fakeD1();
    const realNow = Date.now;
    const DAY = 86400 * 1000;
    let t = 1_800_000_000_000;
    Date.now = () => t;
    try {
        await handlers.qpeeg_put(db, { p_id: ID, p_blob: "vieja", p_rev: 0 });
        await handlers.qpeeg_put(db, { p_id: ID, p_blob: "vieja2", p_rev: 1 });     /* deja una copia */
        await handlers.qpeeg_put(db, { p_id: ID2, p_blob: "usada", p_rev: 0 });
        t += 70 * DAY;
        await handlers.qpeeg_get(db, { p_id: ID2 });                                  /* solo abrirla cuenta como uso */
        t += 10 * DAY;                                                                /* ID: 80 días sin uso; ID2: 10 */
        assert.equal(await cleanup(db, t), 1);
        assert.deepEqual(await handlers.qpeeg_get(db, { p_id: ID }), []);
        assert.deepEqual(await handlers.qpeeg_history(db, { p_id: ID }), [], "sus copias también");
        assert.equal((await handlers.qpeeg_get(db, { p_id: ID2 }))[0].blob, "usada");
        /* si el teléfono vuelve, sube lo que tiene y la cuenta se crea de nuevo */
        assert.equal(await handlers.qpeeg_put(db, { p_id: ID, p_blob: "desde el teléfono", p_rev: 0 }), 1);
        /* 75 días después nada se borra (la última apertura fue hace 75 días); a los 77 sí */
        t += 75 * DAY;
        assert.equal(await cleanup(db, t), 0);
        t += 2 * DAY;
        assert.equal(await cleanup(db, t), 2);
    } finally { Date.now = realNow; }
});

test("errores: los repetidos suman, con tope y sin datos raros", async () => {
    const db = fakeD1();
    const e = { p_msg: "x is not a function", p_stack: "TypeError\n at render (scripts/app/comida.js:10:5)", p_ver: "1.13.0", p_ua: "iOS 17 · Safari 17" };
    await handlers.qpeeg_error(db, e);
    await handlers.qpeeg_error(db, e);
    await handlers.qpeeg_error(db, { ...e, p_ver: "1.13.1" });
    const rows = await db.prepare("SELECT ver, count FROM app_errors ORDER BY ver").all();
    assert.deepEqual(rows.results.map(r => [r.ver, r.count]), [["1.13.0", 2], ["1.13.1", 1]]);
    await assert.rejects(handlers.qpeeg_error(db, { p_msg: "" }), /mensaje/);
    await assert.rejects(handlers.qpeeg_error(db, { p_msg: "x".repeat(301) }), /mensaje/);
    for (let i = 0; i < 310; i++) await handlers.qpeeg_error(db, { ...e, p_msg: "error " + i });
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM app_errors").first()).n, 300);
});

test("datos compartidos: solo con id anónimo, se reemplazan, se borran al retirarlos y por la limpieza", async () => {
    const db = fakeD1();
    const data = JSON.stringify({ logs: { "2026-11-11": [] } });
    assert.equal(await handlers.qpeeg_share(db, { p_id: ID, p_ver: "1.15.0", p_data: data }), undefined);
    assert.equal(await handlers.qpeeg_share(db, { p_id: ID, p_ver: "1.15.0", p_data: data }), undefined, "se reemplaza");
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM shared_training").first()).n, 1);
    await assert.rejects(handlers.qpeeg_share(db, { p_id: ID, p_data: "no es json" }));
    await assert.rejects(handlers.qpeeg_share(db, { p_id: ID, p_data: "x".repeat(300_001) }));
    assert.equal(await handlers.qpeeg_share(db, { p_id: ID, p_data: null }), undefined);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM shared_training").first()).n, 0, "retirar lo borra");
    await handlers.qpeeg_share(db, { p_id: ID2, p_ver: "1", p_data: data });
    await cleanup(db, Date.now() + 77 * 86400 * 1000);
    assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM shared_training").first()).n, 0, "76 días sin actualizar");
});

test("un solo Worker: sirve la app (\"/\" = index.html) con cabeceras de seguridad, CORS exacto y tope de peticiones", async () => {
    const seen = [];
    const env = { DB: fakeD1(), ASSETS: { fetch: async req => { seen.push(new URL(req.url).pathname); return new Response("<html>", { status: 200, headers: { "Content-Type": "text/html" } }); } } };
    let r = await worker.fetch(new Request("https://qpeeg.digitalizayaa.workers.dev/"), env);
    assert.equal(r.status, 200); assert.deepEqual(seen, ["/index.html"]);
    for (const k in SECURITY_HEADERS) assert.equal(r.headers.get(k), SECURITY_HEADERS[k], k);
    assert.equal(r.headers.get("Cache-Control"), "no-cache");
    r = await worker.fetch(new Request("https://qpeeg.digitalizayaa.workers.dev/no-existe"), env);
    assert.equal(seen[1], "/no-existe");
    /* mismo origen y la app anterior sí; cualquier otro workers.dev ya no */
    const post = (origin, e = env) => worker.fetch(new Request("https://qpeeg.digitalizayaa.workers.dev/rest/v1/rpc/qpeeg_get", { method: "POST", headers: { "Content-Type": "application/json", Origin: origin, "CF-Connecting-IP": "1.2.3.4" }, body: JSON.stringify({ p_id: ID }) }), e);
    assert.equal((await post("https://qpeeg.digitalizayaa.workers.dev")).headers.get("Access-Control-Allow-Origin"), "https://qpeeg.digitalizayaa.workers.dev");
    assert.equal((await post("https://digitalizayaa-glitch.github.io")).headers.get("Access-Control-Allow-Origin"), "https://digitalizayaa-glitch.github.io");
    assert.equal((await post("https://otro.workers.dev")).headers.get("Access-Control-Allow-Origin"), null);
    /* tope por IP */
    let n = 0;
    const limited = { ...env, RL: { limit: async ({ key }) => { assert.equal(key, "1.2.3.4"); return { success: ++n <= 2 }; } } };
    assert.equal((await post("https://qpeeg.digitalizayaa.workers.dev", limited)).status, 200);
    assert.equal((await post("https://qpeeg.digitalizayaa.workers.dev", limited)).status, 200);
    r = await post("https://qpeeg.digitalizayaa.workers.dev", limited);
    assert.equal(r.status, 429); assert.equal(r.headers.get("Retry-After"), "60");
    const broken = { ...env, RL: { limit: async () => { throw new Error("x"); } } };
    assert.equal((await post("https://qpeeg.digitalizayaa.workers.dev", broken)).status, 200, "si el contador falla no se bloquea a nadie");
});
