/* =========================================================
    CUENTA Y SINCRONIZACIÓN (Ajustes → Cuenta)
    La app sigue funcionando sin conexión; con conexión sube y baja los cambios.
    La lógica (códigos, cifrado, fusión) está en scripts/core/sincronizacion.js.
========================================================= */

const SYNC_ON = !!(typeof QPEEG_SYNC !== "undefined" && QPEEG_SYNC.url && QPEEG_SYNC.key);
const ACCOUNT_KEY = "account";
const syncRpc = SYNC_ON ? QSync.client(QPEEG_SYNC) : null;

let syncStatus = "idle";
let syncForce = false;            /* al entrar en una cuenta o volver a una versión se aplican los datos aunque haya una ventana abierta */
let syncTimer = null;
const syncListeners = new Set();

const loadAccount = () => QStore.getKey(ACCOUNT_KEY).then(a => a || null).catch(() => null);
const saveAccount = acc => QStore.putKey(ACCOUNT_KEY, acc);

/* Lo que se sincroniza: todo menos los metadatos de este teléfono */
function syncableState() {
    const { meta, ...data } = state;
    return JSON.parse(JSON.stringify(data));
}

/* No se cambian los datos mientras se está entrenando o hay una ventana de edición abierta */
function appBusy() {
    if (syncForce) return false;
    const sec = document.querySelector(".section.active");
    if (sec && sec.id === "workout") return true;
    return [...document.querySelectorAll(".picker-overlay")].some(o => !o.querySelector(".settings-sheet"));
}

function applySyncedData(data) {
    if (appBusy()) return false;
    const meta = state.meta;
    state = stateFrom(Object.assign({}, data, { meta }));
    state.meta = meta;
    saveState();
    refreshAfterSync();
    return syncableState();
}

function refreshAfterSync() {
    applySettings();
    renderProfile();
    renderAchievements();
    const sec = document.querySelector(".section.active");
    const id = sec ? sec.id : "";
    if (id === "exercises") renderRoutinesTab();
    else if (id === "week") { renderWeekSection(); renderSeriesPanel(); }
    else if (id === "food") renderFood();
    else if (id === "history") renderHistory();
}

const syncEngine = SYNC_ON ? QSync.engine({
    rpc: syncRpc,
    getLocal: () => ({ data: syncableState(), savedAt: state.meta.savedAt || 0 }),
    applyRemote: applySyncedData,
    loadAccount: () => loadAccount().then(a => (a && a.gone ? null : a)),   /* cuenta que cambió de código: ya no se sincroniza */
    saveAccount,
    onError: e => console.warn("[sync]", e),
    onStatus: s => {
        if (s === "gone") loadAccount().then(a => { if (a) { a.gone = true; saveAccount(a).then(() => syncListeners.forEach(fn => fn(syncStatus))); } });
        syncStatus = s;
        syncListeners.forEach(fn => fn(s));
        if (s === "busy") scheduleSync(15000);
        else if (s === "error") scheduleSync(60000);
        /* el aviso "online" a veces llega antes de que la red funcione de verdad: se reintenta */
        else if (s === "offline") scheduleSync(navigator.onLine ? 5000 : 30000);
    }
}) : null;

/* Tras cada guardado: sincroniza unos segundos después (agrupa varios cambios seguidos) */
function scheduleSync(delay = 3000) {
    if (!SYNC_ON) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => { syncTimer = null; syncEngine.sync(); }, delay);
}
function syncNow() {
    if (!SYNC_ON) return Promise.resolve("idle");
    clearTimeout(syncTimer);
    return syncEngine.sync();
}

if (SYNC_ON) {
    window.addEventListener("online", () => syncNow());
    /* Sin consultas periódicas: se sincroniza al abrir la app, al volver a ella, al salir, al recuperar
       la red y unos segundos después de cada cambio (así el servidor recibe muchas menos peticiones) */
    document.addEventListener("visibilitychange", () => syncNow());
    document.addEventListener("DOMContentLoaded", () => { stateReady.then(() => setTimeout(syncNow, 400)); });
}

