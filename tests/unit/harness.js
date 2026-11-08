/* Carga los scripts de la app dentro de Node (sin navegador) para probar la lógica pura.
   El DOM se sustituye por un "comodín" que acepta cualquier llamada y no hace nada. */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..", "..");

function stub() {
    const fn = function () { return proxy; };
    const proxy = new Proxy(fn, {
        get(_, key) {
            if (key === Symbol.toPrimitive) return () => "";
            if (key === Symbol.iterator) return function* () {};
            if (key === "then") return undefined;   /* que no parezca una promesa */
            if (key === "length") return 0;
            return proxy;
        },
        set() { return true; },
        apply() { return proxy; },
        construct() { return proxy; }
    });
    return proxy;
}

function memoryStorage() {
    const m = new Map();
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: k => { m.delete(k); },
        clear: () => m.clear()
    };
}

/* Devuelve una función eval(expr) que evalúa dentro de la app cargada */
function loadApp({ localStorageData } = {}) {
    const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
    const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
    const ls = memoryStorage();
    for (const k in localStorageData || {}) ls.setItem(k, localStorageData[k]);
    const dom = stub();
    const ctx = {
        console, structuredClone, setTimeout, clearTimeout, setInterval, clearInterval, URL, Blob: stub(),
        localStorage: ls, document: dom, navigator: {}, location: stub(), matchMedia: () => ({ matches: false, addEventListener() {} }),
        requestAnimationFrame: () => 0, getComputedStyle: () => stub(), crypto: globalThis.crypto,
        Intl, Date, Math, JSON, Promise, Map, Set, TextEncoder, TextDecoder, atob, btoa, Response,
        CompressionStream, DecompressionStream
    };
    ctx.window = ctx; ctx.self = ctx;
    ctx.addEventListener = () => {};
    vm.createContext(ctx);
    for (const src of scripts) {
        const file = path.join(ROOT, src);
        vm.runInContext(fs.readFileSync(file, "utf8"), ctx, { filename: src });
    }
    return expr => vm.runInContext(expr, ctx);
}

module.exports = { loadApp, ROOT };
