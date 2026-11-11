/* Pruebas de la sincronización: códigos, cifrado, fusión y el motor con un servidor simulado. */
const test = require("node:test");
const assert = require("node:assert/strict");
const QSync = require("../../scripts/core/sincronizacion.js");

test("código de cuenta: formato, verificación y errores de tecleo", () => {
    const code = QSync.newAccountCode();
    assert.match(code, /^[2-9A-Z]{4}(-[2-9A-Z]{4}){4}$/);
    assert.equal(QSync.parseCode(code).kind, "account");
    assert.equal(QSync.parseCode(code.toLowerCase().replace(/-/g, " ")).kind, "account", "acepta minúsculas y espacios");
    const raw = code.replace(/-/g, "");
    const typo = raw.slice(0, 5) + (raw[5] === "A" ? "B" : "A") + raw.slice(6);
    assert.equal(QSync.parseCode(typo).error, "check", "detecta una letra cambiada");
    const swapped = raw.slice(0, 2) + raw[3] + raw[2] + raw.slice(4);
    if (raw[2] !== raw[3]) assert.equal(QSync.parseCode(swapped).error, "check", "detecta dos letras intercambiadas");
    assert.equal(QSync.parseCode("ABCD").error, "length");
    assert.equal(QSync.parseCode("A0CD-EFGH").error, "chars");
    assert.equal(QSync.parseCode(QSync.newPairCode()).kind, "pair");
    const many = new Set(Array.from({ length: 200 }, QSync.newAccountCode));
    assert.equal(many.size, 200);
});

test("la misma cuenta da la misma llave en cualquier teléfono; cuentas distintas no", async () => {
    const code = QSync.newAccountCode();
    const a = await QSync.deriveFrom(code, "cuenta");
    const b = await QSync.deriveFrom(code.toLowerCase(), "cuenta");
    const c = await QSync.deriveFrom(QSync.newAccountCode(), "cuenta");
    assert.deepEqual(a, b);
    assert.notEqual(a.id, c.id);
    assert.match(a.id, /^[0-9a-f]{64}$/);
    assert.ok(!a.id.includes(code), "el identificador no revela el código");
});

test("cifrado: ida y vuelta, y no se abre con otra llave ni en otra cuenta", async () => {
    const acc = await QSync.accountFromCode(QSync.newAccountCode());
    const other = await QSync.accountFromCode(QSync.newAccountCode());
    const data = { routines: [{ id: "r1", name: "Pierna" }], texto: "ñandú ✓".repeat(50) };
    const box = await QSync.seal(data, acc.keyRaw, acc.id);
    assert.ok(!box.includes("Pierna"), "el servidor no ve el contenido");
    assert.deepEqual(await QSync.open(box, acc.keyRaw, acc.id), data);
    await assert.rejects(QSync.open(box, other.keyRaw, acc.id));
    await assert.rejects(QSync.open(box, acc.keyRaw, other.id));
});

test("fusión: cambios distintos en cada teléfono se juntan", () => {
    const base = { routines: [{ id: "r1", name: "Push", days: [] }], logs: { r1: { "2026-11-01": { reps: [8] } } }, achievements: [] };
    const mine = structuredClone(base);
    mine.logs.r1["2026-11-02"] = { reps: [10] };                 /* entrené en el teléfono A */
    mine.routines[0].name = "Empuje";
    const theirs = structuredClone(base);
    theirs.routines.push({ id: "r2", name: "Pierna", days: [] }); /* creé una rutina en el B */
    theirs.food = { log: { "2026-11-02": [{ id: "f1" }] } };
    const out = QSync.merge(base, mine, theirs, true);
    assert.deepEqual(out.routines.map(r => r.name).sort(), ["Empuje", "Pierna"]);
    assert.deepEqual(Object.keys(out.logs.r1).sort(), ["2026-11-01", "2026-11-02"]);
    assert.ok(out.food.log["2026-11-02"]);
});

test("fusión: borrar en un lado se respeta; borrar contra editar conserva lo editado", () => {
    const base = { routines: [{ id: "r1", name: "A" }, { id: "r2", name: "B" }] };
    const mine = { routines: [{ id: "r2", name: "B" }] };           /* borré r1 */
    const theirs = structuredClone(base);
    assert.deepEqual(QSync.merge(base, mine, theirs, true).routines.map(r => r.id), ["r2"]);
    const edited = { routines: [{ id: "r1", name: "A editada" }, { id: "r2", name: "B" }] };
    assert.deepEqual(QSync.merge(base, mine, edited, true).routines.map(r => r.name), ["A editada", "B"]);
    const logBase = { logs: { r1: { d1: { x: 1 } } } };
    assert.deepEqual(QSync.merge(logBase, { logs: { r1: {} } }, logBase, true), { logs: { r1: {} } });
});

test("fusión: el mismo valor cambiado en los dos lados → gana el más reciente", () => {
    const base = { settings: { theme: "dark" } };
    const out1 = QSync.merge(base, { settings: { theme: "light" } }, { settings: { theme: "dark2" } }, true);
    const out2 = QSync.merge(base, { settings: { theme: "light" } }, { settings: { theme: "dark2" } }, false);
    assert.equal(out1.settings.theme, "dark2");
    assert.equal(out2.settings.theme, "light");
});

test("fusión al unir dos teléfonos sin base común: se suman las dos listas", () => {
    const out = QSync.merge({}, { routines: [{ id: "a", name: "A" }] }, { routines: [{ id: "b", name: "B" }] }, true);
    assert.deepEqual(out.routines.map(r => r.id).sort(), ["a", "b"]);
});