function hasUserData() {
    return state.routines.length > 0 || Object.keys(state.logs).length > 0 || Object.keys(state.food.log).length > 0
        || Object.keys(state.sports).length > 0 || state.achievements.length > 0 || !!state.nutrition;
}

/* ---------- Acciones ---------- */

async function shareText(text) {
    try {
        if (navigator.share) { await navigator.share({ text }); return "shared"; }
    } catch (e) { if (e && e.name === "AbortError") return "cancel"; }
    try { await navigator.clipboard.writeText(text); return "copied"; } catch (e) { return "fail"; }
}

async function showAccountCode(code, intro) {
    const choice = await openDialog({
        title: "Tu código",
        message: `${intro ? intro + "\n\n" : ""}${code}\n\nEste código es tu cuenta: escríbelo en otro teléfono y los dos tendrán los mismos datos. Guárdalo bien: no hay correo ni contraseña para recuperarlo.`,
        buttons: [
            { label: "Guardar o compartir", kind: "ghost", confirm: false, cancelValue: "share" },
            { label: "Listo", kind: "accept", confirm: true, value: "ok" }
        ]
    });
    if (choice === "share") {
        const r = await shareText(code);
        if (r === "copied") await showMessage({ title: "Código copiado", message: "Pégalo en tus notas o envíatelo a ti mismo." });
        else if (r === "fail") await showMessage({ title: "No se pudo copiar", message: `Anótalo a mano:\n\n${code}` });
    }
}

async function createAccount() {
    const code = QSync.newAccountCode();
    const acc = await QSync.accountFromCode(code);
    await saveAccount(acc);
    syncNow();
    await showAccountCode(code, "Listo, ya tienes cuenta.");
}

const CODE_ERRORS = {
    chars: "Ese código tiene un carácter que no se usa en los códigos.",
    check: "Alguna letra del código está mal escrita. Revísalo.",
    length: "El código de cuenta tiene 20 caracteres (el temporal, 8)."
};
const offlineMsg = what => showMessage({ title: "Sin conexión", message: `Para ${what} necesitas internet. Después todo funciona sin conexión.` });

/* Guarda en el servidor lo último de la cuenta actual; false si no se pudo */
async function flushAccount() {
    const status = await syncNow();
    return status === "ok" || status === "idle";
}

/* Entrar con un código. No se mezcla nada: este teléfono pasa a usar la cuenta del código,
   con sus datos. Si era la cuenta de otra persona, la tuya queda guardada con tu código. */
