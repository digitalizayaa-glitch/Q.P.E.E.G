/* Servidor de Cloudflare probado con una D1 simulada sobre SQLite (node:sqlite).  node --test tests/unit/ */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { handlers } from "../../cloudflare/worker.js";

function fakeD1() {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync(new URL("../../cloudflare/esquema.sql", import.meta.url), "utf8"));
    const stmt = (sql, args = []) => ({
        bind: (...a) => stmt(sql, a),
        first: async () => db.prepare(sql).get(...args) ?? null,
        run: async () => { db.prepare(sql).run(...args); return { success: true }; },
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

test("misma lógica que el SQL de Supabase: versiones y conflictos", async () => {
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

test("HTTP: respuestas como Supabase, CORS y validación", async () => {
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
