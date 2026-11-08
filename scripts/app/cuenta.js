/* =========================================================
    CUENTA Y SINCRONIZACIÓN (Ajustes → Cuenta)
    La app sigue funcionando sin conexión; con conexión sube y baja los cambios.
    La lógica (códigos, cifrado, fusión) está en scripts/core/sincronizacion.js.
========================================================= */

const SYNC_ON = !!(typeof QPEEG_SYNC !== "undefined" && QPEEG_SYNC.url && QPEEG_SYNC.key);
const ACCOUNT_KEY = "account";
const syncRpc = SYNC_ON ? QSync.client(QPEEG_SYNC) : null;

let syncStatus = "idle";
let syncForce = false;            /* al unirse a una cuenta se aplican los datos aunque haya una ventana abierta */
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
    loadAccount,
    saveAccount,
    onError: e => console.warn("[sync]", e),
    onStatus: s => {
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
    document.addEventListener("visibilitychange", () => syncNow());   /* al volver a la app y al salir de ella */
    setInterval(() => { if (document.visibilityState === "visible") syncNow(); }, 90000);
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
        title: "Tu código de cuenta",
        message: `${intro ? intro + "\n\n" : ""}${code}\n\nGuárdalo en un lugar seguro: es la única forma de recuperar tus datos. No hay correo ni contraseña.`,
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
    await showAccountCode(code, "Listo. Con este código puedes usar tus datos en otro teléfono.");
}

const CODE_ERRORS = {
    chars: "Ese código tiene un carácter que no se usa en los códigos.",
    check: "Alguna letra del código está mal escrita. Revísalo.",
    length: "El código de cuenta tiene 20 caracteres (el temporal, 8)."
};

async function joinAccount() {
    const text = await askText({
        title: "Entrar con un código",
        label: "Escribe tu código de cuenta, o el código temporal que te dio el otro teléfono.",
        placeholder: "XXXX-XXXX-XXXX-XXXX-XXXX",
        maxLength: 32,
        confirmLabel: "Entrar",
        validate: t => { const p = QSync.parseCode(t); return p.kind ? "" : CODE_ERRORS[p.error]; }
    });
    if (!text) return;
    if (!navigator.onLine) { await showMessage({ title: "Sin conexión", message: "Para entrar en una cuenta necesitas internet. Después todo funciona sin conexión." }); return; }

    syncStatus = "syncing"; syncListeners.forEach(fn => fn(syncStatus));
    try {
        const parsed = QSync.parseCode(text);
        let code = parsed.code;
        if (parsed.kind === "pair") {
            code = await QSync.takePair(syncRpc, parsed.code);
            if (!code) { await showMessage({ title: "Código no válido", message: "Ese código temporal no existe, ya se usó o caducó. Pide uno nuevo en el otro teléfono." }); return; }
        }
        const acc = await QSync.accountFromCode(code);
        const rows = await syncRpc("qpeeg_get", { p_id: acc.id });
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) { await showMessage({ title: "Cuenta vacía", message: "No hay datos guardados con ese código. Revisa que sea el correcto." }); return; }

        let mode = "account";
        if (hasUserData()) {
            mode = await openDialog({
                title: "Este teléfono ya tiene datos",
                message: "Puedes unirlos con los de la cuenta, o quedarte solo con los de la cuenta (los de este teléfono se borran).",
                buttons: [
                    { label: "Cancelar", kind: "ghost", confirm: false, cancelValue: null },
                    { label: "Solo la cuenta", kind: "danger", confirm: false, cancelValue: "account" },
                    { label: "Unir", kind: "accept", confirm: true, value: "merge" }
                ]
            });
            if (!mode) return;
        }

        syncForce = true;
        try {
            if (mode === "account") {
                const remote = await QSync.open(row.blob, acc.keyRaw, acc.id);
                applySyncedData(remote.data);
                Object.assign(acc, { rev: Number(row.rev), base: remote.data, lastSync: Date.now() });
            }   /* "merge": sin base común, la primera sincronización suma lo de los dos lados */
            await saveAccount(acc);
            await syncNow();
        } finally { syncForce = false; }
        await showMessage({ title: "Cuenta vinculada", message: "Este teléfono ya usa tu cuenta. Los cambios se sincronizan solos cuando hay conexión." });
    } catch (e) {
        await showMessage({ title: "No se pudo entrar", message: e && e.offline ? "Revisa tu conexión e inténtalo de nuevo." : "El código no corresponde a esta cuenta o los datos están dañados." });
    } finally {
        if (syncStatus === "syncing") syncStatus = "idle";
        syncListeners.forEach(fn => fn(syncStatus));
    }
}

async function pairPhone() {
    const acc = await loadAccount();
    if (!acc) return;
    if (!navigator.onLine) { await showMessage({ title: "Sin conexión", message: "Necesitas internet para crear el código temporal." }); return; }
    try {
        const pair = await QSync.publishPair(syncRpc, acc.code);
        await openDialog({
            title: "Vincular otro teléfono",
            message: `En el otro teléfono abre Ajustes → Cuenta → "Ya tengo un código" y escribe:\n\n${pair}\n\nCaduca en 10 minutos y sirve una sola vez.`,
            buttons: [{ label: "Listo", kind: "accept", confirm: true, value: true }]
        });
    } catch (e) {
        await showMessage({ title: "No se pudo crear", message: "Revisa tu conexión e inténtalo de nuevo." });
    }
}

async function leaveAccount() {
    const ok = await askConfirm({
        title: "Salir de la cuenta",
        message: "Este teléfono deja de sincronizarse. Tus datos se quedan aquí y también en la cuenta. Para volver necesitarás el código.",
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
                note("Usa tus datos en varios teléfonos con un código. Sin correo ni contraseña."),
                btn("Crear código de cuenta", "accept", async () => { await createAccount(); paint(); }),
                btn("Ya tengo un código", "ghost", async () => { await joinAccount(); paint(); })
            );
            return;
        }
        const codeBtn = btn(acc.code, "ghost account-code", () => showAccountCode(acc.code));
        codeBtn.setAttribute("aria-label", "Ver tu código de cuenta");
        wrap.append(
            codeBtn,
            note(syncStatusText(syncStatus, acc)),
            btn("Vincular otro teléfono", "accept", pairPhone),
            btn("Salir de la cuenta", "danger", async () => { await leaveAccount(); paint(); })
        );
    };
    syncListeners.add(paint);
    paint();
    return { nodes: [label("Cuenta"), wrap], dispose: () => syncListeners.delete(paint) };
}
