/* =========================================================
    REGISTRO DE ERRORES (anónimo)
    Si algo falla en el teléfono, se anota el mensaje técnico, la versión de la app y el tipo de
    teléfono/navegador, y se envía al servidor para poder arreglarlo. No se envía ningún dato
    tuyo: ni la cuenta, ni el código, ni rutinas o comidas (los textos entre comillas se borran).
    Sin conexión se guardan (máx. 10) y se envían después. Como mucho 5 por sesión.
========================================================= */

const QErrors = (() => {
    const KEY = "qpeeg_errors";
    const MAX_QUEUE = 10, MAX_SESSION = 5;
    const seen = new Set();
    let sent = 0, flushing = false;

    /* Quita lo que pudiera ser personal: textos entre comillas, direcciones con parámetros, números largos */
    function clean(text, max) {
        return String(text || "")
            .replace(/"[^"\n]{1,200}"|'[^'\n]{1,200}'|`[^`\n]{1,200}`/g, '"…"')
            .replace(/https?:\/\/[^\s)]+/g, u => { try { const x = new URL(u); return x.pathname.split("/").slice(-2).join("/"); } catch (e) { return "url"; } })
            .replace(/\d{5,}/g, "#")
            .slice(0, max);
    }

    /* "iOS 17 · Safari", "Android 14 · Chrome 130"… sin modelo de teléfono */
    function device() {
        const ua = navigator.userAgent || "";
        const os = (ua.match(/iPhone OS (\d+)|iPad.*OS (\d+)/) && `iOS ${RegExp.$1 || RegExp.$2}`)
            || (ua.match(/Android (\d+)/) && `Android ${RegExp.$1}`)
            || (/Windows/.test(ua) && "Windows") || (/Mac OS X/.test(ua) && "Mac") || (/Linux/.test(ua) && "Linux") || "otro";
        const br = (ua.match(/(Edg|OPR|SamsungBrowser|CriOS|FxiOS|Firefox|Chrome)\/(\d+)/) && `${RegExp.$1} ${RegExp.$2}`)
            || (/Safari/.test(ua) && (ua.match(/Version\/(\d+)/) ? `Safari ${RegExp.$1}` : "Safari")) || "otro";
        const standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone;
        return `${os} · ${br}${standalone ? " · instalada" : ""}`.slice(0, 60);
    }

    const queue = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } };
    const store = q => { try { localStorage.setItem(KEY, JSON.stringify(q.slice(-MAX_QUEUE))); } catch (e) {} };

    function report(message, stack) {
        const msg = clean(message, 300);
        if (!msg || sent >= MAX_SESSION) return;
        const st = clean(stack, 1500);
        const sig = msg + "|" + st.split("\n")[1];
        if (seen.has(sig)) return;
        seen.add(sig);
        sent++;
        const q = queue();
        q.push({ p_msg: msg, p_stack: st, p_ver: typeof APP_VERSION !== "undefined" ? APP_VERSION : "?", p_ua: device(), at: Date.now() });
        store(q);
        flush();
    }

    async function flush() {
        const cfg = typeof QPEEG_SYNC !== "undefined" ? QPEEG_SYNC : null;
        if (flushing || !cfg || !cfg.url || navigator.onLine === false) return;
        flushing = true;
        try {
            let q = queue();
            while (q.length) {
                const { at, ...item } = q[0];
                const res = await fetch(cfg.url.replace(/\/+$/, "") + "/rest/v1/rpc/qpeeg_error", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", apikey: cfg.key, Authorization: "Bearer " + cfg.key },
                    body: JSON.stringify(item)
                });
                if (!res.ok && res.status !== 400) break;      /* el servidor no está: se reintenta después */
                q = queue().slice(1);
                store(q);
            }
        } catch (e) { /* sin red: queda en la cola */ }
        finally { flushing = false; }
    }

    window.addEventListener("error", e => {
        if (!e || !e.message) return;                          /* fallos al cargar una imagen, etc. */
        report(e.message, (e.error && e.error.stack) || `at ${e.filename || ""}:${e.lineno}:${e.colno}`);
    });
    window.addEventListener("unhandledrejection", e => {
        const r = e && e.reason;
        report(r && r.message ? r.message : String(r), r && r.stack);
    });
    window.addEventListener("online", flush);
    setTimeout(flush, 5000);                                    /* lo que quedó pendiente de otra vez */

    return { report, flush, clean, device };
})();
