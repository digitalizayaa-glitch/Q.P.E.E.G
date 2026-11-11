/* =========================================================
    INSTALAR LA APP
    Guía que sale una vez, después de los acuerdos y las novedades, si la app se abre en el
    navegador (no instalada). Es opcional: ✕ o "Ahora no" y se sigue normal.
    Pasos según el teléfono (iPhone, Android, computadora); en Android/Chrome, si el navegador
    lo permite, un botón instala directo. También está en Ajustes → "Instalar la app".
========================================================= */

const INSTALL_SEEN_KEY = "qpeeg_install_seen";
let installPrompt = null;            /* evento de Chrome/Android para instalar con un toque */

window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; });
window.addEventListener("appinstalled", () => { installPrompt = null; try { localStorage.setItem(INSTALL_SEEN_KEY, "1"); } catch (e) { /* nada */ } });

const isInstalled = () => {
    try { return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true; }
    catch (e) { return false; }
};

function installPlatform() {
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/.test(ua)) return "android";
    return "desktop";
}
/* Navegadores dentro de otras apps (Instagram, Facebook, TikTok…) no instalan: hay que abrir el enlace en el navegador */
const inAppBrowser = () => /FBAN|FBAV|Instagram|Line\/|TikTok|musical_ly|Snapchat|; wv\)/.test(navigator.userAgent || "");

const INSTALL_ICONS = {
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/></svg>',
    monitor: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/></svg>',
    install: '<svg viewBox="0 0 24 24"><path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><path d="M5 19h14"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L5 13h6l-1 9 8-11h-6z"/></svg>',
    wifi: '<svg viewBox="0 0 24 24"><path d="M3 9a14 14 0 0 1 18 0"/><path d="M6.5 12.5a9 9 0 0 1 11 0"/><path d="M10 16a4 4 0 0 1 4 0"/><path d="M3 3l18 18"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>'
};

const INSTALL_STEPS = {
    ios: [
        ["share", "Toca <b>Compartir</b>", "En Safari está abajo, en el centro. En Chrome, arriba a la derecha."],
        ["plus", "Elige <b>Añadir a pantalla de inicio</b>", "Si no lo ves, desliza la lista hacia abajo."],
        ["check", "Toca <b>Añadir</b>", "Q.P.E.E.G aparece en tu inicio, como cualquier app."]
    ],
    android: [
        ["dots", "Toca el menú <b>⋮</b>", "En Chrome está arriba a la derecha."],
        ["install", "Elige <b>Instalar app</b>", "En algunos teléfonos dice <b>Agregar a la pantalla principal</b>."],
        ["check", "Confirma con <b>Instalar</b>", "Q.P.E.E.G aparece en tu inicio, como cualquier app."]
    ],
    desktop: [
        ["install", "Busca el ícono de <b>instalar</b>", "En Chrome o Edge está al final de la barra de direcciones."],
        ["check", "Toca <b>Instalar</b>", "La app se abre en su propia ventana."],
        ["home", "Ábrela cuando quieras", "Desde el menú de inicio o el escritorio."]
    ]
};
const INSTALL_TABS = [["ios", "iPhone", "phone"], ["android", "Android", "phone"], ["desktop", "Computadora", "monitor"]];

/* Pestañas + "Instalar ahora" (si se puede) + pasos. Se usa en la guía y en la bienvenida de la app nueva */
function installSectionHtml(tab) {
    const direct = installPrompt && tab === installPlatform() && tab !== "ios";
    const steps = INSTALL_STEPS[tab].map(([icon, title, sub], i) => `
        <li class="install-step">
            <span class="install-num">${i + 1}</span>
            <span class="install-ico">${INSTALL_ICONS[icon]}</span>
            <span class="install-txt"><b>${title}</b><small>${sub}</small></span>
        </li>`).join("");
    return `
        ${inAppBrowser() ? `<p class="install-warn">${INSTALL_ICONS.globe}<span>La app funciona igual aquí, pero es más fácil usarla instalada. Para instalarla, abre este enlace en <b>${installPlatform() === "ios" ? "Safari" : "Chrome"}</b>.</span></p>` : ""}
        <div class="seg install-tabs">${INSTALL_TABS.map(([k, name, icon]) =>
            `<button type="button" class="seg-btn${k === tab ? " active" : ""}" data-tab="${k}">${INSTALL_ICONS[icon]}${name}</button>`).join("")}</div>
        ${direct ? `<button type="button" class="dialog-btn accept install-now" data-now="1">${INSTALL_ICONS.install}Instalar ahora</button><p class="install-or">o hazlo a mano:</p>` : ""}
        <ol class="install-steps">${steps}</ol>`;
}

/* Clics de esa sección: true si era suyo */
async function installSectionClick(t, view, redraw, close) {
    if (t.dataset.tab) { view.tab = t.dataset.tab; redraw(); return true; }
    if (t.dataset.now && installPrompt) {
        const p = installPrompt;
        installPrompt = null;
        try { p.prompt(); const r = await p.userChoice; if (r && r.outcome === "accepted") close(); else redraw(); }
        catch (err) { redraw(); }
        return true;
    }
    return false;
}