/* Servidor simulado con la misma lógica que el SQL */
function fakeServer() {
    const vaults = new Map(), pairs = new Map(), retired = new Set();
    const rpc = async (name, a) => {
        await new Promise(r => setTimeout(r, Math.random() * 3));
        if (name === "qpeeg_get") { const v = vaults.get(a.p_id); return v ? [{ blob: v.blob, rev: v.rev }] : retired.has(a.p_id) ? [{ gone: true }] : []; }
        if (name === "qpeeg_put") {
            if (retired.has(a.p_id)) return -2;
            const v = vaults.get(a.p_id);
            if (a.p_rev === 0) { if (v) return -1; vaults.set(a.p_id, { blob: a.p_blob, rev: 1 }); return 1; }
            if (!v || v.rev !== a.p_rev) return -1;
            v.blob = a.p_blob; v.rev++; return v.rev;
        }
        if (name === "qpeeg_retire") { vaults.delete(a.p_id); retired.add(a.p_id); return null; }
        if (name === "qpeeg_pair_put") { pairs.set(a.p_id, a.p_payload); return null; }
        if (name === "qpeeg_pair_take") { const p = pairs.get(a.p_id) || null; pairs.delete(a.p_id); return p; }
        throw new Error(name);
    };
    return { rpc, vaults, retired };
}
function phone(server, acc) {
    const ph = { data: { routines: [], logs: {} }, savedAt: 0, acc: acc && structuredClone(acc), busy: false };
    ph.engine = QSync.engine({
        rpc: server.rpc,
        getLocal: () => ({ data: structuredClone(ph.data), savedAt: ph.savedAt }),
        applyRemote: d => { if (ph.busy) return false; ph.data = structuredClone(d); return true; },
        loadAccount: async () => ph.acc && structuredClone(ph.acc),
        saveAccount: async a => { ph.acc = structuredClone(a); }
    });
    ph.edit = fn => { fn(ph.data); ph.savedAt = Date.now() + Math.random(); };
    return ph;
}

test("motor: dos teléfonos con la misma cuenta terminan con los mismos datos", async () => {
    const server = fakeServer();
    const acc = await QSync.accountFromCode(QSync.newAccountCode());
    const A = phone(server, acc), B = phone(server, acc);
    A.edit(d => d.routines.push({ id: "r1", name: "Push", days: [] }));
    assert.equal(await A.engine.sync(), "ok");
    assert.equal(await B.engine.sync(), "ok");
    assert.deepEqual(B.data.routines.map(r => r.name), ["Push"]);

    /* los dos cambian cosas sin conexión y luego sincronizan a la vez */
    A.edit(d => { d.logs.r1 = { "2026-11-07": { reps: [10, 9] } }; });
    B.edit(d => d.routines.push({ id: "r2", name: "Pierna", days: [] }));
    const [sa, sb] = await Promise.all([A.engine.sync(), B.engine.sync()]);
    assert.deepEqual([sa, sb], ["ok", "ok"]);
    await A.engine.sync(); await B.engine.sync();
    assert.deepEqual(A.data, B.data);
    assert.deepEqual(A.data.routines.map(r => r.name), ["Push", "Pierna"]);
    assert.ok(A.data.logs.r1);
    const stored = [...server.vaults.values()][0].blob;
    assert.ok(!stored.includes("Pierna"), "el servidor guarda todo cifrado");
});

test("motor: si la app está ocupada no se aplican cambios y se reintenta luego", async () => {
    const server = fakeServer();
    const acc = await QSync.accountFromCode(QSync.newAccountCode());
    const A = phone(server, acc), B = phone(server, acc);
    A.edit(d => d.routines.push({ id: "r1", name: "Push" }));
    await A.engine.sync();
    B.busy = true;
    assert.equal(await B.engine.sync(), "busy");
    assert.equal(B.data.routines.length, 0);
    B.busy = false;
    assert.equal(await B.engine.sync(), "ok");
    assert.equal(B.data.routines.length, 1);
});

test("vincular con código temporal: un solo uso", async () => {
    const server = fakeServer();
    const code = QSync.newAccountCode();
    const pair = await QSync.publishPair(server.rpc, code);
    assert.equal(QSync.parseCode(pair).kind, "pair");
    assert.equal(await QSync.takePair(server.rpc, pair), code);
    assert.equal(await QSync.takePair(server.rpc, pair), null);
});

test("motor: tras un intento sin conexión vuelve a sincronizar al haber red", async () => {
    const server = fakeServer();
    const acc = await QSync.accountFromCode(QSync.newAccountCode());
    const A = phone(server, acc);
    const nav = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
    try {
        A.edit(d => d.routines.push({ id: "r1", name: "Push" }));
        assert.equal(await A.engine.sync(), "offline");
        globalThis.navigator.onLine = true;
        assert.equal(await A.engine.sync(), "ok");
        assert.equal(server.vaults.size, 1);
    } finally { if (nav) Object.defineProperty(globalThis, "navigator", nav); }
});

test("motor: si la cuenta cambió de código, el teléfono deja de sincronizar sin perder datos", async () => {
    const server = fakeServer();
    const acc = await QSync.accountFromCode(QSync.newAccountCode());
    const A = phone(server, acc), B = phone(server, acc);
    A.edit(d => d.routines.push({ id: "r1", name: "Push" }));
    await A.engine.sync(); await B.engine.sync();
    await server.rpc("qpeeg_retire", { p_id: acc.id });
    B.edit(d => d.routines.push({ id: "r2", name: "Pierna" }));
    assert.equal(await B.engine.sync(), "gone");
    assert.deepEqual(B.data.routines.map(r => r.name), ["Push", "Pierna"], "lo de este teléfono se queda");
    assert.ok(!server.vaults.has(acc.id), "no vuelve a crear la cuenta vieja");
});