async function enterCode() {
    const current = await loadAccount();
    const text = await askText({
        title: "Entrar con un código",
        label: "Escribe el código de la cuenta (20 caracteres) o el código temporal que te dio el otro teléfono (8).",
        placeholder: "XXXX-XXXX-XXXX-XXXX-XXXX",
        maxLength: 32,
        confirmLabel: "Seguir",
        validate: t => { const p = QSync.parseCode(t); return p.kind ? "" : CODE_ERRORS[p.error]; }
    });
    if (!text) return;
    if (!navigator.onLine) { await offlineMsg("entrar en una cuenta"); return; }

    syncStatus = "syncing"; syncListeners.forEach(fn => fn(syncStatus));
    try {
        const parsed = QSync.parseCode(text);
        let code = parsed.code;
        if (parsed.kind === "pair") {
            code = await QSync.takePair(syncRpc, parsed.code);
            if (!code) { await showMessage({ title: "Código temporal no válido", message: "Ese código temporal no existe, ya se usó o caducó (dura 10 minutos). Pide uno nuevo en el otro teléfono." }); return; }
        }
        const acc = await QSync.accountFromCode(code);
        if (current && !current.gone && current.id === acc.id) { await showMessage({ title: "Ya estás en esa cuenta", message: "Este teléfono ya usa la cuenta de ese código." }); return; }
        const rows = await syncRpc("qpeeg_get", { p_id: acc.id });
        const row = Array.isArray(rows) ? rows[0] : null;
        if (row && row.gone) { await showMessage({ title: "Código antiguo", message: "Ese código ya no funciona: la cuenta se borró o cambió de código. Si cambió, pide el código nuevo." }); return; }
        if (!row) { await showMessage({ title: "No existe esa cuenta", message: "No hay ninguna cuenta con ese código. Revisa que esté bien escrito." }); return; }

        let ok;
        if (current && !current.gone) {
            if (!(await flushAccount())) { await showMessage({ title: "No se pudo cambiar", message: "No se pudo guardar lo último de tu cuenta. Revisa tu conexión e inténtalo de nuevo." }); return; }
            ok = await askConfirm({
                title: "Cambiar de cuenta",
                message: `Este teléfono va a usar la cuenta de ese código y mostrará sus datos.\n\nTu cuenta no se borra: está guardada con tu código\n\n${current.code}\n\nAnótalo si no lo tienes, para poder volver.`,
                confirmLabel: "Cambiar de cuenta", danger: false
            });
        } else if (current && current.gone) {
            ok = await askConfirm({
                title: "Entrar con el código",
                message: "Este teléfono va a usar la cuenta de ese código y mostrará sus datos. Lo que hiciste aquí después de que la cuenta cambió de código se reemplaza.",
                confirmLabel: "Entrar", danger: false
            });
        } else if (hasUserData()) {
            ok = await askConfirm({
                title: "Este teléfono tiene datos sin cuenta",
                message: "Lo que hay en este teléfono no está guardado en ninguna cuenta. Al entrar se reemplaza por los datos de la cuenta y se pierde.\n\nSi quieres conservarlo, cancela y toca \"Crear mi código\".",
                confirmLabel: "Entrar y reemplazar"
            });
        } else ok = true;
        if (!ok) return;

        syncForce = true;
        try {
            const remote = await QSync.open(row.blob, acc.keyRaw, acc.id);
            applySyncedData(remote.data);
            Object.assign(acc, { rev: Number(row.rev), base: syncableState(), lastSync: Date.now() });
            await saveAccount(acc);
            await syncNow();
        } finally { syncForce = false; }
        await showMessage({ title: "Listo", message: "Este teléfono ya usa esa cuenta. Los cambios se sincronizan solos con los demás teléfonos que tengan el mismo código." });
    } catch (e) {
        await showMessage({ title: "No se pudo entrar", message: e && e.offline ? "Revisa tu conexión e inténtalo de nuevo." : "El código no corresponde a esa cuenta o los datos están dañados." });
    } finally {
        if (syncStatus === "syncing") syncStatus = "idle";
        syncListeners.forEach(fn => fn(syncStatus));
    }
}

/* Código temporal para el otro teléfono (más corto de escribir que el de cuenta) */
async function pairPhone() {
    const acc = await loadAccount();
    if (!acc) return;
    if (!navigator.onLine) { await offlineMsg("crear el código temporal"); return; }
    try {
        const pair = await QSync.publishPair(syncRpc, acc.code);
        await openDialog({
            title: "Usar en otro teléfono",
            message: `En el otro teléfono abre Ajustes → Cuenta → "Entrar con un código" y escribe tu código, o este código temporal más corto:\n\n${pair}\n\nEl temporal sirve una sola vez y caduca en 10 minutos. Después, los dos teléfonos tendrán los mismos datos.`,
            buttons: [{ label: "Listo", kind: "accept", confirm: true, value: true }]
        });
    } catch (e) {
        await showMessage({ title: "No se pudo crear", message: "Revisa tu conexión e inténtalo de nuevo." });
    }
}