const PERKS_HTML = `<div class="install-perks">
    <span>${INSTALL_ICONS.bolt}Abre al instante</span>
    <span>${INSTALL_ICONS.wifi}Sin internet</span>
    <span>${INSTALL_ICONS.home}Pantalla completa</span>
</div>`;

function openInstallGuide() {
    const view = { tab: installPlatform() };
    const { sheet, close } = openSheet("install-sheet", "Instala la app");
    const body = document.createElement("div");
    body.className = "install-body";
    sheet.appendChild(body);

    const draw = () => {
        body.innerHTML = `
            <div class="install-hero">
                <img class="install-logo" src="icons/icon-192.png" alt="">
                <div><b>Q.P.E.E.G en tu inicio</b><small>Gratis, sin tienda y en menos de un minuto.</small></div>
            </div>
            ${PERKS_HTML}
            ${installSectionHtml(view.tab)}
            <div class="dialog-actions"><button type="button" class="dialog-btn ghost" data-later="1">Ahora no</button></div>`;
    };
    body.addEventListener("click", async e => {
        const t = e.target.closest("button");
        if (!t) return;
        if (await installSectionClick(t, view, draw, close)) return;
        if (t.dataset.later) close();
    });
    draw();
}

/* =========================================================
    MUDANZA (config.js → QPEEG_MOVE)
    - App vieja: cada vez que se abre, cómo pasarse a la nueva. El código de cuenta viaja en el
      enlace (#cuenta=…, la parte que no llega a ningún servidor) y la nueva lo pone sola.
    - App nueva: bienvenida con un espacio para el código y cómo instalarla.
========================================================= */

function moveMode() {
    if (typeof QPEEG_FORCE_MOVE !== "undefined") return QPEEG_FORCE_MOVE;      /* vista previa */
    if (typeof QPEEG_MOVE === "undefined" || !QPEEG_MOVE.to) return null;
    const host = location.hostname;
    try { if (host === new URL(QPEEG_MOVE.to).hostname) return "new"; } catch (e) { return null; }
    return QPEEG_MOVE.from && host.endsWith(QPEEG_MOVE.from) ? "old" : null;
}
const moveUrl = () => (typeof QPEEG_MOVE !== "undefined" && QPEEG_MOVE.to) || "";
const moveHost = () => { try { return new URL(moveUrl()).host; } catch (e) { return moveUrl(); } };

/* Código que llega en el enlace desde la app vieja: se lee y se quita de la barra en seguida */
const MOVED_CODE = (() => {
    const m = /[#&]cuenta=([A-Za-z0-9-]{8,40})/.exec(location.hash || "");
    if (m) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* nada */ } }
    return m ? m[1].toUpperCase() : "";
})();
const WELCOME_SEEN_KEY = "qpeeg_welcome_seen";

async function openMoveGuide() {
    const { sheet, close } = openSheet("install-sheet move-sheet", "La app se mudó");
    const body = document.createElement("div");
    body.className = "install-body";
    sheet.appendChild(body);
    let acc = SYNC_ON ? await loadAccount() : null;

    const draw = () => {
        const has = !!(acc && !acc.gone);
        const data = hasUserData();
        const step1 = has
            ? `<b>Tu cuenta va contigo</b><small>Tu código viaja en el enlace y la app nueva entra sola.</small>
               <span class="move-code">${esc(acc.code)}</span>`
            : data
                ? `<b>Crea tu código primero</b><small>Así tus rutinas, comidas y deportes pasan a la app nueva. Si no, allá empiezas de cero.</small>
                   <button type="button" class="dialog-btn accept move-mini" data-create="1">Crear mi código</button>`
                : `<b>No hay nada que pasar</b><small>Aún no tienes datos aquí: empieza directo en la app nueva.</small>`;
        body.innerHTML = `
            <div class="install-hero move-hero">
                <img class="install-logo" src="icons/icon-192.png" alt="">
                <div><b>Q.P.E.E.G tiene casa nueva</b><small>Más rápida y lista para crecer. Esta dirección dejará de usarse.</small></div>
            </div>
            <div class="move-link">${INSTALL_ICONS.globe}<span>${esc(moveHost())}</span></div>
            <ol class="install-steps">
                <li class="install-step"><span class="install-num">1</span><span class="install-txt">${step1}</span></li>
                <li class="install-step"><span class="install-num">2</span><span class="install-txt"><b>Abre la app nueva</b><small>Con el botón de abajo. Acepta los acuerdos otra vez (es otra dirección).</small></span></li>
                <li class="install-step"><span class="install-num">3</span><span class="install-txt"><b>Instálala y listo</b><small>Allá te enseña cómo. Después puedes quitar esta del inicio.</small></span></li>
            </ol>
            <button type="button" class="dialog-btn accept install-now" data-go="1">${INSTALL_ICONS.home}Abrir la app nueva</button>
            <div class="dialog-actions"><button type="button" class="dialog-btn ghost" data-later="1">Ahora no</button></div>`;
    };
    body.addEventListener("click", async e => {
        const t = e.target.closest("button");
        if (!t) return;
        if (t.dataset.later) close();
        else if (t.dataset.create) {
            if (!navigator.onLine) { await offlineMsg("crear tu código"); return; }
            await createAccount();
            acc = await loadAccount();
            draw();
        } else if (t.dataset.go) {
            const has = acc && !acc.gone;
            if (has && navigator.onLine) await flushAccount();          /* que lo último ya esté en el servidor */
            const url = moveUrl() + (has ? `#cuenta=${encodeURIComponent(acc.code)}` : "");
            const w = window.open(url, "_blank", "noopener");
            if (!w) location.href = url;
        }
    });
    draw();
}

