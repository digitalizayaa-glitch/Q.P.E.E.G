/* =========================================================
    SINCRONIZACIÓN ENTRE TELÉFONOS (cuenta sin correo ni contraseña)

    - La cuenta es un CÓDIGO de 20 caracteres (el último verifica que esté bien escrito).
    - Del código salen, en el propio teléfono, dos cosas:
        · una LLAVE de cifrado (AES-GCM de 256 bits)
        · un IDENTIFICADOR (huella SHA-256) con el que el servidor guarda la copia.
      El código nunca sale del teléfono: el servidor solo recibe el identificador y
      un bloque cifrado que no puede leer.
    - FUSIÓN A TRES BANDAS: se guarda la última versión sincronizada ("base"). Al
      sincronizar se comparan base, este teléfono y el servidor, y se juntan los cambios
      de los dos lados. Solo si los dos cambiaron exactamente lo mismo gana el más reciente.
    - CÓDIGO TEMPORAL de 8 caracteres para vincular otro teléfono: caduca en 10 min y
      sirve una sola vez.

    No depende del resto de la app (también se carga desde las pruebas en Node).
========================================================= */

const QSync = (() => {
    /* Sin 0/O, 1/I/L para que no se confundan al copiarlo a mano */
    const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    const CODE_LEN = 20;    /* 19 al azar (~94 bits) + 1 de verificación */
    const PAIR_LEN = 8;     /* temporal (~40 bits): un solo uso y caduca en 10 min */
    const enc = new TextEncoder(), dec = new TextDecoder();
    const subtle = () => globalThis.crypto.subtle;

    /* ---------- Códigos ---------- */
    function randomChars(n) {
        const out = [];
        const buf = new Uint8Array(n * 2);
        while (out.length < n) {
            globalThis.crypto.getRandomValues(buf);
            for (const b of buf) if (b < 248 && out.length < n) out.push(ALPHABET[b % 31]);   /* 248 = 31·8: sin sesgo */
        }
        return out.join("");
    }
    function checkChar(body) {
        let sum = 0;
        for (let i = 0; i < body.length; i++) sum += (i + 1) * ALPHABET.indexOf(body[i]);
        return ALPHABET[sum % 31];
    }
    const group = s => s.match(/.{1,4}/g).join("-");

    function newAccountCode() {
        const body = randomChars(CODE_LEN - 1);
        return group(body + checkChar(body));
    }
    function newPairCode() { return group(randomChars(PAIR_LEN)); }

    /* Qué es lo que escribió: "account" | "pair" | null (y el código ya limpio) */
    function parseCode(text) {
        const raw = String(text || "").toUpperCase().replace(/[\s\-_.]/g, "");
        if ([...raw].some(c => !ALPHABET.includes(c))) return { kind: null, error: "chars" };
        if (raw.length === CODE_LEN) {
            const body = raw.slice(0, -1);
            if (checkChar(body) !== raw.slice(-1)) return { kind: null, error: "check" };
            return { kind: "account", code: group(raw) };
        }
        if (raw.length === PAIR_LEN) return { kind: "pair", code: group(raw) };
        return { kind: null, error: "length" };
    }

    /* ---------- Cifrado ---------- */
    const toHex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
    function toB64(buf) {
        const bytes = new Uint8Array(buf);
        let s = "";
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
    }
    function fromB64(b64) {
        const s = atob(b64);
        const out = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
        return out;
    }

    /* Código → { id, key }. "purpose" separa la cuenta del código temporal. */
    async function deriveFrom(code, purpose) {
        const clean = String(code).toUpperCase().replace(/[^0-9A-Z]/g, "");
        const base = await subtle().importKey("raw", enc.encode(clean), "PBKDF2", false, ["deriveBits"]);
        const bits = await subtle().deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode("qpeeg/" + purpose + "/v1"), iterations: 120000 }, base, 512);
        const keyBytes = bits.slice(0, 32);
        const id = toHex(await subtle().digest("SHA-256", bits.slice(32)));
        return { id, keyRaw: toB64(keyBytes) };
    }
    const importKey = keyRaw => subtle().importKey("raw", fromB64(keyRaw), "AES-GCM", false, ["encrypt", "decrypt"]);

    async function pipe(bytes, Stream) {
        const stream = new Blob([bytes]).stream().pipeThrough(new Stream("gzip"));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const canZip = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

    /* objeto → texto cifrado (ligado al identificador, para que no se pueda mover a otra cuenta) */
    async function seal(obj, keyRaw, id) {
        let bytes = enc.encode(JSON.stringify(obj));
        const z = canZip();
        if (z) bytes = await pipe(bytes, CompressionStream);
        const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
        const ct = await subtle().encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(id) }, await importKey(keyRaw), bytes);
        return JSON.stringify({ v: 1, z, iv: toB64(iv), ct: toB64(ct) });
    }
    async function open(text, keyRaw, id) {
        const box = JSON.parse(text);
        if (!box || box.v !== 1) throw new Error("formato");
        let bytes = new Uint8Array(await subtle().decrypt({ name: "AES-GCM", iv: fromB64(box.iv), additionalData: enc.encode(id) }, await importKey(keyRaw), fromB64(box.ct)));
        if (box.z) {
            if (!canZip()) throw new Error("sin descompresión");
            bytes = await pipe(bytes, DecompressionStream);
        }
        return JSON.parse(dec.decode(bytes));
    }

    /* ---------- Fusión a tres bandas ---------- */
    const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
    const isIdList = v => Array.isArray(v) && v.length > 0 && v.every(x => isObj(x) && typeof x.id === "string");
    function same(a, b) {
        if (a === b) return true;
        if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => same(x, b[i]));
        const ka = Object.keys(a).filter(k => a[k] !== undefined), kb = Object.keys(b).filter(k => b[k] !== undefined);
        return ka.length === kb.length && ka.every(k => same(a[k], b[k]));
    }

    /* base: última versión común · mine: este teléfono · theirs: servidor
       theirsWins: a quién dar la razón cuando los dos cambiaron lo mismo de forma distinta */
    function merge(base, mine, theirs, theirsWins) {
        if (same(mine, theirs)) return mine;
        if (same(base, mine)) return theirs;      /* solo cambió el servidor */
        if (same(base, theirs)) return mine;      /* solo cambió este teléfono */
        /* cambiaron los dos */
        if (mine === undefined) return theirs;    /* uno lo borró y el otro lo editó: se queda lo editado */
        if (theirs === undefined) return mine;
        if (isObj(mine) && isObj(theirs)) {
            const b = isObj(base) ? base : {};
            const out = {};
            for (const k of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
                const v = merge(b[k], mine[k], theirs[k], theirsWins);
                if (v !== undefined) out[k] = v;
            }
            return out;
        }
        /* listas con id (rutinas, días, ejercicios…): se juntan elemento a elemento */
        const listish = v => v === undefined || isIdList(v) || (Array.isArray(v) && v.length === 0);
        if (Array.isArray(mine) && Array.isArray(theirs) && listish(base) && listish(mine) && listish(theirs)
            && (isIdList(mine) || isIdList(theirs))) {
            const byId = list => new Map((list || []).map(x => [x.id, x]));
            const b = byId(base), m = byId(mine), t = byId(theirs);
            const order = theirsWins ? [...theirs, ...mine] : [...mine, ...theirs];
            const out = [], seen = new Set();
            for (const { id } of order) {
                if (seen.has(id)) continue;
                seen.add(id);
                const v = merge(b.get(id), m.get(id), t.get(id), theirsWins);
                if (v !== undefined) out.push(v);
            }
            return out;
        }
        return theirsWins ? theirs : mine;        /* un mismo valor cambiado en los dos: gana el más reciente */
    }

    /* ---------- Servidor (funciones de Supabase vía su API REST) ---------- */
    function client(config, fetchImpl) {
        const doFetch = fetchImpl || ((...a) => globalThis.fetch(...a));
        return async function rpc(name, args) {
            let res;
            try {
                res = await doFetch(config.url.replace(/\/+$/, "") + "/rest/v1/rpc/" + name, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: config.key, Authorization: "Bearer " + config.key },
                    body: JSON.stringify(args)
                });
            } catch (e) {
                throw Object.assign(new Error("sin conexión"), { offline: true });   /* fetch falla solo si no hay red */
            }
            if (!res.ok) throw Object.assign(new Error("servidor " + res.status), { status: res.status });
            const text = await res.text();
            return text ? JSON.parse(text) : null;
        };
    }

    /* ---------- Motor ----------
       hooks = {
         rpc(name, args)          llamada al servidor
         getLocal()               { data, savedAt } de este teléfono (sin metadatos)
         applyRemote(data)        reemplaza los datos locales; devuelve false si ahora no es buen momento,
                                  o los datos tal como quedaron guardados
         loadAccount() / saveAccount(acc)   guarda { code, id, keyRaw, rev, base, lastSync }
         onStatus(status)         "idle" | "syncing" | "ok" | "offline" | "error" | "busy"
       } */
    function engine(hooks) {
        let running = null, again = false;

        async function syncOnce() {
            const acc = await hooks.loadAccount();
            if (!acc) return "idle";
            for (let attempt = 0; attempt < 4; attempt++) {
                const local = hooks.getLocal();
                const rows = await hooks.rpc("qpeeg_get", { p_id: acc.id });
                const row = Array.isArray(rows) ? rows[0] : rows;
                const remoteRev = row ? Number(row.rev) : 0;
                let merged = local.data, remote = null;

                if (row && remoteRev === acc.rev && same(local.data, acc.base)) {
                    acc.lastSync = Date.now();
                    await hooks.saveAccount(acc);
                    return "ok";                           /* nada nuevo en ningún lado */
                }
                if (row && remoteRev !== acc.rev) {
                    remote = await open(row.blob, acc.keyRaw, acc.id);
                    merged = merge(acc.base === undefined ? {} : acc.base, local.data, remote.data, remote.savedAt > local.savedAt);
                    if (!same(merged, local.data)) {
                        const applied = await hooks.applyRemote(merged);
                        if (applied === false) return "busy";   /* ventana abierta o entrenando: luego */
                        if (applied && typeof applied === "object") merged = applied;   /* tal como quedó tras repararlo */
                    }
                    if (same(merged, remote.data)) {       /* el servidor ya tiene todo */
                        Object.assign(acc, { rev: remoteRev, base: merged, lastSync: Date.now() });
                        await hooks.saveAccount(acc);
                        return "ok";
                    }
                }
                const savedAt = Math.max(local.savedAt, remote ? remote.savedAt : 0);
                const blob = await seal({ data: merged, savedAt }, acc.keyRaw, acc.id);
                const newRev = Number(await hooks.rpc("qpeeg_put", { p_id: acc.id, p_blob: blob, p_rev: row ? remoteRev : 0 }));
                if (newRev > 0) {
                    Object.assign(acc, { rev: newRev, base: merged, lastSync: Date.now() });
                    await hooks.saveAccount(acc);
                    return "ok";
                }
                /* otro teléfono escribió justo antes: se vuelve a leer y fusionar */
            }
            return "error";
        }

        /* Una sola sincronización a la vez; si piden otra mientras tanto, se repite al final */
        function sync() {
            if (running) { again = true; return running; }
            running = (async () => {
                await null;   /* si terminara sin esperar nada, "running" quedaría apuntando a una promesa ya resuelta */
                let status;
                do {
                    again = false;
                    if (typeof navigator !== "undefined" && navigator.onLine === false) { status = "offline"; break; }
                    hooks.onStatus && hooks.onStatus("syncing");
                    try { status = await syncOnce(); }
                    catch (e) {
                        status = e && e.offline ? "offline" : "error";
                        hooks.onError && hooks.onError(e);
                    }
                } while (again && status === "ok");
                running = null;
                hooks.onStatus && hooks.onStatus(status);
                return status;
            })();
            return running;
        }
        return { sync };
    }

    /* ---------- Cuenta ---------- */
    async function accountFromCode(code) {
        const { id, keyRaw } = await deriveFrom(code, "cuenta");
        return { code, id, keyRaw, rev: 0, base: undefined, lastSync: 0 };
    }

    /* Vincular: el teléfono que ya tiene la cuenta publica su código cifrado con el temporal */
    async function publishPair(rpc, accountCode) {
        const pair = newPairCode();
        const { id, keyRaw } = await deriveFrom(pair, "vincular");
        await rpc("qpeeg_pair_put", { p_id: id, p_payload: await seal({ code: accountCode }, keyRaw, id) });
        return pair;
    }
    /* … y el teléfono nuevo lo recoge (una sola vez). Devuelve el código de cuenta o null. */
    async function takePair(rpc, pairCode) {
        const { id, keyRaw } = await deriveFrom(pairCode, "vincular");
        const payload = await rpc("qpeeg_pair_take", { p_id: id });
        if (!payload) return null;
        const { code } = await open(payload, keyRaw, id);
        return parseCode(code).kind === "account" ? code : null;
    }

    return {
        ALPHABET, newAccountCode, newPairCode, parseCode,
        deriveFrom, seal, open, merge, same, client, engine, accountFromCode, publishPair, takePair
    };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QSync;