/* Código nuevo con los mismos datos; el viejo deja de funcionar (útil si alguien más lo vio) */
async function changeCode() {
    const acc = await loadAccount();
    if (!acc || acc.gone) return;
    const ok = await askConfirm({
        title: "Cambiar mi código",
        message: "Se crea un código nuevo con todos tus datos y el código actual deja de funcionar.\n\nEn tus otros teléfonos tendrás que escribir el código nuevo. Las versiones anteriores guardadas no pasan al código nuevo.",
        confirmLabel: "Cambiar código", danger: false
    });
    if (!ok) return;
    if (!navigator.onLine) { await offlineMsg("cambiar el código"); return; }
    try {
        if (!(await flushAccount())) throw new Error("sin guardar");
        const code = QSync.newAccountCode();
        const next = await QSync.accountFromCode(code);
        const data = syncableState();
        const blob = await QSync.seal({ data, savedAt: state.meta.savedAt || Date.now() }, next.keyRaw, next.id);
        const rev = Number(await syncRpc("qpeeg_put", { p_id: next.id, p_blob: blob, p_rev: 0 }));
        if (!(rev > 0)) throw new Error("no se creó");
        await saveAccount(Object.assign(next, { rev, base: data, lastSync: Date.now() }));
        await syncRpc("qpeeg_retire", { p_id: acc.id });
        syncListeners.forEach(fn => fn(syncStatus));
        await showAccountCode(code, "Este es tu código nuevo. El anterior ya no funciona.");
    } catch (e) {
        await showMessage({ title: "No se pudo cambiar", message: "Revisa tu conexión e inténtalo de nuevo. Tu código actual sigue funcionando." });
    }
}

/* Copias que guarda el servidor (una cada 3 horas como mucho, las 20 últimas) */
const fmtVersion = ts => new Date(ts).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

async function showVersions() {
    const acc = await loadAccount();
    if (!acc || acc.gone) return;
    if (!navigator.onLine) { await offlineMsg("ver las versiones anteriores"); return; }
    let list;
    try { list = await syncRpc("qpeeg_history", { p_id: acc.id }); }
    catch (e) { await showMessage({ title: "No se pudo abrir", message: "Revisa tu conexión e inténtalo de nuevo." }); return; }
    if (!Array.isArray(list) || !list.length) {
        await showMessage({ title: "Versiones anteriores", message: "Todavía no hay copias. Mientras usas la app se guarda una copia de tu cuenta cada pocas horas, y aquí podrás volver a cualquiera de ellas." });
        return;
    }
    const { sheet, close } = openSheet("versions-sheet", "Versiones anteriores");
    const body = document.createElement("div");
    body.className = "order-list versions-list";
    const note = document.createElement("p");
    note.className = "settings-note";
    note.textContent = "Tu cuenta tal como estaba en cada momento. Si algo se borró o se mezcló, vuelve a una versión de antes.";
    body.appendChild(note);
    list.forEach(v => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dialog-btn ghost version-btn";
        b.textContent = fmtVersion(v.saved_at);
        b.onclick = async () => { close(); await restoreVersion(acc, v); };
        body.appendChild(b);
    });
    sheet.appendChild(body);
}

async function restoreVersion(acc, v) {
    const ok = await askConfirm({
        title: "Volver a esta versión",
        message: `Tu cuenta volverá a como estaba el ${fmtVersion(v.saved_at)}, en todos tus teléfonos.\n\nLo de ahora no se pierde: se guarda como otra versión, por si quieres deshacerlo.`,
        confirmLabel: "Volver a esta versión", danger: false
    });
    if (!ok) return;
    syncForce = true;
    try {
        if (!(await flushAccount())) throw new Error("sin guardar");
        await syncRpc("qpeeg_snapshot", { p_id: acc.id });
        const rows = await syncRpc("qpeeg_history_get", { p_id: acc.id, p_rev: v.rev });
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) throw new Error("no está");
        const old = await QSync.open(row.blob, acc.keyRaw, acc.id);
        applySyncedData(old.data);
        if ((await syncNow()) !== "ok") throw new Error("sin subir");
        await showMessage({ title: "Listo", message: "Tu cuenta volvió a esa versión. Los demás teléfonos la reciben al sincronizar." });
    } catch (e) {
        await showMessage({ title: "No se pudo volver", message: "Revisa tu conexión e inténtalo de nuevo." });
    } finally { syncForce = false; }
}