async function openWelcome() {
    const view = { tab: installPlatform() };
    const { sheet, close } = openSheet("install-sheet welcome-sheet", "Bienvenido");
    const body = document.createElement("div");
    body.className = "install-body";
    sheet.appendChild(body);
    let acc = SYNC_ON ? await loadAccount() : null;
    let typed = MOVED_CODE;
    let error = "";

    const draw = () => {
        const has = !!(acc && !acc.gone);
        const installed = isInstalled();
        const accountHtml = has
            ? `<div class="welcome-ok">${INSTALL_ICONS.check}<span><b>Ya estás en tu cuenta</b><small>Tus datos están aquí y se sincronizan solos.</small></span></div>`
            : `<label class="welcome-label" for="welcomeCode">¿Ya usabas la app? Escribe tu código de cuenta</label>
               <div class="welcome-code">
                   <input id="welcomeCode" class="dialog-input" type="text" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false"
                          maxlength="32" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" value="${esc(typed)}">
                   <button type="button" class="dialog-btn accept" data-enter="1">Entrar</button>
               </div>
               <p class="welcome-err">${esc(error)}</p>
               <small class="welcome-hint">¿No tienes código? No pasa nada: empieza de cero y créalo cuando quieras en Ajustes.</small>`;
        body.innerHTML = `
            <div class="install-hero">
                <img class="install-logo" src="icons/icon-192.png" alt="">
                <div><b>La nueva casa de Q.P.E.E.G</b><small>${installed ? "Ya la tienes instalada." : "Dos pasos y quedas listo."}</small></div>
            </div>
            <h4 class="welcome-h"><span class="install-num">1</span>Tu cuenta</h4>
            <div class="welcome-box">${accountHtml}</div>
            ${installed ? "" : `<h4 class="welcome-h"><span class="install-num">2</span>Instálala</h4>${installSectionHtml(view.tab)}`}
            <div class="dialog-actions"><button type="button" class="dialog-btn ${has ? "accept" : "ghost"}" data-later="1">${has ? "Listo" : "Ahora no"}</button></div>`;
        const input = body.querySelector("#welcomeCode");
        if (input) input.addEventListener("input", () => { typed = input.value; });
    };
    body.addEventListener("click", async e => {
        const t = e.target.closest("button");
        if (!t) return;
        if (await installSectionClick(t, view, draw, close)) return;
        if (t.dataset.later) close();
        else if (t.dataset.enter) {
            const p = QSync.parseCode(typed);
            if (!p.kind) { error = typed.trim() ? CODE_ERRORS[p.error] : "Escribe tu código."; draw(); return; }
            error = "";
            t.disabled = true;
            if (await enterCode(typed)) acc = await loadAccount();
            draw();
        }
    });
    body.addEventListener("keydown", e => {
        if (e.key === "Enter" && e.target.id === "welcomeCode") { e.preventDefault(); body.querySelector("[data-enter]")?.click(); }
    });
    draw();
}

/* Al abrir, después de los acuerdos y las novedades:
   app vieja → mudanza (siempre); app nueva → bienvenida (una vez, o si llegó con código);
   si no, la guía para instalar una vez si se abrió en el navegador */
(async () => {
    await consentReady;
    await whatsNewDone;
    await new Promise(r => setTimeout(r, 500));
    if (document.querySelector(".picker-overlay")) return;
    const mode = moveMode();
    if (mode === "old") { openMoveGuide(); return; }
    const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const set = k => { try { localStorage.setItem(k, "1"); } catch (e) { /* nada */ } };
    if (mode === "new") {
        if (MOVED_CODE || !get(WELCOME_SEEN_KEY)) { set(WELCOME_SEEN_KEY); set(INSTALL_SEEN_KEY); openWelcome(); }
        return;
    }
    if (get(INSTALL_SEEN_KEY) || isInstalled()) return;
    set(INSTALL_SEEN_KEY);
    openInstallGuide();
})();
