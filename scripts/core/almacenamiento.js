/* =========================================================
    ALMACENAMIENTO
    - IndexedDB: copia principal (sin el límite de ~5 MB de localStorage).
    - localStorage: espejo rápido para arrancar sin esperar (y respaldo si IndexedDB falla).
    - Versión de esquema + migraciones numeradas: cada cambio de formato de los datos
      se escribe como una migración (v1 → v2 → v3 …) en lugar de "adivinar" el formato viejo.
    No depende de nada del resto de la app; también se carga desde las pruebas (Node).
========================================================= */

const QStore = (() => {
    const DB_NAME = "qpeeg";
    const DB_STORE = "kv";
    const DB_KEY = "state";

    /* Sube este número y añade su migración cada vez que cambie la forma de los datos */
    const SCHEMA_VERSION = 2;

    const MIGRATIONS = {
        /* v1 → v2: metadatos (versión, momento del último guardado, id anónimo del dispositivo) */
        2: s => { s.meta = Object.assign({}, s.meta); return s; }
    };

    function schemaOf(s) {
        const v = s && s.meta && Number(s.meta.schema);
        return Number.isInteger(v) && v >= 1 ? v : 1;
    }

    /* Lleva unos datos de cualquier versión anterior a la actual. Datos de una versión
       más nueva (app vieja en caché) se dejan como están: nunca se "rebajan". */
    function migrate(raw) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
        let s = Object.assign({}, raw);
        let v = schemaOf(s);
        while (v < SCHEMA_VERSION) {
            v++;
            if (MIGRATIONS[v]) s = MIGRATIONS[v](s) || s;
        }
        s.meta = Object.assign({}, s.meta, { schema: Math.max(v, schemaOf(raw)) });
        return s;
    }

    function newId() {
        if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
        return "d-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    }

    /* ---------- IndexedDB (promesas mínimas) ---------- */
    let dbPromise = null;
    function openDb() {
        if (typeof indexedDB === "undefined") return Promise.reject(new Error("sin IndexedDB"));
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, 1);
                req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
                req.onblocked = () => reject(new Error("IndexedDB bloqueado"));
            }).catch(e => { dbPromise = null; throw e; });
        }
        return dbPromise;
    }

    /* Devuelve { json, savedAt } o null */
    async function load() {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const req = db.transaction(DB_STORE, "readonly").objectStore(DB_STORE).get(DB_KEY);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    async function save(json, savedAt) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, "readwrite");
            tx.objectStore(DB_STORE).put({ json, savedAt }, DB_KEY);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    /* Escrituras en fila: si llegan varias seguidas solo se escribe la última */
    let pending = null, running = null;
    function queueSave(json, savedAt) {
        pending = { json, savedAt };
        if (!running) {
            running = (async () => {
                let result = true;
                while (pending) {
                    const job = pending;
                    pending = null;
                    try { await save(job.json, job.savedAt); }
                    catch (e) { result = false; }
                }
                running = null;
                return result;
            })();
        }
        return running;
    }
    /* Espera a que lo pendiente quede escrito (antes de recargar la página) */
    function flush() { return running || Promise.resolve(true); }

    return { SCHEMA_VERSION, MIGRATIONS, migrate, schemaOf, newId, load, queueSave, flush };
})();

if (typeof module !== "undefined" && module.exports) module.exports = QStore;