async function leaveAccount() {
    const acc = await loadAccount();
    const ok = await askConfirm({
        title: "Salir de la cuenta",
        message: `Este teléfono deja de sincronizarse. Los datos se quedan aquí y también en la cuenta.${acc && !acc.gone ? `\n\nPara volver necesitarás tu código:\n\n${acc.code}` : ""}`,
        confirmLabel: "Salir"
    });
    if (!ok) return;
    await saveAccount(undefined);
    syncStatus = "idle";
    syncListeners.forEach(fn => fn(syncStatus));
}

/* ---------- Sección en Ajustes ---------- */

function syncStatusText(status, acc) {
    if (status === "syncing") return "Sincronizando…";
    if (status === "offline" || !navigator.onLine) return "Sin conexión: se sincroniza al volver.";
    if (status === "error") return "No se pudo sincronizar. Se reintentará solo.";
    if (status === "busy") return "Hay cambios de otro teléfono: se aplican al terminar lo que estás haciendo.";
    if (status === "toolarge") return "Tu cuenta pasa de 1 MB y no se puede sincronizar. Prueba a quitar la foto de perfil.";
    if (status === "full") return "El servidor está lleno y no admite cuentas nuevas por ahora. Tus datos siguen en este teléfono.";
    if (acc && acc.lastSync) {
        const min = Math.round((Date.now() - acc.lastSync) / 60000);
        return "Sincronizado " + (min < 1 ? "hace un momento." : min < 60 ? `hace ${min} min.` : `el ${new Date(acc.lastSync).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`);
    }
    return "Pendiente de la primera sincronización.";
}

/* Devuelve [etiqueta, contenido] para añadir a la ventana de Ajustes, y una función para quitar el aviso de cambios */
function buildAccountSection(label) {
    if (!SYNC_ON) return { nodes: [], dispose() {} };
    const wrap = document.createElement("div");
    wrap.className = "settings-photo settings-account";
    const btn = (text, kind, onClick) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `dialog-btn ${kind}`;
        b.textContent = text;
        b.onclick = onClick;
        return b;
    };
    const note = text => { const p = document.createElement("p"); p.className = "settings-note"; p.textContent = text; return p; };

    let painting = 0;
    const paint = async () => {
        const seq = ++painting;
        const acc = await loadAccount();
        if (seq !== painting) return;
        wrap.innerHTML = "";
        if (!acc) {
            wrap.append(
                note("Tu código es tu cuenta: escríbelo en otro teléfono y los dos tendrán los mismos datos, al mismo tiempo. No hay correo ni contraseña."),
                btn("Crear mi código", "accept", async () => { await createAccount(); paint(); }),
                btn("Entrar con un código", "ghost", async () => { await enterCode(); paint(); })
            );
            return;
        }
        if (acc.gone) {
            wrap.append(
                note("Esta cuenta se borró o cambió de código en otro teléfono, así que este ya no se sincroniza. Tus datos siguen aquí. Si cambió de código, escribe el nuevo para seguir sincronizando."),
                btn("Entrar con un código", "accept", async () => { await enterCode(); paint(); }),
                btn("Salir de la cuenta", "danger", async () => { await leaveAccount(); paint(); })
            );
            return;
        }
        const codeBtn = btn(acc.code, "ghost account-code", () => showAccountCode(acc.code));
        codeBtn.setAttribute("aria-label", "Ver tu código");
        wrap.append(
            note("Tu código (tócalo para guardarlo o compartirlo):"),
            codeBtn,
            note(syncStatusText(syncStatus, acc)),
            btn("Usar en otro teléfono", "accept", pairPhone),
            btn("Entrar con otro código", "ghost", async () => { await enterCode(); paint(); }),
            btn("Versiones anteriores", "ghost", showVersions),
            btn("Cambiar mi código", "ghost", async () => { await changeCode(); paint(); }),
            btn("Salir de la cuenta", "danger", async () => { await leaveAccount(); paint(); })
        );
    };
    syncListeners.add(paint);
    paint();
    return { nodes: [label("Cuenta"), wrap], dispose: () => syncListeners.delete(paint) };
}
