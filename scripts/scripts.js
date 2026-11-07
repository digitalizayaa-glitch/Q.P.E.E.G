/* =========================================================
    PWA: registro del service worker
========================================================= */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
}

/* Pide al navegador que no borre los datos por falta de uso (Safari puede hacerlo tras días sin abrir la app) */
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

/* =========================================================
    ESTADO
========================================================= */

const STORAGE_KEY = "qpeeg_state_v1";

const DEFAULT_STATE = {
    photo: null,
    avatar: null,
    sports: {},          /* { "2026-11-07": [{ id, k, n, u: "km" | "min", v }] } */        /* avatar elegido en lugar de foto (Ajustes) */
    achievements: [],
    routines: [],
    activeRoutineId: null,
    logs: {},
    food: { log: {} },
    nutrition: null,
    settings: { theme: "dark", glow: "verde", bright: "mid", speed: "mid" }
};

/* Límites usados ya al cargar los datos (deben existir antes de loadState) */
const MAX_SERIES_PER_EXERCISE = 8;   /* series de un ejercicio, contando las extra de Entreno (2 filas de 4) */
const MAX_EXTRA_SERIES = 8;
const ACH_MAX_ACTIVE = 3;        /* logros por cumplir a la vez */
const ACH_MAX_TOTAL = 6;         /* incluidos los completados */
const EXTRA_ROUTINE_ID = "__extra";   /* rutina interna (oculta) con un día "Extraordinario" por fecha */

let state = loadState();

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_STATE);
        const parsed = JSON.parse(raw);
        try { return freezeOldPlans(sanitizeState(parsed)); }
        catch (e) { return Object.assign(structuredClone(DEFAULT_STATE), parsed); }   /* nunca perder los datos guardados */
    } catch (e) {
        return structuredClone(DEFAULT_STATE);
    }
}

/* Repara datos dañados o ajenos (respaldo editado a mano, versión vieja):
   descarta lo que no tenga la forma esperada en lugar de romper la app. */
function sanitizeState(src) {
    const isObj = v => v && typeof v === "object" && !Array.isArray(v);
    const str = (v, max = 60) => (typeof v === "string" ? v.slice(0, max) : "");
    const num = v => (typeof v === "number" && isFinite(v) && v >= 0 ? v : 0);
    const s = Object.assign(structuredClone(DEFAULT_STATE), isObj(src) ? src : {});

    s.photo = typeof s.photo === "string" && s.photo.startsWith("data:image/") ? s.photo : null;
    s.avatar = ["orbes", "prisma", "ondas"].includes(s.avatar) ? s.avatar : null;
    /* Logros: { t: texto, done: completado }. Los de versiones viejas eran solo texto. */
    s.achievements = (Array.isArray(s.achievements) ? s.achievements : [])
        .map(a => typeof a === "string" ? { t: a, done: false } : (isObj(a) && typeof a.t === "string" ? { t: a.t, done: !!a.done } : null))
        .filter(a => a && a.t.trim()).map(a => ({ t: a.t.slice(0, 60), done: a.done })).slice(0, ACH_MAX_TOTAL);

    s.routines = (Array.isArray(s.routines) ? s.routines : []).filter(r => isObj(r) && typeof r.id === "string").map(r => ({
        ...r,
        name: str(r.name, 24),
        days: (Array.isArray(r.days) ? r.days : []).filter(d => isObj(d) && typeof d.id === "string").map(d => ({
            ...d,
            name: str(d.name, 24),
            exercises: (Array.isArray(d.exercises) ? d.exercises : []).filter(ex => isObj(ex) && typeof ex.id === "string").map(ex => ({
                ...ex,
                name: str(ex.name, 20),   /* = EXERCISE_NAME_MAX (aún no existe al cargar) */
                kg: num(ex.kg),
                unit: ex.unit === "lb" ? "lb" : "kg",
                series: seriesOf(ex.series, num, isObj)
            }))
        }))
    }));
    if (!s.routines.some(r => r.id === s.activeRoutineId)) s.activeRoutineId = null;

    const logs = isObj(s.logs) ? s.logs : {};
    s.logs = {};
    for (const rid in logs) {
        if (!isObj(logs[rid])) continue;
        s.logs[rid] = {};
        for (const key in logs[rid]) {
            const e = logs[rid][key];
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !isObj(e)) continue;
            const exercises = {};
            for (const id in (isObj(e.exercises) ? e.exercises : {})) {
                const x = e.exercises[id];
                if (isObj(x)) exercises[id] = { kg: num(x.kg), reps: (Array.isArray(x.reps) ? x.reps : []).map(num), extra: Math.min(MAX_EXTRA_SERIES, Math.round(num(x.extra))) };
            }
            const entry = { dayId: typeof e.dayId === "string" ? e.dayId : "", exercises };
            /* metas guardadas: [mín, máx] por serie (las viejas eran un solo número) */
            if (Array.isArray(e.plan)) entry.plan = e.plan.filter(p => isObj(p) && typeof p.id === "string")
                .map(p => ({ id: p.id, t: (Array.isArray(p.t) ? p.t : []).map(x => Array.isArray(x) ? [num(x[0]), num(x[1])] : [num(x), num(x)]) }));
            s.logs[rid][key] = entry;
        }
    }

    const foodLog = isObj(s.food) && isObj(s.food.log) ? s.food.log : {};
    s.food = { log: {} };
    for (const key in foodLog) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(foodLog[key])) continue;
        const list = foodLog[key].filter(f => isObj(f) && typeof f.g === "string" && typeof f.p === "number" && isFinite(f.p))
            .map(f => ({ ...f, id: String(f.id ?? ""), n: str(f.n, 80), t: str(f.t, 80) }));
        if (list.length) s.food.log[key] = list;
    }

    const nu = s.nutrition;
    const p = isObj(nu) && isObj(nu.profile) ? nu.profile : null;
    const okNum = v => typeof v === "number" && isFinite(v) && v > 0;
    s.nutrition = p && okNum(p.age) && okNum(p.height) && okNum(p.weight) && okNum(p.activity) && (p.sex === "m" || p.sex === "f")
        ? { profile: { ...p, bf: okNum(p.bf) ? p.bf : null }, goal: ["maintain", "bulk", "cut"].includes(nu.goal) ? nu.goal : "maintain", diet: ["mod", "high", "low"].includes(nu.diet) ? nu.diet : "mod" }
        : null;

    const sports = isObj(s.sports) ? s.sports : {};
    s.sports = {};
    for (const key in sports) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(sports[key])) continue;
        const list = sports[key].filter(x => isObj(x) && typeof x.n === "string" && (x.u === "km" || x.u === "min") && num(x.v) > 0)
            .map(x => ({ id: String(x.id ?? ""), k: str(x.k, 20), n: str(x.n, 40), u: x.u, v: num(x.v) }));
        if (list.length) s.sports[key] = list;
    }

    s.settings = isObj(s.settings) ? s.settings : {};
    return s;
}

/* Series de un ejercicio: [{ min, max }], todas con el mismo rango ("3 × 8–12" o "4 × 10").
   Las de versiones viejas tenían una meta fija por serie ({ target }): si eran distintas,
   el rango va de la menor a la mayor. Máximo 6 series. */
function seriesOf(list, num, isObj) {
    const raw = (Array.isArray(list) && list.length ? list : [{}]).slice(0, MAX_SERIES_PER_EXERCISE).map(x => {
        const o = isObj(x) ? x : {};
        const a = "min" in o ? num(o.min) : num(o.target), b = "max" in o ? num(o.max) : num(o.target);
        return [Math.min(a, b), Math.max(a, b)];
    });
    const lo = Math.min(...raw.map(r => r[0])), hi = Math.max(...raw.map(r => r[1]));
    return raw.map(() => ({ min: lo, max: hi }));
}

/* "8–12", o "10" si es un número fijo */
const fmtRange = ([lo, hi]) => (lo === hi ? String(lo) : `${lo}–${hi}`);
const rangeOf = ex => [ex.series[0].min, ex.series[0].max];

/* ---------- Metas guardadas con cada registro ----------
   Cada día entrenado guarda una copia de las metas (plan) que tenía la rutina ese día.
   Así, editar o borrar ejercicios y días después no cambia el color del historial.
   El plan del día de hoy sigue a la rutina hasta que termina el día. */

function planOf(day) {
    return day.exercises.map(ex => ({ id: ex.id, t: ex.series.map(s => [s.min, s.max]) }));
}

/* Registros anteriores a esta versión: se congelan con la rutina tal como está ahora */
function freezeOldPlans(s) {
    for (const rid in s.logs) {
        const routine = s.routines.find(r => r.id === rid);
        for (const key in s.logs[rid]) {
            const entry = s.logs[rid][key];
            if (entry.plan) continue;
            const day = routine && routine.days.find(d => d.id === entry.dayId);
            if (day) entry.plan = planOf(day);
        }
    }
    return s;
}

function refreshTodayPlans() {
    const today = dateKey();
    for (const rid in state.logs) {
        const entry = state.logs[rid][today];
        const day = entry && findDay(findRoutine(rid), entry.dayId);
        if (day) entry.plan = planOf(day);
    }
}

/* Metas de un ejercicio en una fecha: las guardadas ese día, o las actuales si es hoy o no hay copia */
function targetsFor(routineId, key, ex) {
    const saved = key !== dateKey() && state.logs[routineId]?.[key]?.plan?.find(p => p.id === ex.id);
    return saved ? saved.t : ex.series.map(s => [s.min, s.max]);
}

let saveWarned = false;
function saveState() {
    refreshTodayPlans();
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (e) {
        if (!saveWarned) {
            saveWarned = true;
            showMessage({ title: "No se pudo guardar", message: "El almacenamiento del teléfono está lleno o bloqueado. Exporta un respaldo y libera espacio." });
        }
        return false;
    }
}

/* Reduce la foto a ~320px (JPEG) para que ocupe pocos KB */
function shrinkImage(file, max = 320) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const k = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement("canvas");
            c.width = Math.round(img.width * k);
            c.height = Math.round(img.height * k);
            c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
        img.src = url;
    });
}

/* ---------- Respaldo ---------- */
function exportBackup() {
    const blob = new Blob([JSON.stringify({ app: "qpeeg", version: 1, state }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qpeeg-respaldo-${dateKey()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function importBackup(file) {
    let data;
    try {
        data = JSON.parse(await file.text());
    } catch (e) { data = null; }
    const st = data && data.app === "qpeeg" ? data.state : null;
    if (!st || typeof st !== "object" || !Array.isArray(st.routines) || !st.logs || typeof st.logs !== "object") {
        showMessage({ title: "Archivo no válido", message: "Ese archivo no es un respaldo de Q.P.E.E.G." });
        return;
    }
    const ok = await askConfirm({
        title: "Importar respaldo",
        message: "Esto reemplazará todos tus datos actuales por los del respaldo.",
        confirmLabel: "Reemplazar",
        danger: true
    });
    if (!ok) return;
    state = freezeOldPlans(sanitizeState(st));
    if (saveState()) location.reload();
}

function getDateText(date = new Date()) {
    const text = date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- Registro por rutina + fecha ---------- */

let selectedDate = null; // null = hoy

function dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function parseKey(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
}

function getWorkoutDateKey() {
    return selectedDate || dateKey();
}

/* Lee sin crear nada */
/* reps: primero las series de la rutina y luego las extra de ese día */
function readExerciseLog(routineId, key, ex) {
    const stored = state.logs[routineId]?.[key]?.exercises?.[ex.id];
    const extra = stored ? stored.extra || 0 : 0;
    return {
        kg: stored ? stored.kg : ex.kg,
        extra,
        reps: Array.from({ length: ex.series.length + extra }, (_, i) => (stored ? (stored.reps[i] || 0) : 0))
    };
}

/* Asocia el registro a un día; si es nuevo o cambia de día, copia las metas actuales de ese día */
function setEntryDay(routineId, entry, dayId) {
    if (entry.dayId === dayId && entry.plan) return;
    entry.dayId = dayId;
    const day = findDay(findRoutine(routineId), dayId);
    if (day) entry.plan = planOf(day);
}

/* Crea el registro si no existe (para escribir) */
function ensureExerciseLog(routineId, key, dayId, ex) {
    state.logs[routineId] ??= {};
    const entry = (state.logs[routineId][key] ??= { dayId, exercises: {} });
    setEntryDay(routineId, entry, dayId);
    return (entry.exercises[ex.id] ??= { kg: ex.kg, reps: ex.series.map(() => 0), extra: 0 });
}

/* Estado de una serie: vacía (""), rojo bajo el mínimo, dorado sobre el máximo, verde dentro.
   Las series extra (sin rango) siempre cuentan como progreso: dorado. */
function serieStatus(range, r) {
    if (!range) return "gold";
    if (!r) return "";
    return r < range[0] ? "red" : r > range[1] ? "gold" : "green";
}

/* ranges = [mín, máx] de cada serie (los del día registrado); reps = repeticiones hechas (las extra van después).
   Rojo si alguna serie no llega al mínimo, dorado si alguna pasa del máximo o hay series extra hechas, verde si todas quedan dentro. */
function exerciseStatus(ranges, reps) {
    const states = reps.map((r, i) => (r > 0 ? serieStatus(ranges[i], r) : "")).filter(Boolean);

    if (states.length === 0) return "pending";
    if (states.includes("red")) return "red";
    if (states.includes("gold")) return "gold";
    return "green";
}

function dayStatus(routine, key) {
    const entry = state.logs[routine.id]?.[key];
    if (!entry) return "empty";

    /* Hoy: la rutina actual. Días pasados: las metas guardadas ese día (aunque luego se borrara el día o el ejercicio) */
    const day = findDay(routine, entry.dayId);
    const plan = key !== dateKey() && entry.plan ? entry.plan : (day ? planOf(day) : null);
    if (!plan || plan.length === 0) return "empty";

    const statuses = plan.map(p => exerciseStatus(p.t, entry.exercises[p.id]?.reps || []));

    if (statuses.every(s => s === "pending")) return "empty";
    if (statuses.some(s => s === "pending")) return "red"; // se empezó pero no se completó
    if (statuses.includes("red")) return "red";
    if (statuses.includes("gold")) return "gold";
    return "green";
}

/* =========================================================
    PANTALLA DE INICIO
========================================================= */

let tooltipInterval = null;

function initLanding() {
    renderProfile();
    renderAchievements();
    startTooltipLoop();

    document.getElementById("profilePhoto").addEventListener("click", onProfilePhotoClick);
    document.getElementById("photoInput").addEventListener("change", onPhotoSelected);
    document.getElementById("exportBtn").addEventListener("click", exportBackup);
    const imp = document.getElementById("importInput");
    document.getElementById("importBtn").addEventListener("click", () => imp.click());
    imp.addEventListener("change", () => { if (imp.files[0]) importBackup(imp.files[0]); imp.value = ""; });
}

function startTooltipLoop() {
    const tooltip = document.getElementById("profileTooltip");
    tooltip.classList.add("visible");
    tooltipInterval = setInterval(() => tooltip.classList.toggle("visible"), 2000);
}

function stopTooltipLoop() {
    clearInterval(tooltipInterval);
    document.getElementById("profileTooltip").classList.remove("visible");
}

function onProfilePhotoClick() {
    stopTooltipLoop();

    if (!state.photo && !state.avatar) {
        document.getElementById("photoInput").click();
        return;
    }

    enterApp(true);
}

function onPhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    shrinkImage(file).then(data => {
        state.photo = data;
        saveState();
        renderProfile();
    }).catch(() => showMessage({ title: "Foto no válida", message: "No se pudo leer esa imagen." }));
    event.target.value = "";
}

function enterApp(animated) {
    const landing = document.getElementById("landing");
    const app = document.getElementById("mainApp");
    const show = () => setHeaderDateText(getDateText());

    if (animated && !SWIPE.busy) {
        switchScreen(landing, app, "flex", show);
        return;
    }

    landing.style.display = "none";
    app.style.display = "flex";
    show();
}

/* Cambia entre la pantalla de inicio y la app con la animación Profundidad */
/* Inicio <-> app: un desvanecimiento corto y discreto */
async function switchScreen(fromEl, toEl, toDisplay, after) {
    SWIPE.busy = true;
    await fromEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110 * NAV_SPEED, easing: "ease-in", fill: "forwards" }).finished.catch(() => {});

    fromEl.style.display = "none";
    fromEl.getAnimations().forEach(a => a.cancel());
    toEl.style.display = toDisplay;
    if (after) after();
    fitLayout(true);

    await toEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 170 * NAV_SPEED, easing: "ease-out" }).finished.catch(() => {});
    SWIPE.busy = false;
}

/* Entrar o salir de algo dentro de la app (un día, una rutina, volver): desvanecimiento muy corto,
   apenas perceptible. Las pestañas siguen cambiando con el deslizamiento de profundidad. */
let navFading = false;
async function navFade(change) {
    if (navFading || SWIPE.busy) return;
    navFading = true;
    const targets = [document.querySelector("main"), document.querySelector(".week-tab-label"), document.getElementById("weekDate")].filter(Boolean);
    await Promise.all(targets.map(t => t.animate([{ opacity: 1 }, { opacity: .2 }], { duration: 70 * NAV_SPEED, easing: "ease-in", fill: "forwards" }).finished.catch(() => {})));
    try { change(); } finally {
        targets.forEach(t => {
            t.getAnimations().forEach(a => a.cancel());
            t.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 140 * NAV_SPEED, easing: "ease-out" });
        });
        navFading = false;
    }
}

/* =========================================================
    LOGROS / OBJETIVOS (máx. 3)
========================================================= */

/* Logros: los completados quedan en verde con ✓. Solo se pueden tener ACH_MAX_ACTIVE por cumplir a la vez. */
const activeAchievements = list => list.filter(a => !a.done).length;

function renderAchievements() {
    const list = document.getElementById("achievementsList");
    const control = document.getElementById("achievementsControl");

    list.innerHTML = "";
    state.achievements.forEach(a => {
        const chip = document.createElement("div");
        chip.className = "achievement-chip" + (a.done ? " done" : "");
        chip.textContent = a.t;
        list.appendChild(chip);
    });

    control.innerHTML = "";

    const canAdd = activeAchievements(state.achievements) < ACH_MAX_ACTIVE && state.achievements.length < ACH_MAX_TOTAL;
    if (canAdd) {
        control.appendChild(addSquare("Añadir logro", onAddAchievement, "add-compact"));
    } else {
        const msg = document.createElement("p");
        msg.className = "achievements-limit";
        msg.textContent = "Recuerda que no puedes ocuparte de todo, un par de cosas a la vez sin perder tu constancia";
        control.appendChild(msg);
    }

    if (state.achievements.length) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "achievements-edit";
        edit.textContent = "Editar logros";
        edit.onclick = openAchievementsEditor;
        control.appendChild(edit);
    }
}

async function onAddAchievement() {
    const text = await askText({ title: "Nuevo objetivo", label: "Escribe un objetivo o logro", maxLength: 60, placeholder: "Ej. Dominada con +10 kg" });
    if (!text) return;

    state.achievements.push({ t: text, done: false });
    saveState();
    renderAchievements();
}

/* Editor de logros: oscurece el resto del inicio y deja solo los logros.
   ✓ = completado (se queda, en verde) · ✕ = quitar (en rojo, se borra al guardar) · + = añadir.
   Nada cambia hasta pulsar "Guardar". */
function openAchievementsEditor() {
    let draft = state.achievements.map(a => ({ t: a.t, done: a.done, remove: false }));

    const overlay = document.createElement("div");
    overlay.className = "ach-overlay";
    const box = document.createElement("div");
    box.className = "ach-editor";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Editar logros");
    overlay.appendChild(box);

    const draw = () => {
        box.innerHTML = `<h3 class="ach-title">Logros</h3><p class="ach-help"><b class="g">✓</b> completado · <b class="r">✕</b> quitar</p>`;
        const list = document.createElement("div");
        list.className = "ach-list";

        draft.forEach((a, i) => {
            const row = document.createElement("div");
            row.className = "ach-row achievement-chip" + (a.done ? " done" : "") + (a.remove ? " remove" : "");
            const text = document.createElement("span");
            text.className = "ach-text";
            text.textContent = a.t;

            const ok = document.createElement("button");
            ok.type = "button";
            ok.className = "ach-btn ok" + (a.done ? " on" : "");
            ok.textContent = "✓";
            ok.setAttribute("aria-label", a.done ? "Quitar de completados" : "Marcar como completado");
            ok.setAttribute("aria-pressed", a.done);
            ok.onclick = () => { a.done = !a.done; a.remove = false; draw(); };

            const del = document.createElement("button");
            del.type = "button";
            del.className = "ach-btn del" + (a.remove ? " on" : "");
            del.textContent = "✕";
            del.setAttribute("aria-label", a.remove ? "No quitar" : "Quitar");
            del.setAttribute("aria-pressed", a.remove);
            del.onclick = () => { a.remove = !a.remove; if (a.remove) a.done = false; draw(); };

            row.append(text, ok, del);
            list.appendChild(row);
        });
        box.appendChild(list);

        const kept = draft.filter(a => !a.remove);
        if (activeAchievements(kept) < ACH_MAX_ACTIVE && kept.length < ACH_MAX_TOTAL) {
            box.appendChild(addSquare("Añadir logro", async () => {
                const text = await askText({ title: "Nuevo objetivo", label: "Escribe un objetivo o logro", maxLength: 60, placeholder: "Ej. Dominada con +10 kg" });
                if (!text) return;
                draft.push({ t: text, done: false, remove: false });
                draw();
            }, "add-compact"));
        } else {
            const msg = document.createElement("p");
            msg.className = "achievements-limit";
            msg.textContent = `Máximo ${ACH_MAX_ACTIVE} logros por cumplir a la vez. Marca alguno como completado o quítalo para añadir otro.`;
            box.appendChild(msg);
        }

        const actions = document.createElement("div");
        actions.className = "dialog-actions ach-actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "dialog-btn ghost";
        cancel.textContent = "Cancelar";
        cancel.onclick = () => close(false);
        const save = document.createElement("button");
        save.type = "button";
        save.className = "dialog-btn accept";
        save.textContent = "Guardar";
        save.onclick = () => close(true);
        actions.append(cancel, save);
        box.appendChild(actions);
    };

    let closed = false;
    const close = commit => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKey, true);
        if (commit) {
            state.achievements = draft.filter(a => !a.remove).map(a => ({ t: a.t, done: a.done }));
            saveState();
            renderAchievements();
        }
        overlay.style.pointerEvents = "none";
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
    };
    const onKey = e => { if (e.key === "Escape" && !dialogOverlay) { e.preventDefault(); close(false); } };
    window.addEventListener("keydown", onKey, true);

    draw();
    document.body.appendChild(overlay);
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    box.animate([{ clipPath: "inset(0 0 100% 0)", opacity: .3 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
    box.querySelectorAll(".ach-row").forEach(glowOnce);
}

/* =========================================================
    SEMANA
========================================================= */

/* Orden cíclico de pestañas que recorre el deslizamiento horizontal */
const TAB_ORDER = [
    { id: "week", label: "SEMANA" },
    { id: "exercises", label: "RUTINAS" },
    { id: "food", label: "COMIDA" },
    { id: "history", label: "HISTORIAL" }
];

/* Deslizar recorre TAB_ORDER en bucle; desde Entreno
   (que no pertenece a TAB_ORDER) salen tomando "Semana" como base */
function shiftWeekTab(direction) {
    selectedDate = null;
    foodDate = null;

    const current = document.querySelector(".section.active").id;
    let currentIndex = TAB_ORDER.findIndex(tab => tab.id === current);
    if (currentIndex === -1) currentIndex = TAB_ORDER.findIndex(tab => tab.id === "week");

    const nextIndex = (currentIndex + direction + TAB_ORDER.length) % TAB_ORDER.length;
    showSection(TAB_ORDER[nextIndex].id);
}

/* Muestra los días de la rutina activa, o el mensaje de selección */
/* Pantalla de Semana sin rutina activa (o con una rutina sin días) */
function weekEmptyState(hasRoutine) {
    const box = document.createElement("div");
    box.className = "week-empty";
    box.innerHTML = `
        <div class="week-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                <path d="M6 20v8M12 15v18M36 15v18M42 20v8M12 24h24"/>
            </svg>
        </div>
        <h3>${hasRoutine ? "Tu rutina aún no tiene días" : "Tu semana empieza aquí"}</h3>
        <p>${hasRoutine
            ? "Añade los días de tu rutina en el creador de rutinas y vuelve para elegir el de hoy."
            : "Crea tu rutina en el creador de rutinas y actívala. Aquí verás tus días para entrenar cada día."}</p>`;
    const go = document.createElement("button");
    go.type = "button";
    go.className = "food-start week-empty-btn";
    go.textContent = "Ir al creador de rutinas";
    go.onclick = () => navFade(() => showSection("exercises"));
    box.appendChild(go);
    return box;
}

function renderWeekSection() {
    const container = document.getElementById("weekRoutineContent");
    container.innerHTML = "";

    const routine = state.activeRoutineId ? findRoutine(state.activeRoutineId) : null;

    if (!routine || routine.days.length === 0) {
        if (!routine) state.activeRoutineId = null;
        container.append(weekEmptyState(!!routine), weekActions());
        return;
    }

    const picker = document.createElement("div");
    picker.className = "split-picker";

    routine.days.forEach(day => {
        const btn = document.createElement("button");
        btn.className = "split-card";
        btn.textContent = day.name;
        btn.onclick = () => navFade(() => startWorkoutDay(routine.id, day.id));
        picker.appendChild(btn);
    });

    container.appendChild(picker);

    const caption = document.createElement("p");
    caption.className = "split-caption";
    caption.textContent = "Elige el día de hoy";
    container.append(caption, weekActions());
}

/* ---------- Entreno extraordinario ----------
   Un día "Extraordinario" por fecha dentro de una rutina interna que no se ve en Rutinas.
   Cuenta como entreno: semáforo, calendario y gráfica (con su propio color). */
function ensureExtraDay(key) {
    let routine = findRoutine(EXTRA_ROUTINE_ID);
    if (!routine) {
        routine = { id: EXTRA_ROUTINE_ID, name: "Extraordinario", preset: null, days: [] };
        state.routines.push(routine);
    }
    const id = `xd-${key}`;
    let day = findDay(routine, id);
    if (!day) {
        day = { id, name: "Extraordinario", customName: true, exercises: [] };
        routine.days.push(day);
    }
    return day;
}

function extraDayFor(key) {
    return findDay(findRoutine(EXTRA_ROUTINE_ID), `xd-${key}`);
}

function startExtraWorkout() {
    navFade(() => {
        const day = ensureExtraDay(getWorkoutDateKey());
        saveState();
        startWorkoutDay(EXTRA_ROUTINE_ID, day.id);
        if (!day.exercises.length) addRoutineExercise(EXTRA_ROUTINE_ID, day.id, id => { refreshWorkout(); scrollWorkoutTo(id); });
    });
}

/* Botones de Semana: entreno extraordinario y deporte, y los deportes del día */
function weekActions() {
    const wrap = document.createElement("div");
    wrap.className = "week-actions";

    const key = getWorkoutDateKey();
    const extra = extraDayFor(key);
    const row = document.createElement("div");
    row.className = "week-actions-row";
    row.append(
        addSquare(extra && extra.exercises.length ? `Seguir extraordinario (${extra.exercises.length})` : "Entreno extraordinario", startExtraWorkout, "add-wide week-act"),
        addSquare("Añadir deporte", addSport, "add-wide week-act")
    );
    wrap.appendChild(row);

    const sports = state.sports[key] || [];
    if (sports.length) {
        const list = document.createElement("div");
        list.className = "sport-list";
        sports.forEach(sp => {
            const chip = document.createElement("span");
            chip.className = "sport-chip";
            const text = document.createElement("span");
            text.innerHTML = `${esc(sp.n)} <b>${fmtNum(sp.v, 1)} ${sp.u}</b>`;
            const x = document.createElement("span");
            x.className = "day-delete-x sport-x";
            x.textContent = "✕";
            keyButton(x, `Quitar ${sp.n}`);
            x.onclick = () => removeSport(key, sp.id);
            chip.append(text, x);
            list.appendChild(chip);
        });
        wrap.appendChild(list);
    }
    return wrap;
}

/* ---------- Deportes ---------- */
const SPORTS = [
    { k: "run",    name: "Correr",     u: "km" },
    { k: "bike",   name: "Ciclismo",   u: "km" },
    { k: "swim",   name: "Nadar",      u: "km" },
    { k: "walk",   name: "Caminar",    u: "km" },
    { k: "soccer", name: "Fútbol",     u: "min" },
    { k: "basket", name: "Básquetbol", u: "min" },
    { k: "volley", name: "Voleibol",   u: "min" },
    { k: "tennis", name: "Tenis",      u: "min" }
];

function addSport() {
    openPicker({
        title: "Añadir deporte",
        groups: [
            { title: "Por distancia", items: SPORTS.filter(x => x.u === "km").map(x => ({ label: x.name, sub: "Kilómetros", value: x })) },
            { title: "Por tiempo", items: SPORTS.filter(x => x.u === "min").map(x => ({ label: x.name, sub: "Minutos", value: x })) }
        ],
        createLabel: "Otro deporte (por tiempo)",
        onPick: sport => askSportAmount(sport),
        onCreate: async query => {
            const name = await askText({ title: "Otro deporte", label: "Nombre del deporte", value: query || "", maxLength: 30 });
            if (name) askSportAmount({ k: "custom", name, u: "min" });
        }
    });
}

/* Distancia (km) o tiempo (min): se ajusta con ▲▼, deslizando o escribiendo */
function askSportAmount(sport) {
    const km = sport.u === "km";
    let value = km ? 5 : 60;
    openStepper({
        title: sport.name,
        subtitle: km ? "Distancia recorrida" : "Tiempo jugado",
        unit: km ? "km" : "min",
        read: () => fmtNum(value, 1),
        step: dir => { value = Math.max(0, Math.round((value + dir * (km ? 0.5 : 5)) * 10) / 10); },
        editMode: km ? "decimal" : "numeric",
        onEdit: text => {
            const n = parseAmount(text, { max: km ? 500 : 1440 });
            if (n === null || n <= 0) return "x";
            value = n;
            return "";
        },
        cancelLabel: "Cancelar",
        doneLabel: "Añadir",
        onClose: confirmed => {
            if (!confirmed || value <= 0) return;
            const key = getWorkoutDateKey();
            (state.sports[key] ??= []).push({ id: newId("sp"), k: sport.k, n: sport.name, u: sport.u, v: value });
            saveState();
            renderWeekSection();
        }
    });
}

function removeSport(key, id) {
    state.sports[key] = (state.sports[key] || []).filter(x => x.id !== id);
    if (!state.sports[key].length) delete state.sports[key];
    saveState();
    renderWeekSection();
}

/* Al elegir un día, entra a Entreno y crea/asocia el registro de esa fecha */
function startWorkoutDay(routineId, dayId) {
    activeWorkout = { routineId, dayId };
    workoutPage = 0;

    const key = getWorkoutDateKey();
    state.logs[routineId] ??= {};
    const entry = (state.logs[routineId][key] ??= { dayId, exercises: {} });
    setEntryDay(routineId, entry, dayId);
    saveState();

    showSection("workout");
}

/* Panel "Series": progreso del día activo (hechas / totales) */
function renderSeriesPanel() {
    const left = document.getElementById("seriesColLeft");
    const right = document.getElementById("seriesColRight");
    left.innerHTML = "";
    right.innerHTML = "";

    const routine = findRoutine(state.activeRoutineId);
    const key = getWorkoutDateKey();
    const entry = routine && state.logs[routine.id]?.[key];
    const day = entry && findDay(routine, entry.dayId);
    document.getElementById("week").classList.toggle("no-series", !day || day.exercises.length === 0);
    if (!day) return;

    const half = Math.ceil(day.exercises.length / 2);

    day.exercises.forEach((exercise, index) => {
        const log = readExerciseLog(routine.id, key, exercise);
        const done = log.reps.filter(r => r > 0).length;

        const line = document.createElement("div");
        line.className = "series-line";
        const nameEl = document.createElement("span");
        nameEl.textContent = exercise.name;
        const countEl = document.createElement("span");
        countEl.textContent = `${done}/${log.reps.length}`;
        line.append(nameEl, countEl);

        (index < half ? left : right).appendChild(line);
    });
}

/* =========================================================
    NAVEGACIÓN ENTRE SECCIONES
========================================================= */

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(sectionId).classList.add("active");

    const label = document.querySelector(".week-tab-label");
    label.onclick = null;
    label.classList.remove("clickable");

    if (sectionId === "exercises") {
        routineNav = { level: "root", routineId: null, dayId: null };
        renderRoutinesTab();
    } else if (sectionId === "week") {
        setHeaderDateText(getDateText(selectedDate ? parseKey(selectedDate) : new Date()));
        renderWeekSection();
        renderSeriesPanel();
    } else if (sectionId === "workout") {
        const day = findDay(findRoutine(activeWorkout.routineId), activeWorkout.dayId);
        setHeaderDateText(day ? day.name : "", () => navFade(() => showSection("week")));
        renderWorkoutForDay(activeWorkout.routineId, activeWorkout.dayId);
    } else if (sectionId === "food") {
        if (foodDate) setHeaderDateText(getDateText(parseKey(foodDate)), () => navFade(() => { foodDate = null; showSection("history"); }));
        else setHeaderDateText(getDateText());
        renderFood();
    } else if (sectionId === "history") {
        setHeaderDateText(getDateText());
        renderHistory();
    } else {
        setHeaderDateText("");
    }

    const tab = TAB_ORDER.find(t => t.id === sectionId);
    label.textContent = tab ? tab.label : (sectionId === "workout" ? "ENTRENO" : label.textContent);

    /* Entreno pertenece a Semana: ilumina el punto de Semana */
    const dotId = sectionId === "workout" ? "week" : sectionId;
    renderDots(document.getElementById("tabDots"), TAB_ORDER.length, TAB_ORDER.findIndex(t => t.id === dotId));
}

/* Puntos indicadores (index = -1: ninguno activo) */
function renderDots(container, total, index) {
    container.innerHTML = "";
    if (total < 2) return;
    for (let i = 0; i < total; i++) {
        const dot = document.createElement("span");
        dot.className = "page-dot" + (i === index ? " active" : "");
        container.appendChild(dot);
    }
}

/* Botón de la casita (siempre visible en el encabezado): vuelve a la pantalla de inicio de toda la app,
   la del perfil. Al volver a entrar, la app empieza en Semana. */
function goHome() {
    if (SWIPE.busy) return;

    switchScreen(document.getElementById("mainApp"), document.getElementById("landing"), "flex", () => {
        selectedDate = null;
        foodDate = null;
        showSection("week");
        stopTooltipLoop();
        startTooltipLoop();
        window.scrollTo(0, 0);
    });
}

/* =========================================================
    ENTRENAMIENTO: CARRUSELES DE KG Y REPS
========================================================= */

const KG_STEP = 2.5;

/* Entreno en vertical: se ven 2 ejercicios completos y la mitad del siguiente.
   Cada deslizamiento vertical avanza (o retrocede) exactamente un ejercicio, con desplazamiento suave.
   workoutPage = índice del ejercicio que queda arriba. */
let workoutPage = 0;
let activeWorkout = { routineId: null, dayId: null };

function renderWorkoutForDay(routineId, dayId) {
    const container = document.getElementById("workoutExercises");
    container.innerHTML = "";
    container.dataset.scroll = "1";     /* el ajuste del diseño no cuenta lo que queda bajo la pantalla */

    const routine = findRoutine(routineId);
    const day = routine ? findDay(routine, dayId) : null;
    if (!day) return;

    const track = document.createElement("div");
    track.className = "workout-track";
    day.exercises.forEach(exercise => track.appendChild(buildExerciseCard(routineId, dayId, exercise.id)));

    /* entreno extraordinario: se pueden añadir ejercicios ahí mismo */
    if (routineId === EXTRA_ROUTINE_ID && day.exercises.length < MAX_EXERCISES_PER_DAY) {
        track.appendChild(addSquare("Añadir ejercicio", () => addRoutineExercise(routineId, dayId, id => { refreshWorkout(); scrollWorkoutTo(id); }), "add-wide workout-add"));
    }
    container.appendChild(track);

    /* alto de cada tarjeta: caben 2 y media */
    const gap = 10;
    track.style.setProperty("--card-h", `${Math.max(150, (container.clientHeight - 2 * gap) / 2.5)}px`);

    day.exercises.forEach(exercise => updateSemaphore(routineId, dayId, exercise.id));

    workoutPage = Math.min(workoutPage, workoutStops().length - 1);
    setWorkoutOffset(workoutStops()[workoutPage] || 0, false);
    renderWorkoutDots();
}

/* Posiciones donde se detiene la lista: el inicio de cada tarjeta, sin pasar del final */
function workoutStops() {
    const container = document.getElementById("workoutExercises");
    const track = container.querySelector(".workout-track");
    if (!track) return [0];
    const max = Math.max(0, track.scrollHeight - container.clientHeight);
    const stops = [...track.children].map(c => Math.min(c.offsetTop, max));
    return [...new Set(stops.map(v => Math.round(v)))].sort((a, b) => a - b);
}

function setWorkoutOffset(y, animate) {
    const track = document.querySelector("#workoutExercises .workout-track");
    if (!track) return Promise.resolve();
    track.getAnimations().forEach(a => a.cancel());
    const from = track._y || 0;
    track._y = y;
    track.style.transform = `translateY(${-y}px)`;
    if (!animate) return Promise.resolve();
    return track.animate([{ transform: `translateY(${-from}px)` }, { transform: `translateY(${-y}px)` }],
        { duration: 340 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)" }).finished.catch(() => {});
}

function renderWorkoutDots() {
    renderDots(document.getElementById("workoutDots"), workoutStops().length, workoutPage);
}

function shiftWorkoutPage(direction) {
    const stops = workoutStops();
    workoutPage = Math.max(0, Math.min(stops.length - 1, workoutPage + direction));
    renderWorkoutDots();
    return setWorkoutOffset(stops[workoutPage], true);
}

/* Lleva la lista hasta un ejercicio (por ejemplo, el recién añadido) */
function scrollWorkoutTo(exerciseId) {
    const card = document.querySelector(`#workoutExercises [data-exercise="${exerciseId}"]`);
    if (!card) return;
    const stops = workoutStops();
    let i = stops.findIndex(v => v >= Math.min(card.offsetTop, stops[stops.length - 1]));
    if (i < 0) i = stops.length - 1;
    workoutPage = i;
    renderWorkoutDots();
    setWorkoutOffset(stops[i], true);
}

function getWorkoutExercise(routineId, dayId, exerciseId) {
    const day = findDay(findRoutine(routineId), dayId);
    return day ? day.exercises.find(e => e.id === exerciseId) : undefined;
}

/* Tarjeta de Entreno:
     Press banca                              ● Faltan reps
     [ 80 | kg/lb ] × 4 × 8–12  │  figura de      ← plan del día
       I    II   III   IV       │  cristal        ← series teñidas según su estado (4 por fila)
       V                        │  haciendo el
                                │  ejercicio
     [ + Añadir serie extra ]                     ← siempre dorada (progreso) */
const SERIE_LABEL = { green: "En meta", gold: "Superado", red: "Faltan reps", pending: "Sin empezar" };

function buildExerciseCard(routineId, dayId, exerciseId) {
    const ex = () => getWorkoutExercise(routineId, dayId, exerciseId);
    const e0 = ex();
    const key = getWorkoutDateKey();
    const log = readExerciseLog(routineId, key, e0);
    const ranges = targetsFor(routineId, key, e0);

    const card = document.createElement("div");
    card.className = "exercise wb-card";
    card.dataset.exercise = exerciseId;

    const head = document.createElement("div");
    head.className = "wb-head";
    const name = document.createElement("div");
    name.className = "exercise-name";
    name.textContent = e0.name;
    const badge = document.createElement("span");
    badge.className = "wb-badge";
    badge.id = `badge-${exerciseId}`;
    badge.innerHTML = `<i></i><span></span>`;
    head.append(name, badge);

    /* Plan del día: peso (editable) × series × reps */
    const plan = document.createElement("div");
    plan.className = "wb-plan";
    const kgBox = document.createElement("div");
    kgBox.className = "rx-kg wb-kg";
    const kgValue = document.createElement("div");
    kgValue.className = "kg-value";
    kgValue.id = `kg-${exerciseId}`;
    kgValue.textContent = String(log.kg);
    const unitBtn = document.createElement("button");
    unitBtn.type = "button";
    unitBtn.className = "rx-unit";
    const paintUnit = () => {
        const u = unitOf(ex());
        unitBtn.innerHTML = `<span class="${u === "kg" ? "on" : ""}">kg</span>/<span class="${u === "lb" ? "on" : ""}">lb</span>`;
        unitBtn.setAttribute("aria-label", `Unidad: ${u}. Toca para cambiar a ${u === "kg" ? "lb" : "kg"}`);
    };
    paintUnit();
    unitBtn.onclick = () => { const e = ex(); e.unit = unitOf(e) === "kg" ? "lb" : "kg"; saveState(); paintUnit(); };
    attachValueSwipe(kgValue, dir => changeWorkoutKg(routineId, dayId, exerciseId, dir * KG_STEP), () => openStepper({
        title: e0.name,
        subtitle: "Peso",
        unit: () => unitOf(ex()),
        read: () => String(readExerciseLog(routineId, getWorkoutDateKey(), ex()).kg),
        step: dir => changeWorkoutKg(routineId, dayId, exerciseId, dir * KG_STEP),
        onEdit: text => { const n = parseAmount(text); if (n === null) return "x"; setWorkoutKg(routineId, dayId, exerciseId, n); return ""; },
        onClose: refreshWorkout
    }));
    kgBox.append(kgValue, unitBtn);

    const planValue = (value, caption) => {
        const d = document.createElement("div");
        d.className = "wb-pv";
        d.innerHTML = `<b></b><small>${caption}</small>`;
        d.querySelector("b").textContent = value;
        return d;
    };
    const times = () => { const t = document.createElement("span"); t.className = "rx-times wb-times"; t.textContent = "×"; return t; };
    const setsPv = planValue(String(e0.series.length), "Series");
    const repsPv = planValue(fmtRange(ranges[0] || rangeOf(e0)), "Reps");
    plan.append(kgBox, times(), setsPv, times(), repsPv);

    if (routineId === EXTRA_ROUTINE_ID) {
        const xBtn = document.createElement("span");
        xBtn.className = "day-delete-x wb-x";
        xBtn.textContent = "✕";
        keyButton(xBtn, "Quitar ejercicio");
        xBtn.onclick = e => { e.stopPropagation(); deleteRoutineExercise(routineId, dayId, exerciseId, refreshWorkout); };
        head.appendChild(xBtn);

        [setsPv, repsPv].forEach(el => { el.classList.add("editable"); keyButton(el, el === setsPv ? "Cambiar series" : "Cambiar repeticiones"); });
        setsPv.onclick = () => openStepper({
            title: e0.name, subtitle: `Series (de 1 a ${MAX_SERIES_PER_EXERCISE})`, unit: "series",
            read: () => String(ex().series.length),
            step: dir => changeRoutineSets(routineId, dayId, exerciseId, dir, null),
            editMode: "numeric",
            onEdit: text => {
                const n = parseAmount(text, { integer: true, max: MAX_SERIES_PER_EXERCISE });
                if (n === null || n < 1) return "x";
                changeRoutineSets(routineId, dayId, exerciseId, n - ex().series.length, null);
                return "";
            },
            onClose: refreshWorkout
        });
        repsPv.onclick = () => openRangeEditor(routineId, dayId, exerciseId, refreshWorkout);
    }

    const seriesRow = document.createElement("div");
    seriesRow.className = "wb-sets";
    seriesRow.id = `series-row-${exerciseId}`;

    /* izquierda: plan y series (4 por fila) · derecha: la figura de cristal haciendo el ejercicio */
    const left = document.createElement("div");
    left.className = "wb-left";
    left.append(plan, seriesRow);
    const figure = document.createElement("div");
    figure.className = "wb-figure";
    figure.innerHTML = exerciseFigure(e0.name);
    const body = document.createElement("div");
    body.className = "wb-body";
    body.append(left, figure);

    card.append(head, body);

    renderWorkoutSeries(routineId, dayId, exerciseId, card);
    return card;
}

function renderWorkoutSeries(routineId, dayId, exerciseId, cardEl) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const key = getWorkoutDateKey();
    const log = readExerciseLog(routineId, key, ex);
    const row = (cardEl || document.querySelector(`.exercise[data-exercise="${exerciseId}"]`))
        .querySelector(`#series-row-${exerciseId}`);

    row.innerHTML = "";
    const regular = ex.series.length;

    log.reps.forEach((reps, index) => {
        const isExtra = index >= regular;
        const wrap = document.createElement("div");
        wrap.className = "wb-serie" + (isExtra ? " extra" : "");
        wrap.dataset.i = index;
        wrap.innerHTML = `
            <span class="serie-label">${isExtra ? "+" : ""}${toRoman(index + 1)}</span>
            <div class="reps-value">${reps}</div>
        `;
        const valueBox = wrap.querySelector(".reps-value");
        const current = () => readExerciseLog(routineId, getWorkoutDateKey(), getWorkoutExercise(routineId, dayId, exerciseId));
        attachValueSwipe(valueBox, dir => changeWorkoutReps(routineId, dayId, exerciseId, index, dir, valueBox), () => openStepper({
            title: ex.name,
            subtitle: isExtra
                ? `Serie extra ${toRoman(index + 1)} · repeticiones (cuenta como progreso)`
                : `Serie ${toRoman(index + 1)} · repeticiones (meta ${fmtRange(targetsFor(routineId, getWorkoutDateKey(), ex)[index] || rangeOf(ex))})`,
            unit: "reps",
            read: () => String(current().reps[index] ?? 0),
            step: dir => changeWorkoutReps(routineId, dayId, exerciseId, index, dir, null),
            editMode: "numeric",
            onEdit: text => { const n = parseAmount(text, { integer: true, max: 999 }); if (n === null) return "x"; setWorkoutReps(routineId, dayId, exerciseId, index, n, false); return ""; },
            extra: isExtra
                ? { label: "Quitar serie extra", onClick: () => { removeExtraSerie(routineId, dayId, exerciseId, index); return true; } }
                : (index < log.reps.length - 1 ? { label: "Rellenar", onClick: () => { setWorkoutReps(routineId, dayId, exerciseId, index, current().reps[index], true); return true; } } : null),
            onClose: refreshWorkout
        }));
        row.appendChild(wrap);
    });

    /* "+" con forma de serie, junto a las demás: añade una serie extra (máximo 8 en total) */
    if (log.reps.length < MAX_SERIES_PER_EXERCISE) {
        const add = document.createElement("div");
        add.className = "wb-serie wb-add-serie";
        add.innerHTML = `<span class="serie-label">Extra</span>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "reps-value wb-add-btn";
        btn.setAttribute("aria-label", "Añadir serie extra");
        btn.textContent = "+";
        btn.onclick = () => addExtraSerie(routineId, dayId, exerciseId);
        add.appendChild(btn);
        row.appendChild(add);
    }

    updateSemaphore(routineId, dayId, exerciseId);
}

function addExtraSerie(routineId, dayId, exerciseId) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const regular = ex.series.length;
    if (regular + (log.extra || 0) >= MAX_SERIES_PER_EXERCISE) return;
    log.reps = Array.from({ length: regular + (log.extra || 0) }, (_, i) => log.reps[i] || 0).concat(0);
    log.extra = (log.extra || 0) + 1;
    saveState();
    refreshWorkout();
    const card = document.querySelector(`.exercise[data-exercise="${exerciseId}"]`);
    const added = card && [...card.querySelectorAll(".wb-serie:not(.wb-add-serie)")].pop();
    if (added) { added.animate([{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "none" }], { duration: 300 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)" }); glowOnce(added.querySelector(".reps-value")); }
}

function removeExtraSerie(routineId, dayId, exerciseId, index) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    if (!log.extra || index < ex.series.length) return;
    log.reps.splice(index, 1);
    log.extra -= 1;
    saveState();
}

/* La unidad (kg / lb) es solo un texto de cada ejercicio: nunca convierte los números */
const unitOf = ex => (ex && ex.unit === "lb" ? "lb" : "kg");

/* Números escritos a mano: acepta coma o punto. Devuelve null si no sirve. */
function parseAmount(text, { integer = false, max = 9999 } = {}) {
    const n = parseFloat(String(text).replace(",", "."));
    if (isNaN(n) || n < 0 || n > max) return null;
    return integer ? Math.round(n) : Math.round(n * 100) / 100;
}

function setWorkoutKg(routineId, dayId, exerciseId, value) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex).kg = value;
    if (!selectedDate) ex.kg = value;
    saveState();
}

/* Pone `value` repeticiones en la serie `index` y, si fill = true, también en todas las siguientes */
function setWorkoutReps(routineId, dayId, exerciseId, index, value, fill) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const total = ex.series.length + (log.extra || 0);
    for (let i = index; i < total; i++) { if (i === index || fill) log.reps[i] = value; }
    saveState();
    updateSemaphore(routineId, dayId, exerciseId);
    renderSeriesPanel();
}

/* Si el ejercicio ya tiene registro de hoy, su peso se actualiza para que Entreno y Rutina coincidan */
function syncKgToToday(routineId, exercise) {
    const logged = state.logs[routineId]?.[dateKey()]?.exercises?.[exercise.id];
    if (logged) logged.kg = exercise.kg;
}

function changeWorkoutKg(routineId, dayId, exerciseId, delta) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const before = log.kg;
    log.kg = Math.max(0, log.kg + delta);
    if (!selectedDate) ex.kg = log.kg;   /* el peso de hoy también queda en la rutina (los días pasados no la tocan) */
    saveState();
    const box = document.getElementById(`kg-${exerciseId}`);
    if (box && log.kg !== before) animateValue(box, delta > 0 ? 1 : -1, String(log.kg));
}

function changeWorkoutReps(routineId, dayId, exerciseId, index, delta, valueBox) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const before = log.reps[index] || 0;
    log.reps[index] = Math.max(0, before + delta);
    saveState();

    if (valueBox && log.reps[index] !== before) animateValue(valueBox, delta > 0 ? 1 : -1, String(log.reps[index]));
    updateSemaphore(routineId, dayId, exerciseId);
    renderSeriesPanel();
}

function toRoman(number) {
    const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    return romans[number - 1] || number;
}

/* =========================================================
    SEMÁFORO (verde / dorado / rojo)
========================================================= */

function updateSemaphore(routineId, dayId, exerciseId) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const badge = document.getElementById(`badge-${exerciseId}`);
    if (!badge || !ex) return;

    const key = getWorkoutDateKey();
    const ranges = targetsFor(routineId, key, ex);
    const reps = readExerciseLog(routineId, key, ex).reps;
    const status = exerciseStatus(ranges, reps);

    badge.className = `wb-badge ${status}`;
    badge.querySelector("span").textContent = SERIE_LABEL[status];

    const row = document.getElementById(`series-row-${exerciseId}`);
    if (row) row.querySelectorAll(".wb-serie").forEach(el => {
        const i = Number(el.dataset.i);
        const st = i >= ex.series.length ? "gold" : serieStatus(ranges[i] || rangeOf(ex), reps[i]);
        el.classList.remove("green", "gold", "red");
        if (st) el.classList.add(st);
    });
}

/* =========================================================
    CREADOR DE RUTINAS (pestaña "Rutinas")
========================================================= */

const EXERCISE_NAME_MAX = 20;

let routineNav = { level: "root", routineId: null, dayId: null };

function newId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function findRoutine(routineId) {
    return state.routines.find(r => r.id === routineId);
}

function findDay(routine, dayId) {
    return routine ? routine.days.find(d => d.id === dayId) : undefined;
}

function setHeaderDateText(text, onBack) {
    const el = document.getElementById("weekDate");

    if (onBack) {
        el.textContent = `← ${text}`;
        el.classList.add("clickable");
        el.onclick = onBack;
    } else {
        el.textContent = text;
        el.classList.remove("clickable");
        el.onclick = null;
    }
}

function renderRoutinesTab() {
    const container = document.getElementById("routinesContainer");
    container.innerHTML = "";

    if (routineNav.level !== "root" && !findRoutine(routineNav.routineId)) routineNav = { level: "root", routineId: null, dayId: null };

    if (routineNav.level === "root") {
        setHeaderDateText(getDateText());
        container.appendChild(buildRoutinesRoot());
    } else {
        setHeaderDateText(findRoutine(routineNav.routineId).name, () => navFade(() => {
            routineNav = { level: "root", routineId: null, dayId: null };
            renderRoutinesTab();
        }));
        container.appendChild(buildDaysView(routineNav.routineId));
    }
}

/* ---------- Animación de conversión ----------
   Antes de volver a dibujar, se mide dónde estaba cada tarjeta (data-key). Después, cada una
   se desliza desde su lugar anterior al nuevo. La tarjeta recién creada nace donde estaba el
   botón de añadir ("add") y se transforma en ella; el botón de añadir se corre a su nuevo lugar. */
function flipRender(container, render, newKey) {
    const before = new Map();
    container.querySelectorAll("[data-key]").forEach(el => before.set(el.dataset.key, el.getBoundingClientRect()));
    render();

    const ms = 420 * NAV_SPEED;
    const ease = "cubic-bezier(.2,.8,.2,1)";
    container.querySelectorAll("[data-key]").forEach(el => {
        const key = el.dataset.key;
        const isNew = newKey && key === newKey;
        const from = isNew ? before.get("add") : before.get(key);
        const to = el.getBoundingClientRect();

        if (!from || !to.width) {
            el.animate([{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "none" }], { duration: ms, easing: ease });
            return;
        }
        const dx = from.left - to.left, dy = from.top - to.top;
        const sx = from.width / to.width, sy = from.height / to.height;
        if (!isNew && Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01) return;

        el.animate([{ transformOrigin: "top left", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
                    { transformOrigin: "top left", transform: "none" }], { duration: ms, easing: ease });

        if (isNew) {
            /* el "+" se desvanece mientras aparece el contenido nuevo */
            const ghost = document.createElement("span");
            ghost.className = "convert-ghost";
            ghost.textContent = "+";
            el.appendChild(ghost);
            ghost.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: ms * .55, easing: "ease-out", fill: "forwards" })
                .finished.then(() => ghost.remove()).catch(() => ghost.remove());
            [...el.children].filter(c => c !== ghost).forEach(c =>
                c.animate([{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }], { duration: ms, easing: "ease-out" }));
            glowOnce(el);
        }
    });
}

/* Botón cuadrado de añadir (rutinas, días, ejercicios, comida, logros) */
function addSquare(label, onClick, extraClass = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `square-card add-square ${extraClass}`;
    btn.dataset.key = "add";
    btn.innerHTML = `<span class="add-square-plus">+</span><small>${label}</small>`;
    btn.onclick = onClick;
    return btn;
}

/* Tarjeta de rutina o de día (con ✕ en la esquina) */
function gridCard(key, text, onOpen, onDelete, deleteLabel) {
    const card = document.createElement("button");
    card.className = "day-card";
    card.dataset.key = key;

    const xBtn = document.createElement("span");
    xBtn.className = "day-delete-x";
    xBtn.textContent = "✕";
    keyButton(xBtn, deleteLabel);
    xBtn.onclick = event => { event.stopPropagation(); onDelete(); };

    const label = document.createElement("span");
    label.textContent = text;
    card.append(xBtn, label);
    card.onclick = onOpen;
    return card;
}

/* Rejilla de tarjetas + botón de añadir (rutinas y días) */
function buildGrid(cards, add, hint) {
    const root = document.createElement("div");
    root.className = "routine-page";
    const gridWrapper = document.createElement("div");
    gridWrapper.className = "day-grid-wrapper";
    const grid = document.createElement("div");
    grid.className = "day-grid";
    const twoColumns = cards.length >= 4;
    grid.classList.toggle("two-columns", twoColumns);

    grid.append(...cards);
    if (add) {
        if (twoColumns && (cards.length + 1) % 2 === 1) add.classList.add("add-day-full-row");
        grid.appendChild(add);
    }
    if (cards.length === 0) {
        gridWrapper.classList.add("empty-wrapper");
        grid.classList.add("empty-grid");
    }
    gridWrapper.appendChild(grid);
    root.appendChild(gridWrapper);

    if (hint) {
        const p = document.createElement("p");
        p.className = "hint-text";
        p.textContent = hint;
        root.appendChild(p);
    }
    return root;
}

const routinesBox = () => document.getElementById("routinesContainer");

/* ---------- Nivel 1: lista de rutinas ---------- */

function buildRoutinesRoot() {
    const cards = state.routines.filter(r => r.id !== EXTRA_ROUTINE_ID).map(routine => {
        const card = gridCard(routine.id, routine.name,
            () => navFade(() => { routineNav = { level: "days", routineId: routine.id, dayId: null }; renderRoutinesTab(); }),
            () => deleteRoutine(routine.id), "Borrar rutina");
        card.classList.add("routine-pill");
        card.classList.toggle("routine-active", state.activeRoutineId === routine.id);

        /* no es <button>: un botón dentro de otro botón no es HTML válido */
        const activateBtn = document.createElement("span");
        activateBtn.className = "routine-activate";
        keyButton(activateBtn);
        /* sin texto: un check del color de la app (lleno = rutina activa) */
        const isActive = state.activeRoutineId === routine.id;
        activateBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>`;
        activateBtn.setAttribute("aria-label", isActive ? "Rutina activa (toca para desactivar)" : "Activar rutina");
        activateBtn.setAttribute("aria-pressed", isActive);
        activateBtn.onclick = event => { event.stopPropagation(); toggleActiveRoutine(routine.id); };
        card.prepend(activateBtn);
        return card;
    });
    return buildGrid(cards, addSquare("Añadir rutina", addRoutine));
}

async function deleteRoutine(routineId) {
    const routine = findRoutine(routineId);

    if (!await askConfirm({ title: "Borrar rutina", message: `¿Borrar la rutina "${routine.name}" completa, con todos sus días y ejercicios? Esta acción no se puede deshacer.` })) return;

    state.routines = state.routines.filter(r => r.id !== routineId);
    if (state.activeRoutineId === routineId) state.activeRoutineId = null;
    saveState();

    routineNav = { level: "root", routineId: null, dayId: null };
    flipRender(routinesBox(), renderRoutinesTab);
}

function toggleActiveRoutine(routineId) {
    state.activeRoutineId = (state.activeRoutineId === routineId) ? null : routineId;
    saveState();
    renderRoutinesTab();
}

function addRoutine() {
    openPicker({
        title: "Nueva rutina",
        groups: [{ items: ROUTINE_PRESETS.map(p => ({ label: p.name, sub: p.days.join(" · "), value: p })) }],
        createLabel: "Rutina personalizada",
        onPick: preset => createRoutine(preset.name, preset.key),
        onCreate: async () => {
            const name = await askText({ title: "Rutina personalizada", label: "Nombre de la rutina", maxLength: 24 });
            if (name) createRoutine(name, null);
        }
    });
}

/* La rutina nueva aparece en la lista transformándose desde el botón "Añadir rutina" */
function createRoutine(name, preset) {
    const routine = { id: newId("routine"), name, preset, days: [] };
    state.routines.push(routine);
    saveState();

    routineNav = { level: "root", routineId: null, dayId: null };
    flipRender(routinesBox(), renderRoutinesTab, routine.id);
}

/* ---------- Nivel 2: días de una rutina ---------- */

function buildDaysView(routineId) {
    const routine = findRoutine(routineId);
    const cards = routine.days.map(day => {
        const card = gridCard(day.id, day.name, () => openDaySheet(routineId, day.id), () => deleteDay(routineId, day.id), "Borrar día");
        attachLongPress(card, () => renameDay(routineId, day.id));
        return card;
    });
    const add = routine.days.length < 6 ? addSquare("Añadir día", () => addDay(routineId)) : null;
    return buildGrid(cards, add, "Toca un día para abrirlo. Mantén presionado para renombrarlo. Máx. 6 días.");
}

function renumberAutoDays(routine) {
    routine.days.forEach((day, index) => {
        if (!day.customName) day.name = `Día ${index + 1}`;
    });
}

function addDay(routineId) {
    const routine = findRoutine(routineId);
    if (routine.days.length >= 6) return;

    /* Opciones según la rutina prefabricada elegida (o todas, si es personalizada); sin repetir las ya creadas */
    const preset = ROUTINE_PRESETS.find(p => p.key === routine.preset);
    const used = routine.days.map(d => normalizeText(d.name));
    const options = (preset ? preset.days : GENERIC_DAYS).filter(n => !used.includes(normalizeText(n)));

    openPicker({
        title: "Nuevo día",
        groups: [{ items: options.map(n => ({ label: n, value: n })) }],
        emptyText: "Ya añadiste todos los días de esta rutina",
        createLabel: "Día personalizado",
        onPick: name => createDay(routineId, name),
        onCreate: async () => {
            const name = await askText({ title: "Día personalizado", label: "Nombre del día (vacío = \"Día N\")", maxLength: 24, allowEmpty: true });
            if (name === null) return;
            createDay(routineId, name);   /* vacío = "Día N" automático */
        }
    });
}

/* El día nuevo aparece transformándose desde el botón "Añadir día" */
function createDay(routineId, name) {
    const routine = findRoutine(routineId);
    if (routine.days.length >= 6) return;

    const day = { id: newId("day"), name: name || "", customName: !!name, exercises: [] };
    routine.days.push(day);
    renumberAutoDays(routine);
    saveState();
    flipRender(routinesBox(), renderRoutinesTab, day.id);
}

async function deleteDay(routineId, dayId) {
    const routine = findRoutine(routineId);
    const day = findDay(routine, dayId);

    if (!await askConfirm({ title: "Borrar día", message: `¿Borrar "${day.name}" y todos sus ejercicios? Esta acción no se puede deshacer.` })) return;

    routine.days = routine.days.filter(d => d.id !== dayId);
    renumberAutoDays(routine);
    saveState();
    flipRender(routinesBox(), renderRoutinesTab);
}

async function renameDay(routineId, dayId) {
    const routine = findRoutine(routineId);
    const day = findDay(routine, dayId);

    const name = await askText({ title: "Renombrar día", label: "Nombre del día", value: day.name, maxLength: 24 });
    if (!name) return;

    day.name = name;
    day.customName = true;
    saveState();
    renderRoutinesTab();
}

/* ---------- Nivel 3: ventana emergente del día con sus ejercicios ---------- */

const MAX_EXERCISES_PER_DAY = 12;
let daySheet = null;   /* { routineId, dayId, list } mientras la ventana está abierta */

const routineExercise = (routineId, dayId, exerciseId) =>
    findDay(findRoutine(routineId), dayId)?.exercises.find(e => e.id === exerciseId);

function openDaySheet(routineId, dayId) {
    const day = findDay(findRoutine(routineId), dayId);
    if (!day) return;

    const { sheet } = openSheet("day-sheet", day.name, () => { daySheet = null; });
    const list = document.createElement("div");
    list.className = "day-sheet-list";
    sheet.appendChild(list);

    daySheet = { routineId, dayId, list };
    renderDaySheet();
}

/* newKey: id del ejercicio recién creado (se transforma desde el botón de añadir) */
function renderDaySheet(newKey) {
    if (!daySheet) return;
    const { routineId, dayId, list } = daySheet;
    const day = findDay(findRoutine(routineId), dayId);
    if (!day) return;

    const draw = () => {
        list.innerHTML = "";
        day.exercises.forEach(ex => list.appendChild(buildRoutineExerciseCard(routineId, dayId, ex.id)));
        if (day.exercises.length < MAX_EXERCISES_PER_DAY) {
            list.appendChild(addSquare("Añadir ejercicio", () => addRoutineExercise(routineId, dayId), "add-wide"));
        }
    };

    if (newKey !== undefined) flipRender(list, draw, newKey);
    else draw();

    if (newKey) list.querySelector(`[data-key="add"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* onCreated(id): qué hacer después de crear (por defecto, redibujar la ventana del día) */
function addRoutineExercise(routineId, dayId, onCreated) {
    const day = findDay(findRoutine(routineId), dayId);
    if (day.exercises.length >= MAX_EXERCISES_PER_DAY) return;

    /* Grupos musculares del día primero (Push: pecho, hombro, tríceps...), sin repetir los ya añadidos */
    const used = day.exercises.map(e => normalizeText(e.name));
    const priority = priorityGroups(day.name);
    const groups = Object.entries(EXERCISE_CATALOG)
        .sort(([a], [b]) => priorityIndex(priority, a) - priorityIndex(priority, b))
        .map(([title, names]) => ({
            title,
            items: names.filter(n => !used.includes(normalizeText(n))).map(n => ({ label: n, value: n }))
        }));

    openPicker({
        title: "Añadir ejercicio",
        groups,
        searchable: true,
        createLabel: "Nuevo ejercicio",
        onPick: name => createExercise(routineId, dayId, name, onCreated),
        onCreate: async query => {
            const name = await askText({ title: "Nuevo ejercicio", label: `Nombre del ejercicio (máx. ${EXERCISE_NAME_MAX} caracteres)`, value: query || "", maxLength: EXERCISE_NAME_MAX });
            if (name) createExercise(routineId, dayId, name, onCreated);
        }
    });
}

function createExercise(routineId, dayId, name, onCreated) {
    const day = findDay(findRoutine(routineId), dayId);
    name = name.slice(0, EXERCISE_NAME_MAX).trim();
    if (!name || day.exercises.length >= MAX_EXERCISES_PER_DAY) return;

    const exercise = { id: newId("ex"), name, kg: 0, unit: "kg", series: [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 0, max: 0 }] };
    day.exercises.push(exercise);
    saveState();
    if (onCreated) onCreated(exercise.id); else renderDaySheet(exercise.id);
}

async function deleteRoutineExercise(routineId, dayId, exerciseId, after) {
    const day = findDay(findRoutine(routineId), dayId);
    const exercise = routineExercise(routineId, dayId, exerciseId);
    if (!exercise) return;

    if (!await askConfirm({ title: "Borrar ejercicio", message: `¿Borrar el ejercicio "${exercise.name}"? Esta acción no se puede deshacer.` })) return;

    day.exercises = day.exercises.filter(e => e.id !== exerciseId);
    saveState();
    if (after) after(); else renderDaySheet(null);
}

/* Tarjeta de ejercicio del creador:
     Press banca                        ✕
     [ 80  kg/lb ]  ×  [ 3 ]  ×  [ 8–12 ]
        peso           series      reps
   Cada número se cambia deslizando o tocándolo; "kg/lb" cambia la unidad. */
function buildRoutineExerciseCard(routineId, dayId, exerciseId) {
    const ex = () => routineExercise(routineId, dayId, exerciseId);
    const exercise = ex();

    const card = document.createElement("div");
    card.className = "exercise rx-card";
    card.dataset.key = exerciseId;

    const head = document.createElement("div");
    head.className = "rx-head";
    const name = document.createElement("div");
    name.className = "exercise-name";
    name.textContent = exercise.name;
    const xBtn = document.createElement("span");
    xBtn.className = "day-delete-x rx-x";
    xBtn.textContent = "✕";
    keyButton(xBtn, "Borrar ejercicio");
    xBtn.onclick = event => { event.stopPropagation(); deleteRoutineExercise(routineId, dayId, exerciseId); };
    head.append(name, xBtn);

    const field = (cls, caption) => {
        const wrap = document.createElement("div");
        wrap.className = `rx-field ${cls}`;
        const small = document.createElement("small");
        small.textContent = caption;
        return [wrap, small];
    };
    const times = () => { const t = document.createElement("span"); t.className = "rx-times"; t.textContent = "×"; t.setAttribute("aria-hidden", "true"); return t; };

    /* Peso + botón kg/lb */
    const [kgField, kgCap] = field("rx-weight", "Peso");
    const kgBox = document.createElement("div");
    kgBox.className = "rx-kg";
    const kgValue = document.createElement("div");
    kgValue.className = "kg-value rx-num";
    kgValue.textContent = String(exercise.kg);
    const unitBtn = document.createElement("button");
    unitBtn.type = "button";
    unitBtn.className = "rx-unit";
    const paintUnit = () => {
        const u = unitOf(ex());
        unitBtn.innerHTML = `<span class="${u === "kg" ? "on" : ""}">kg</span>/<span class="${u === "lb" ? "on" : ""}">lb</span>`;
        unitBtn.setAttribute("aria-label", `Unidad: ${u}. Toca para cambiar a ${u === "kg" ? "lb" : "kg"}`);
    };
    paintUnit();
    unitBtn.onclick = () => { const e = ex(); e.unit = unitOf(e) === "kg" ? "lb" : "kg"; saveState(); paintUnit(); };
    attachValueSwipe(kgValue, dir => changeRoutineKg(routineId, dayId, exerciseId, dir * KG_STEP, kgValue), () => openStepper({
        title: exercise.name,
        subtitle: "Peso",
        unit: () => unitOf(ex()),
        read: () => String(ex().kg),
        step: dir => changeRoutineKg(routineId, dayId, exerciseId, dir * KG_STEP, null),
        onEdit: text => { const n = parseAmount(text); if (n === null) return "x"; setRoutineKg(routineId, dayId, exerciseId, n); return ""; },
        onClose: () => renderDaySheet()
    }));
    kgBox.append(kgValue, unitBtn);
    kgField.append(kgBox, kgCap);

    /* Series */
    const [setsField, setsCap] = field("rx-sets", "Series");
    const setsValue = document.createElement("div");
    setsValue.className = "reps-value rx-num";
    setsValue.textContent = String(exercise.series.length);
    attachValueSwipe(setsValue, dir => changeRoutineSets(routineId, dayId, exerciseId, dir, setsValue), () => openStepper({
        title: exercise.name,
        subtitle: `Series (de 1 a ${MAX_SERIES_PER_EXERCISE})`,
        unit: "series",
        read: () => String(ex().series.length),
        step: dir => changeRoutineSets(routineId, dayId, exerciseId, dir, null),
        editMode: "numeric",
        onEdit: text => {
            const n = parseAmount(text, { integer: true, max: MAX_SERIES_PER_EXERCISE });
            if (n === null || n < 1) return "x";
            changeRoutineSets(routineId, dayId, exerciseId, n - ex().series.length, null);
            return "";
        },
        onClose: () => renderDaySheet()
    }));
    setsField.append(setsValue, setsCap);

    /* Rango de repeticiones */
    const [repsField, repsCap] = field("rx-reps", "Reps");
    const repsValue = document.createElement("div");
    repsValue.className = "reps-value rx-num";
    repsValue.textContent = fmtRange(rangeOf(exercise));
    attachValueSwipe(repsValue, dir => shiftRoutineRange(routineId, dayId, exerciseId, dir, repsValue), () => openRangeEditor(routineId, dayId, exerciseId));
    repsField.append(repsValue, repsCap);

    const row = document.createElement("div");
    row.className = "rx-row";
    row.append(kgField, times(), setsField, times(), repsField);

    card.append(head, row);
    return card;
}

function setRoutineKg(routineId, dayId, exerciseId, value) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    exercise.kg = value;
    syncKgToToday(routineId, exercise);
    saveState();
}

function changeRoutineKg(routineId, dayId, exerciseId, delta, valueBox) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    const before = exercise.kg;
    exercise.kg = Math.max(0, exercise.kg + delta);
    syncKgToToday(routineId, exercise);
    saveState();
    if (valueBox && exercise.kg !== before) animateValue(valueBox, delta > 0 ? 1 : -1, String(exercise.kg));
}

/* Cambia el número de series (1 a 6): las nuevas copian el rango de repeticiones */
function changeRoutineSets(routineId, dayId, exerciseId, delta, valueBox) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    const before = exercise.series.length;
    const n = Math.min(MAX_SERIES_PER_EXERCISE, Math.max(1, before + delta));
    const [lo, hi] = rangeOf(exercise);
    exercise.series = Array.from({ length: n }, () => ({ min: lo, max: hi }));

    /* el registro de hoy se ajusta a las series nuevas; las extra se quedan al final */
    const logged = state.logs[routineId]?.[dateKey()]?.exercises?.[exercise.id];
    if (logged) logged.reps = Array.from({ length: n }, (_, i) => (i < before ? logged.reps[i] || 0 : 0)).concat(logged.reps.slice(before));
    saveState();
    if (valueBox && n !== before) animateValue(valueBox, delta > 0 ? 1 : -1, String(n));
}

function setRoutineRange(routineId, dayId, exerciseId, lo, hi) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    exercise.series = exercise.series.map(() => ({ min: lo, max: hi }));
    saveState();
}

/* Deslizar sobre el rango lo mueve entero (8–12 → 9–13; 10 → 11) */
function shiftRoutineRange(routineId, dayId, exerciseId, dir, valueBox) {
    const [lo, hi] = rangeOf(routineExercise(routineId, dayId, exerciseId));
    if (lo + dir < 0) return;
    setRoutineRange(routineId, dayId, exerciseId, lo + dir, hi + dir);
    if (valueBox) animateValue(valueBox, dir, fmtRange([lo + dir, hi + dir]));
}

/* Ventana para el rango: mínimo y máximo, cada uno se desliza, usa ▲ ▼ o se toca para escribirlo.
   Si son iguales, es un número fijo. */
function openRangeEditor(routineId, dayId, exerciseId, onDone = () => renderDaySheet()) {
    const ex = () => routineExercise(routineId, dayId, exerciseId);
    const { sheet, close } = openSheet("range-sheet", ex().name, onDone);

    const sub = document.createElement("div");
    sub.className = "stepper-sub";
    sub.textContent = "Repeticiones por serie";

    const cols = document.createElement("div");
    cols.className = "range-cols";
    const boxes = {};

    const apply = (which, dir, typed) => {
        const [lo, hi] = rangeOf(ex());
        let nlo = lo, nhi = hi;
        if (which === "min") { nlo = typed ?? Math.max(0, lo + dir); if (nlo > nhi) nhi = nlo; }
        else { nhi = typed ?? Math.max(0, hi + dir); if (nhi < nlo) nlo = nhi; }
        setRoutineRange(routineId, dayId, exerciseId, nlo, nhi);
        const d = dir || 1;
        if (nlo !== lo && !(typed != null && which === "min")) animateValue(boxes.min, d, String(nlo));
        if (nhi !== hi && !(typed != null && which === "max")) animateValue(boxes.max, d, String(nhi));
        paintNote();
    };

    ["min", "max"].forEach(which => {
        const col = document.createElement("div");
        col.className = "range-col";
        const label = document.createElement("div");
        label.className = "range-label";
        label.textContent = which === "min" ? "Mínimo" : "Máximo";
        const up = document.createElement("button");
        up.type = "button";
        up.className = "stepper-btn";
        up.setAttribute("aria-label", `Subir ${label.textContent.toLowerCase()}`);
        up.textContent = "▲";
        const down = document.createElement("button");
        down.type = "button";
        down.className = "stepper-btn";
        down.setAttribute("aria-label", `Bajar ${label.textContent.toLowerCase()}`);
        down.textContent = "▼";
        const box = document.createElement("div");
        box.className = "stepper-value range-value";
        box.textContent = String(rangeOf(ex())[which === "min" ? 0 : 1]);
        boxes[which] = box;

        bindHold(up, () => apply(which, 1));
        bindHold(down, () => apply(which, -1));
        attachValueSwipe(box, dir => apply(which, dir), () => editInBox(box, {
            read: () => String(rangeOf(ex())[which === "min" ? 0 : 1]),
            editMode: "numeric",
            onEdit: text => { const n = parseAmount(text, { integer: true, max: 999 }); if (n === null) return "x"; apply(which, 0, n); return ""; }
        }), 34);

        col.append(label, up, box, down);
        cols.appendChild(col);
    });

    const note = document.createElement("div");
    note.className = "stepper-hint";
    const paintNote = () => {
        const r = rangeOf(ex());
        note.textContent = r[0] === r[1] ? `Número fijo: ${r[0]} repeticiones` : `Rango: de ${r[0]} a ${r[1]} repeticiones`;
    };
    paintNote();

    const done = document.createElement("button");
    done.type = "button";
    done.className = "dialog-btn accept range-done";
    done.textContent = "Listo";
    done.onclick = close;

    sheet.append(sub, cols, note, done);
}

/* ---------- Piezas reutilizables del creador de rutinas ---------- */

/* Un <span> que actúa como botón: se puede enfocar y pulsar con Enter o Espacio */
function keyButton(el, label) {
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    if (label) el.setAttribute("aria-label", label);
    el.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        el.click();
    });
}

function attachLongPress(el, callback) {
    let timer = null;

    let sx = 0, sy = 0;

    const start = (event) => {
        if (event.type === "mousedown" && event.button !== 0) return;
        const point = event.touches ? event.touches[0] : event;
        sx = point.clientX; sy = point.clientY;
        timer = setTimeout(callback, 550);
    };

    const cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    el.addEventListener("mousedown", start);
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("mouseup", cancel);
    el.addEventListener("mouseleave", cancel);
    el.addEventListener("touchend", cancel);
    el.addEventListener("touchcancel", cancel);
    el.addEventListener("touchmove", cancel);
    el.addEventListener("pointermove", e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel(); });
}

/* Deslizar verticalmente sobre un número lo sube (arriba) o lo baja (abajo):
   un paso cada VALUE_STEP_PX píxeles, con la animación del número. */
const VALUE_STEP_PX = 26;

/* Deslizar sobre el número lo sube/baja (un paso cada stepPx px). Un toque corto (sin mover) llama a onTap. */
function attachValueSwipe(el, onStep, onTap, stepPx = VALUE_STEP_PX) {
    let lastY = null, pointer = null, startX = 0, startY = 0, startT = 0, moved = false;

    el.addEventListener("pointerdown", e => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.target.closest && e.target.closest("input")) return;
        lastY = startY = e.clientY;
        startX = e.clientX;
        startT = performance.now();
        moved = false;
        pointer = e.pointerId;
        try { el.setPointerCapture(pointer); } catch (err) {}
    });

    el.addEventListener("pointermove", e => {
        if (lastY === null || e.pointerId !== pointer) return;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) moved = true;

        let dy = e.clientY - lastY;
        while (Math.abs(dy) >= stepPx) {
            const dir = dy < 0 ? 1 : -1;          /* arriba = subir */
            onStep(dir);
            lastY -= dir * stepPx;
            dy = e.clientY - lastY;
        }
    });

    el.addEventListener("pointerup", () => {
        const tap = lastY !== null && !moved && onTap && performance.now() - startT < 400;
        lastY = null; pointer = null;
        if (tap) onTap();
    });
    el.addEventListener("pointercancel", () => { lastY = null; pointer = null; });
}

function refreshWorkout() {
    renderWorkoutForDay(activeWorkout.routineId, activeWorkout.dayId);
    renderSeriesPanel();
}

/* Botones ▲ ▼: un paso al tocar; si se mantienen, se repite */
function bindHold(btn, fn) {
    let timer = null, interval = null;
    const stop = () => { clearTimeout(timer); clearInterval(interval); timer = interval = null; };
    btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        fn();
        timer = setTimeout(() => { interval = setInterval(fn, 110); }, 420);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
}

/* Tocar un número lo convierte en un campo de texto: se abre el teclado, Enter aplica y Escape cancela.
   onEdit(texto) devuelve "" si sirve o un texto de error (el campo se marca en rojo). */
function editInBox(box, { read, onEdit, editMode }) {
    if (box.classList.contains("editing")) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "stepper-input";
    input.inputMode = editMode || "decimal";
    input.enterKeyHint = "done";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 7;
    input.setAttribute("aria-label", "Escribir valor");
    input.value = read().replace(".", ",");

    box.textContent = "";
    box.classList.add("editing");
    box.appendChild(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = (commit, fromBlur) => {
        if (finished) return;
        if (commit) {
            const text = input.value.trim();
            const problem = text ? onEdit(text) : "vacío";
            if (problem && !fromBlur) { input.classList.add("bad"); return; }
        }
        finished = true;
        box.classList.remove("editing");
        box.textContent = read();
    };

    input.addEventListener("keydown", e => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); finish(true, false); }
        else if (e.key === "Escape") { e.preventDefault(); finish(false, false); }
    });
    input.addEventListener("input", () => input.classList.remove("bad"));
    input.addEventListener("blur", () => finish(true, true));
}

/* =========================================================
    CUADRO PARA CAMBIAR UN NÚMERO (toque corto sobre peso o repeticiones)
    Ventana más grande que el cuadro original: un área grande para deslizar
    arriba/abajo, botones ▲ ▼ (mantenerlos presionados repite) y, en el peso,
    un acceso para escribirlo exacto.
========================================================= */

let stepperOverlay = null;

function openStepper({ title, subtitle, unit, read, step, onEdit, editMode, extra, onClose, doneLabel, cancelLabel }) {
    if (stepperOverlay) return;

    const overlay = document.createElement("div");
    overlay.className = "picker-overlay stepper-overlay";

    const sheet = document.createElement("div");
    sheet.className = "picker-sheet stepper-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const heading = document.createElement("h3");
    heading.className = "picker-title stepper-title";
    heading.textContent = title;
    const sub = document.createElement("div");
    sub.className = "stepper-sub";
    sub.textContent = subtitle;

    const up = document.createElement("button");
    up.type = "button";
    up.className = "stepper-btn";
    up.setAttribute("aria-label", "Subir");
    up.textContent = "▲";

    const down = document.createElement("button");
    down.type = "button";
    down.className = "stepper-btn";
    down.setAttribute("aria-label", "Bajar");
    down.textContent = "▼";

    const box = document.createElement("div");
    box.className = "stepper-value";
    box.textContent = read();

    const unitEl = document.createElement("div");
    unitEl.className = "stepper-unit";
    const unitText = () => (typeof unit === "function" ? unit() : unit);
    unitEl.textContent = unitText();

    const hint = document.createElement("div");
    hint.className = "stepper-hint";
    hint.textContent = onEdit ? "Desliza, usa ▲ ▼ o toca el número para escribirlo" : "Desliza sobre el número o usa ▲ ▼";

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    if (extra) {
        const extraBtn = document.createElement("button");
        extraBtn.type = "button";
        extraBtn.className = "dialog-btn ghost";
        const paintExtra = () => {
            extraBtn.textContent = typeof extra.label === "function" ? extra.label() : extra.label;
            unitEl.textContent = unitText();
        };
        paintExtra();
        extraBtn.onclick = () => {
            if (!ready()) return;
            const closeAfter = extra.onClick();
            paintExtra();
            if (closeAfter) close(true);
        };
        actions.appendChild(extraBtn);
    }
    if (cancelLabel) {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "dialog-btn ghost";
        cancelBtn.textContent = cancelLabel;
        cancelBtn.onclick = () => { if (ready()) close(false); };
        actions.appendChild(cancelBtn);
    }
    const done = document.createElement("button");
    done.type = "button";
    done.className = "dialog-btn accept";
    done.textContent = doneLabel || "Listo";
    actions.appendChild(done);

    sheet.append(heading, sub, up, box, unitEl, down, hint, actions);
    overlay.appendChild(sheet);

    const apply = dir => {
        const before = read();
        step(dir);
        const after = read();
        if (after !== before) animateValue(box, dir, after);
    };

    bindHold(up, () => apply(1));
    bindHold(down, () => apply(-1));

    const startEdit = () => { if (onEdit && ready()) editInBox(box, { read, onEdit, editMode }); };

    attachValueSwipe(box, apply, startEdit, 34);

    /* el "clic" que acompaña al toque que abrió el cuadro no debe pulsar nada */
    const openedAt = performance.now();
    const ready = () => performance.now() - openedAt > 350;

    let closed = false;
    const close = (confirmed = true) => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKey, true);
        stepperOverlay = null;

        overlay.style.pointerEvents = "none";
        sheetCollapse(sheet, 130);
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
        if (onClose) onClose(confirmed);
    };

    const onKey = e => {
        if (dialogOverlay) return;   /* hay un cuadro de texto encima: que lo maneje él */
        if (e.target.classList && e.target.classList.contains("stepper-input")) return;   /* escribiendo el número */
        if (e.key === "Escape") { e.preventDefault(); close(!cancelLabel); }
        else if (e.key === "Enter") { e.preventDefault(); close(true); }
        else if (e.key === "ArrowUp") { e.preventDefault(); apply(1); }
        else if (e.key === "ArrowDown") { e.preventDefault(); apply(-1); }
    };
    window.addEventListener("keydown", onKey, true);

    done.onclick = () => { if (ready()) close(true); };
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) close(!cancelLabel); });

    document.body.appendChild(overlay);
    stepperOverlay = overlay;

    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    sheetAppear(sheet);
}


/* =========================================================
    MENÚ EMERGENTE (rutinas, días y ejercicios prefabricados)
    Una ventana flotante sobre la app (no es una sección): buscador arriba
    (solo en ejercicios), lista en el medio y botón de "crear" abajo.
    Así se escribe menos con el teclado.
========================================================= */

const ROUTINE_PRESETS = [
    { key: "tp",  name: "Torso-Pierna",   days: ["Torso", "Pierna"] },
    { key: "ppl", name: "Push-Pull-Legs", days: ["Push", "Pull", "Legs"] },
    { key: "fb",  name: "Full Body",      days: ["Full Body A", "Full Body B", "Full Body C"] }
];

const GENERIC_DAYS = ["Push", "Pull", "Legs", "Torso", "Pierna", "Full Body"];

/* Todos los nombres caben en EXERCISE_NAME_MAX caracteres */
const EXERCISE_CATALOG = {
    "Pecho": ["Press banca", "Press inclinado", "Press declinado", "Press mancuernas", "Aperturas", "Cruce de poleas", "Pec deck", "Fondos", "Flexiones"],
    "Espalda": ["Dominadas", "Jalón al pecho", "Remo con barra", "Remo mancuerna", "Remo T", "Remo polea baja", "Pullover polea", "Peso muerto"],
    "Hombro": ["Press militar", "Press hombro", "Elev. laterales", "Elev. frontales", "Pájaros", "Face pull", "Encogimientos"],
    "Bíceps": ["Curl barra", "Curl mancuernas", "Curl martillo", "Curl predicador", "Curl inclinado", "Curl polea"],
    "Tríceps": ["Press francés", "Extensión polea", "Ext. sobre cabeza", "Press cerrado", "Fondos tríceps", "Patada tríceps"],
    "Pierna": ["Sentadilla", "Sentadilla frontal", "Prensa", "Zancadas", "Sentadilla búlgara", "Ext. cuádriceps", "Curl femoral", "Peso muerto rumano", "Gemelos"],
    "Glúteo": ["Hip thrust", "Puente de glúteo", "Patada de glúteo", "Abductores"],
    "Core": ["Plancha", "Crunch", "Elev. de piernas", "Rueda abdominal", "Russian twist"]
};

const DAY_GROUPS = [
    [/push/, ["Pecho", "Hombro", "Tríceps"]],
    [/pull/, ["Espalda", "Bíceps"]],
    [/leg|pierna/, ["Pierna", "Glúteo", "Core"]],
    [/torso|upper/, ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps"]]
];

function normalizeText(text) {
    return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function priorityGroups(dayName) {
    const n = normalizeText(dayName);
    const hit = DAY_GROUPS.find(([re]) => re.test(n));
    return hit ? hit[1] : [];
}

function priorityIndex(priority, group) {
    const i = priority.indexOf(group);
    return i === -1 ? 99 : i;
}

let pickerOverlay = null;

/* options: { title, groups: [{ title?, items: [{ label, sub?, value }] }], searchable, createLabel, emptyText, onPick(value), onCreate(query) } */
function openPicker(options) {
    closePicker(true);

    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";

    const sheet = document.createElement("div");
    sheet.className = "picker-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "picker-head";
    const title = document.createElement("h3");
    title.className = "picker-title";
    title.textContent = options.title;
    const closeBtn = document.createElement("button");
    closeBtn.className = "picker-close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => closePicker();
    head.append(title, closeBtn);
    sheet.appendChild(head);

    let search = null;
    if (options.searchable) {
        search = document.createElement("input");
        search.type = "search";
        search.className = "picker-search";
        search.placeholder = "Buscar…";
        search.autocomplete = "off";
        search.spellcheck = false;
        sheet.appendChild(search);
    }

    const list = document.createElement("div");
    list.className = "picker-list";
    sheet.appendChild(list);

    if (options.onCreate) {
        const createBtn = document.createElement("button");
        createBtn.className = "picker-create";
        createBtn.textContent = `+ ${options.createLabel}`;
        createBtn.onclick = () => {
            const query = search ? search.value.trim() : "";
            closePicker();
            options.onCreate(query);
        };
        sheet.appendChild(createBtn);
    }

    const renderList = () => {
        const query = search ? normalizeText(search.value) : "";
        list.innerHTML = "";
        let count = 0;

        options.groups.forEach(group => {
            const items = group.items.filter(item => !query || normalizeText(item.label).includes(query));
            if (!items.length) return;

            if (group.title) {
                const heading = document.createElement("div");
                heading.className = "picker-group";
                heading.textContent = group.title;
                list.appendChild(heading);
            }

            items.forEach(item => {
                const btn = document.createElement("button");
                btn.className = "picker-item";
                const label = document.createElement("span");
                label.textContent = item.label;
                btn.appendChild(label);
                if (item.sub) {
                    const sub = document.createElement("small");
                    sub.textContent = item.sub;
                    btn.appendChild(sub);
                }
                btn.onclick = () => {
                    closePicker();
                    options.onPick(item.value);
                };
                list.appendChild(btn);
                count++;
            });
        });

        if (!count) {
            const empty = document.createElement("p");
            empty.className = "picker-empty";
            empty.textContent = query ? "Sin resultados. Puedes crearlo con el botón de abajo." : (options.emptyText || "Sin opciones");
            list.appendChild(empty);
        }
    };

    if (search) search.addEventListener("input", renderList);
    renderList();

    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) closePicker(); });
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    pickerOverlay = overlay;

    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    sheetAppear(sheet);
}

function closePicker(immediate) {
    const overlay = pickerOverlay;
    if (!overlay) return;
    pickerOverlay = null;

    if (immediate) { overlay.remove(); return; }

    const sheet = overlay.firstElementChild;
    overlay.style.pointerEvents = "none";
    sheetCollapse(sheet, 140);
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
}

document.addEventListener("keydown", e => { if (e.key === "Escape" && !dialogOverlay) closePicker(); });


/* =========================================================
    CUADROS DE DIÁLOGO PROPIOS (reemplazan prompt / confirm / alert del navegador)
    Misma ventana flotante que el menú de selección. Devuelven una promesa:
      askText(...)    -> texto (sin espacios en los extremos) o null si se cancela
      askConfirm(...) -> true / false
      showMessage(...)-> se resuelve al cerrarlo
========================================================= */

let dialogOverlay = null;

function openDialog({ title, message, input, buttons, validate }) {
    return new Promise(resolve => {
        if (dialogOverlay) { dialogOverlay.remove(); dialogOverlay = null; }

        const overlay = document.createElement("div");
        overlay.className = "picker-overlay dialog-overlay";

        const sheet = document.createElement("form");
        sheet.className = "picker-sheet dialog-sheet";
        sheet.setAttribute("role", "dialog");
        sheet.setAttribute("aria-modal", "true");
        sheet.noValidate = true;

        const heading = document.createElement("h3");
        heading.className = "picker-title dialog-title";
        heading.textContent = title;
        sheet.appendChild(heading);

        if (message) {
            const text = document.createElement("p");
            text.className = "dialog-text";
            text.textContent = message;
            sheet.appendChild(text);
        }

        let field = null, error = null;
        if (input) {
            field = document.createElement("input");
            field.className = "dialog-input";
            field.type = "text";
            field.value = input.value || "";
            field.placeholder = input.placeholder || "";
            if (input.maxLength) field.maxLength = input.maxLength;
            if (input.inputMode) field.inputMode = input.inputMode;
            field.autocomplete = "off";
            field.spellcheck = false;
            field.setAttribute("aria-label", input.label || title);

            if (input.label) {
                const label = document.createElement("label");
                label.className = "dialog-text";
                label.textContent = input.label;
                sheet.appendChild(label);
            }
            sheet.appendChild(field);

            error = document.createElement("div");
            error.className = "dialog-error";
            sheet.appendChild(error);
        }

        const actions = document.createElement("div");
        actions.className = "dialog-actions";
        sheet.appendChild(actions);

        let finished = false;
        const finish = value => {
            if (finished) return;
            finished = true;
            window.removeEventListener("keydown", onKey, true);
            dialogOverlay = null;

            overlay.style.pointerEvents = "none";
            sheetCollapse(sheet, 130);
            overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
            resolve(value);
        };

        const submit = button => {
            if (!button.confirm) { finish(button.cancelValue); return; }
            if (!field) { finish(button.value); return; }

            const text = field.value.trim();
            let problem = "";
            if (!text && !input.allowEmpty) problem = "Escribe algo para continuar.";
            else if (validate && text) problem = validate(text) || "";
            else if (input.validate && text) problem = input.validate(text) || "";

            if (problem) { error.textContent = problem; field.focus(); return; }
            finish(text);
        };

        buttons.forEach(b => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `dialog-btn ${b.kind || "ghost"}`;
            btn.textContent = b.label;
            btn.onclick = () => submit(b);
            actions.appendChild(btn);
            b._el = btn;
        });

        const confirmButton = buttons.find(b => b.confirm);
        const cancelButton = buttons.find(b => !b.confirm) || confirmButton;

        sheet.addEventListener("submit", e => { e.preventDefault(); submit(confirmButton); });
        if (field) field.addEventListener("input", () => { error.textContent = ""; });

        const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); submit(cancelButton); } };
        window.addEventListener("keydown", onKey, true);

        overlay.addEventListener("pointerdown", e => { if (e.target === overlay) submit(cancelButton); });

        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
        dialogOverlay = overlay;

        overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
        sheetAppear(sheet);

        const focusTarget = field || confirmButton._el;
        setTimeout(() => { focusTarget.focus(); if (field) field.select(); }, 60);
    });
}

function askText({ title, label, value, placeholder, maxLength, inputMode, allowEmpty, validate, confirmLabel }) {
    return openDialog({
        title,
        input: { label, value, placeholder, maxLength, inputMode, allowEmpty, validate },
        buttons: [
            { label: "Cancelar", kind: "ghost", confirm: false, cancelValue: null },
            { label: confirmLabel || "Aceptar", kind: "accept", confirm: true }
        ]
    });
}

function askConfirm({ title, message, confirmLabel, danger = true }) {
    return openDialog({
        title,
        message,
        buttons: [
            { label: "Cancelar", kind: "ghost", confirm: false, cancelValue: false },
            { label: confirmLabel || "Borrar", kind: danger ? "danger" : "accept", confirm: true, value: true }
        ]
    });
}

function showMessage({ title, message }) {
    return openDialog({
        title,
        message,
        buttons: [{ label: "Entendido", kind: "accept", confirm: true, value: true, cancelValue: undefined }]
    });
}

/* Destello discreto (color del destello de Ajustes) que se apaga solo: al aparecer ventanas y tarjetas nuevas */
const GLOW_RING = "0 0 0 1px rgba(var(--ui-rgb), .6), 0 0 11px rgba(var(--ui-rgb), .4)";
function glowOnce(el) {
    const base = getComputedStyle(el).boxShadow;
    const rest = base && base !== "none" ? base : "0 0 0 0 transparent";
    el.animate([{ boxShadow: `${GLOW_RING}, ${rest}` }, { boxShadow: `0 0 0 0 transparent, 0 0 0 0 transparent, ${rest}` }],
               { duration: 700 * NAV_SPEED, easing: "ease-out" });
}

/* Aparición de toda ventana emergente: empieza arriba y se despliega hacia abajo, con el destello */
function sheetAppear(sheet) {
    sheet.animate([
        { clipPath: "inset(0 0 100% 0 round 20px)", transform: "translateY(-10px)", opacity: .3 },
        { clipPath: "inset(0 0 0 0 round 20px)", transform: "none", opacity: 1 }
    ], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
    glowOnce(sheet);
}

/* Al cerrarse, se recoge hacia arriba */
function sheetCollapse(sheet, ms) {
    return sheet.animate([
        { clipPath: "inset(0 0 0 0 round 20px)", transform: "none", opacity: 1 },
        { clipPath: "inset(0 0 100% 0 round 20px)", transform: "translateY(-10px)", opacity: 0 }
    ], { duration: ms, easing: "ease-in", fill: "forwards" });
}

/* Ventana flotante genérica con título y ✕ (test TDEE, resultado, plan, historial de comida).
   Se cierra con ✕, Escape o tocando fuera. Devuelve { sheet, close }. */
function openSheet(className, title, onClose) {
    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";
    const sheet = document.createElement("div");
    sheet.className = `picker-sheet ${className}`;
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "picker-head";
    const h = document.createElement("h3");
    h.className = "picker-title";
    h.textContent = title;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "picker-close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.textContent = "✕";
    head.append(h, closeBtn);
    sheet.appendChild(head);
    overlay.appendChild(sheet);

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKey, true);
        if (onClose) onClose();
        overlay.style.pointerEvents = "none";
        sheetCollapse(sheet, 130);
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
    };
    /* Escape cierra solo la ventana de más arriba (no si hay otra encima o si se está escribiendo) */
    const onKey = e => {
        if (e.key !== "Escape" || dialogOverlay || stepperOverlay || pickerOverlay) return;
        if (e.target.closest && e.target.closest("input, textarea")) return;
        if (overlay !== [...document.querySelectorAll(".picker-overlay")].pop()) return;
        e.preventDefault();
        close();
    };
    window.addEventListener("keydown", onKey, true);
    closeBtn.onclick = close;
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) close(); });

    document.body.appendChild(overlay);
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    sheetAppear(sheet);
    return { sheet, close };
}

/* =========================================================
    HISTORIAL
========================================================= */

let historyOffset = 0;          /* 0 = mes actual, -1 = anterior… */
let historyMode = "workout";    /* "workout" = ejercicio, "food" = calorías */

/* Calorías del día frente a la meta del plan: ≤60 % rojo, 61-75 % amarillo, 76-120 % verde, ≥121 % rojo */
function foodDayStatus(key) {
    const entries = foodEntries(key).filter(e => e.g !== "agua");   /* el agua no tiene calorías: un día con solo agua queda gris */
    return entries.length ? kcalStatus(foodTotals(entries).kcal) : "empty";
}

let historyView = "calendar";   /* "calendar" o "chart" */
let chartPeriod = "day";        /* "day", "week" o "month" */

function renderHistory(animate) {
    const now = new Date();
    const view = new Date(now.getFullYear(), now.getMonth() + historyOffset, 1);
    const year = view.getFullYear();
    const month = view.getMonth();
    const isChart = historyView === "chart";

    /* el botón cambia entre ejercicio → calorías → deportes */
    const MODES = ["workout", "food", "sport"], NEXT_LABEL = { workout: "Ver calorías", food: "Ver deportes", sport: "Ver ejercicio" };
    const modeBtn = document.getElementById("histModeBtn");
    modeBtn.textContent = NEXT_LABEL[historyMode];
    modeBtn.onclick = () => { historyMode = MODES[(MODES.indexOf(historyMode) + 1) % MODES.length]; renderHistory(true); };

    /* En la gráfica, "Calendario completo" pasa a ser el filtro: cada toque cambia Días → Semanas → Meses */
    const monthsBtn = document.getElementById("histMonthsBtn");
    monthsBtn.textContent = isChart ? `Por ${CHART_PERIODS[chartPeriod].label.toLowerCase()}` : "Calendario completo";
    monthsBtn.onclick = isChart
        ? () => { const order = Object.keys(CHART_PERIODS); chartPeriod = order[(order.indexOf(chartPeriod) + 1) % order.length]; renderHistory(true); }
        : openMonthPicker;

    const chartBtn = document.getElementById("histChartBtn");
    chartBtn.textContent = isChart ? "Ver calendario" : "Ver gráfica";
    chartBtn.onclick = () => fadeHistoryView(isChart ? "calendar" : "chart");

    const grid = document.getElementById("historyGrid");
    const chart = document.getElementById("historyChart");
    grid.hidden = isChart;
    chart.hidden = !isChart;

    if (isChart) {
        document.getElementById("historyTitle").textContent = `${{ workout: "Peso levantado", food: "Calorías", sport: "Deportes" }[historyMode]} por ${CHART_PERIODS[chartPeriod].unit}`;
        renderHistoryChart(chart, animate);
        return;
    }

    const title = view.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    document.getElementById("historyTitle").textContent = title.charAt(0).toUpperCase() + title.slice(1);

    grid.innerHTML = "";

    const routine = findRoutine(state.activeRoutineId);
    if (historyMode === "workout" && !routine && !findRoutine(EXTRA_ROUTINE_ID)) {
        const msg = document.createElement("p");
        msg.className = "split-caption";
        msg.style.gridColumn = "1 / -1";
        msg.textContent = "Selecciona una rutina en la pestaña Rutinas";
        grid.appendChild(msg);
        if (animate) popIn(grid.children);
        return;
    }

    ["L", "M", "X", "J", "V", "S", "D"].forEach(letter => {
        const h = document.createElement("div");
        h.className = "history-weekday";
        h.textContent = letter;
        grid.appendChild(h);
    });

    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes primero
    for (let i = 0; i < firstOffset; i++) {
        const blank = document.createElement("div");
        blank.className = "history-cell blank";
        grid.appendChild(blank);
    }

    const todayKey = dateKey(now);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(new Date(year, month, d));
        const status = historyMode === "workout" ? workoutDayStatus(key)
            : historyMode === "food" ? foodDayStatus(key)
            : (state.sports[key] ? "sport" : "empty");

        const cell = document.createElement("button");
        cell.className = "history-cell";
        cell.textContent = d;

        if (status === "green") cell.classList.add("green");
        if (status === "red") cell.classList.add("red");
        if (status === "gold") cell.classList.add("gold");
        if (status === "sport") cell.classList.add("sport");
        if (historyMode !== "sport" && state.sports[key]) cell.classList.add("has-sport");   /* punto: ese día hubo deporte */
        if (key === todayKey) cell.classList.add("today");

        if (key > todayKey) {
            cell.classList.add("future");
        } else if (historyMode === "workout") {
            cell.onclick = () => navFade(() => openHistoryDay(key));
        } else if (historyMode === "sport") {
            cell.onclick = () => navFade(() => { selectedDate = key === dateKey() ? null : key; showSection("week"); });
        } else {
            cell.onclick = () => navFade(() => { foodDate = key === dateKey() ? null : key; showSection("food"); });
        }

        grid.appendChild(cell);
    }

    if (animate) popIn(grid.children);
}

/* Aparición del calendario al cambiar de uno a otro: cada elemento surge un poco más pequeño y transparente */
/* Calendario <-> gráfica: el contenido se desvanece y aparece el otro */
async function fadeHistoryView(next) {
    const parts = ["historyTitle", "historyGrid", "historyChart"].map(id => document.getElementById(id));
    await Promise.all(parts.map(p => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110 * NAV_SPEED, easing: "ease-in", fill: "forwards" }).finished.catch(() => {})));
    historyView = next;
    renderHistory(false);
    parts.forEach(p => { p.getAnimations().forEach(a => a.cancel()); p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 * NAV_SPEED, easing: "ease-out" }); });
}

/* ---------- Gráfica del historial: calorías o peso levantado (kg × reps) ---------- */

const CHART_PERIODS = {
    day:   { label: "Días",    unit: "día",    count: 14 },
    week:  { label: "Semanas", unit: "semana", count: 8 },
    month: { label: "Meses",   unit: "mes",    count: 6 }
};
const LB_TO_KG = 0.4536;

/* Grupos de fechas del periodo, del más antiguo al actual (sin días futuros) */
function chartBuckets(period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dateKey(today);
    const out = [];
    const daysFrom = (start, n) => Array.from({ length: n }, (_, i) => dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))).filter(k => k <= todayKey);
    const short = d => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");

    for (let i = CHART_PERIODS[period].count - 1; i >= 0; i--) {
        if (period === "day") {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            out.push({ label: String(d.getDate()), title: d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }), keys: [dateKey(d)] });
        } else if (period === "week") {
            const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) - i * 7);
            out.push({ label: short(monday), title: `Semana del ${short(monday)}`, keys: daysFrom(monday, 7) });
        } else {
            const first = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
            const name = first.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
            out.push({ label: name, title: first.toLocaleDateString("es-ES", { month: "long", year: "numeric" }), keys: daysFrom(first, days) });
        }
    }
    return out;
}

/* Calorías de un día (sin el agua); null si no se registró comida */
function dayKcal(key) {
    const entries = foodEntries(key).filter(e => e.g !== "agua");
    return entries.length ? foodTotals(entries).kcal : null;
}

/* Variantes del color del destello para cada día de entreno (Push, Pull, Legs...):
   mismo tono base, corrido un poco y con otra luminosidad. Cada una va además con su forma
   de punto, para que se distingan aunque los colores se parezcan. */
function glowVariants(n) {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue("--ui-rgb").split(",").map(Number);
    const [r, g, b] = rgb.map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    /* en tema claro, tonos más oscuros para que se lean sobre el fondo claro */
    const light = document.documentElement.dataset.theme === "light";
    const OFFS = [0, -34, 34, -68, 68, 102];
    const LIGHT = light ? [.45, .36, .55, .30, .50, .40] : [.55, .70, .45, .64, .52, .74];
    return Array.from({ length: n }, (_, i) => `hsl(${Math.round(h + OFFS[i % 6])} ${Math.round(Math.max(45, Math.min(85, sat * 100)))}% ${Math.round(LIGHT[i % 6] * 100)}%)`);
}

/* Forma de punto n.º i centrada en (x, y) con radio r */
function markerPath(i, x, y, r) {
    const pts = (n, rot, rr = r) => Array.from({ length: n }, (_, k) => {
        const a = rot + (k * 2 * Math.PI) / n;
        return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
    }).join(" L");
    switch (i % 6) {
        case 0: return `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;   /* círculo */
        case 1: return `M${pts(4, Math.PI / 4, r * 1.25)} Z`;                                              /* cuadrado */
        case 2: return `M${pts(4, 0, r * 1.3)} Z`;                                                         /* rombo */
        case 3: return `M${pts(3, -Math.PI / 2, r * 1.35)} Z`;                                             /* triángulo */
        case 4: return `M${pts(3, Math.PI / 2, r * 1.35)} Z`;                                              /* triángulo invertido */
        default: return `M${pts(6, 0, r * 1.2)} Z`;                                                        /* hexágono */
    }
}

/* Sesiones de entreno de un día: [{ group, name, volume }]. group = rutina + día (Push, Pull...) */
function daySessions(key) {
    const out = [];
    for (const rid in state.logs) {
        const entry = state.logs[rid][key];
        if (!entry) continue;
        const routine = findRoutine(rid);
        let volume = 0;
        for (const id in entry.exercises) {
            const x = entry.exercises[id];
            const ex = routine && routine.days.flatMap(d => d.exercises).find(e => e.id === id);
            const kg = (x.kg || 0) * (ex && ex.unit === "lb" ? LB_TO_KG : 1);
            volume += kg * x.reps.reduce((a, r) => a + (r || 0), 0);     /* peso × repeticiones de cada serie */
        }
        if (volume <= 0) continue;
        const day = routine && findDay(routine, entry.dayId);
        out.push({ group: `${rid}/${entry.dayId}`, name: day ? day.name : "Día borrado", volume });
    }
    return out;
}

function renderHistoryChart(box, animate) {
    const buckets = chartBuckets(chartPeriod);
    const perDay = chartPeriod === "day";
    const fmt = v => fmtNum(Math.round(v), 0);
    box.innerHTML = "";

    if (historyMode === "food") {
        const points = [];
        buckets.forEach((b, i) => {
            const days = b.keys.map(dayKcal).filter(v => v !== null);
            if (days.length) points.push({ i, value: days.reduce((a, v) => a + v, 0) / days.length, group: "kcal", n: days.length });
        });
        const goal = planKcal();
        dotPanel(box, {
            buckets, points, H: 375, goal, animate, aria: "Calorías",
            styleOf: () => ({ color: "var(--ui)", shape: 0 }),
            summary: () => `Promedio <b>${fmt(points.reduce((a, p) => a + p.value, 0) / points.length)} kcal</b>${perDay ? "" : " al día"} · meta ${fmt(goal)}`,
            detail: p => `${buckets[p.i].title} · <b>${fmt(p.value)} kcal</b>${perDay ? "" : ` al día (${p.n} ${p.n === 1 ? "día" : "días"})`}`,
            empty: "Aún no hay comidas registradas en este periodo."
        });
        return;
    }

    if (historyMode === "workout") {
        const points = [], groups = [];
        buckets.forEach((b, i) => {
            const byGroup = new Map();
            b.keys.forEach(k => daySessions(k).forEach(sx => {
                const g = byGroup.get(sx.group) || { name: sx.name, total: 0, n: 0 };
                g.total += sx.volume; g.n += 1;
                byGroup.set(sx.group, g);
            }));
            byGroup.forEach((g, group) => {
                if (!groups.some(x => x.group === group)) groups.push({ group, name: g.name });
                points.push({ i, value: g.total / g.n, group, name: g.name, n: g.n });   /* promedio por sesión */
            });
        });
        const colors = glowVariants(groups.length);
        const total = buckets.reduce((a, b) => a + b.keys.reduce((s2, k) => s2 + daySessions(k).reduce((t, x) => t + x.volume, 0), 0), 0);
        dotPanel(box, {
            buckets, points, groups, H: 375, animate, aria: "Peso levantado",
            styleOf: group => { const k = Math.max(0, groups.findIndex(g => g.group === group)); return { color: colors[k], shape: k }; },
            summary: () => `Total <b>${fmt(total)} kg</b> levantados${perDay ? "" : " · puntos = promedio por sesión"}`,
            detail: p => `${p.name} · ${buckets[p.i].title} · <b>${fmt(p.value)} kg</b>${p.n > 1 ? ` (promedio de ${p.n} sesiones)` : ""}`,
            empty: "Aún no hay entrenos registrados en este periodo."
        });
        return;
    }

    /* Deportes: un panel por distancia (km) y otro por tiempo (min); cada deporte con su color y forma */
    const groups = [];
    const byUnit = { km: [], min: [] };
    buckets.forEach((b, i) => {
        const sums = new Map();
        b.keys.forEach(k => (state.sports[k] || []).forEach(sp => {
            const group = `${sp.u}/${normalizeText(sp.n)}`;
            const g = sums.get(group) || { name: sp.n, u: sp.u, total: 0, n: 0 };
            g.total += sp.v; g.n += 1;
            sums.set(group, g);
        }));
        sums.forEach((g, group) => {
            if (!groups.some(x => x.group === group)) groups.push({ group, name: g.name });
            byUnit[g.u].push({ i, value: g.total, group, name: g.name, n: g.n });
        });
    });
    if (!groups.length) {
        dotPanel(box, { buckets, points: [], empty: "Aún no hay deportes registrados en este periodo." });
        return;
    }
    const colors = glowVariants(groups.length);
    const styleOf = group => { const k = Math.max(0, groups.findIndex(g => g.group === group)); return { color: colors[k], shape: k }; };
    const both = byUnit.km.length && byUnit.min.length;
    [["km", "Distancia", "km"], ["min", "Tiempo", "min"]].forEach(([u, title, unit]) => {
        const points = byUnit[u];
        if (!points.length) return;
        const used = groups.filter(g => points.some(p => p.group === g.group));
        const total = points.reduce((a, p) => a + p.value, 0);
        const wrap = document.createElement("div");
        wrap.className = "chart-panel";
        box.appendChild(wrap);
        dotPanel(wrap, {
            buckets, points, groups: used, H: both ? 128 : 340, animate, aria: `${title} en deportes`, heading: `${title} (${unit})`,
            styleOf,
            summary: () => `Total <b>${fmtNum(total, 1)} ${unit}</b>`,
            detail: p => `${p.name} · ${buckets[p.i].title} · <b>${fmtNum(p.value, 1)} ${unit}</b>${p.n > 1 ? ` (${p.n} veces)` : ""}`
        });
    });
}

/* Un panel de puntos: resumen arriba, leyenda (si hay grupos), una sola escala, halo del color de cada punto,
   línea fina que une los puntos de un mismo grupo y detalle al tocar un punto */
function dotPanel(box, { buckets, points, groups = [], H = 375, goal = null, animate, aria = "", heading, styleOf, summary, detail, empty }) {
    if (heading) {
        const h = document.createElement("div");
        h.className = "chart-heading";
        h.textContent = heading;
        box.appendChild(h);
    }
    const caption = document.createElement("div");
    caption.className = "chart-caption";
    box.appendChild(caption);

    if (!points.length) {
        const p = document.createElement("p");
        p.className = "chart-empty";
        p.textContent = empty || "Sin datos en este periodo.";
        box.appendChild(p);
        return;
    }
    caption.innerHTML = summary();

    if (groups.length) {
        const legend = document.createElement("div");
        legend.className = "chart-legend";
        groups.forEach(g => {
            const { color, shape } = styleOf(g.group);
            const item = document.createElement("span");
            item.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${markerPath(shape, 8, 8, 5)}" fill="${color}"/></svg>`;
            item.append(g.name);
            legend.appendChild(item);
        });
        box.appendChild(legend);
    }

    const W = Math.max(260, box.clientWidth || 340);
    const m = { l: 40, r: 10, t: 14, b: 22 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const top = Math.max(goal || 0, ...points.map(p => p.value)) * 1.12;
    const step = niceStep(top / (H > 250 ? 4 : 2));
    const max = Math.ceil(top / step) * step;
    const y = v => m.t + ph - (v / max) * ph;
    const slot = pw / buckets.length;
    const short = v => (v >= 1000 ? `${fmtNum(v / 1000, 1)} k` : fmtNum(v, v < 10 ? 1 : 0));

    points.forEach(p => {
        const same = points.filter(q => q.i === p.i);
        const k = same.indexOf(p), spread = Math.min(12, slot / (same.length + 1));
        p.x = m.l + slot * p.i + slot / 2 + (k - (same.length - 1) / 2) * spread;
        p.y = y(p.value);
    });

    let svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${aria}">`;
    for (let v = 0; v <= max + 1e-9; v += step) {
        svg += `<line class="chart-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="chart-tick" x="${m.l - 6}" y="${y(v) + 3}" text-anchor="end">${short(v)}</text>`;
    }
    const every = buckets.length > 7 ? 2 : 1;
    buckets.forEach((b, i) => {
        if ((buckets.length - 1 - i) % every === 0) svg += `<text class="chart-label" x="${m.l + slot * i + slot / 2}" y="${H - 6}" text-anchor="middle">${b.label}</text>`;
    });
    svg += `<line class="chart-base" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/>`;
    if (goal) svg += `<line class="chart-goal" x1="${m.l}" x2="${W - m.r}" y1="${y(goal)}" y2="${y(goal)}"/><text class="chart-goal-label" x="${W - m.r}" y="${y(goal) - 5}" text-anchor="end">Meta</text>`;

    [...new Set(points.map(p => p.group))].forEach(group => {
        const ps = points.filter(p => p.group === group).sort((a, b) => a.i - b.i);
        if (ps.length > 1) svg += `<polyline class="chart-line" points="${ps.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" style="stroke:${styleOf(group).color}"/>`;
    });
    points.forEach((p, n) => {
        const { color, shape } = styleOf(p.group);
        svg += `<g class="chart-pt" data-n="${n}" style="--c:${color}">
            <circle class="chart-halo" cx="${p.x}" cy="${p.y}" r="13"/>
            <path class="chart-dot" d="${markerPath(shape, p.x, p.y, 5)}"/>
            <circle class="chart-hit" cx="${p.x}" cy="${p.y}" r="18"/>
        </g>`;
    });
    svg += `</svg>`;
    box.insertAdjacentHTML("beforeend", svg);

    /* tocar un punto muestra su detalle; tocarlo otra vez vuelve al resumen */
    let selected = -1;
    const svgEl = box.querySelector(".chart-svg");
    svgEl.addEventListener("click", e => {
        const hit = e.target.closest(".chart-pt");
        if (!hit) return;
        const n = Number(hit.dataset.n);
        selected = selected === n ? -1 : n;
        svgEl.classList.toggle("has-selection", selected >= 0);
        svgEl.querySelectorAll(".chart-pt").forEach(g => g.classList.toggle("selected", Number(g.dataset.n) === selected));
        caption.innerHTML = selected < 0 ? summary() : detail(points[selected]);
    });

    if (animate) svgEl.querySelectorAll(".chart-pt").forEach((g, k) =>
        g.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "none" }], { duration: 300 * NAV_SPEED, delay: k * 14 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
}

/* Paso "bonito" para la cuadrícula: 1, 2 o 5 × 10ⁿ */
function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const p = 10 ** Math.floor(Math.log10(raw));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function popIn(elements) {
    [...elements].forEach((el, i) => {
        if (el.classList.contains("blank")) return;
        el.animate(
            [{ opacity: 0, transform: "scale(0.7) translateY(6px)" }, { transform: "none" }],
            { duration: 240 * NAV_SPEED, delay: Math.min(i, 40) * 8 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
        );
    });
}

/* Ventana con todos los meses (del primero con datos hasta el actual) para saltar a uno anterior */
function openMonthPicker() {
    const now = new Date();
    let firstYear = now.getFullYear();

    const note = key => { const y = parseInt(key.slice(0, 4), 10); if (y > 1990 && y < firstYear) firstYear = y; };
    Object.values(state.logs).forEach(byDate => Object.keys(byDate).forEach(note));
    Object.keys((state.food && state.food.log) || {}).forEach(note);

    const names = [];
    for (let m = 0; m < 12; m++) {
        const n = new Date(2000, m, 1).toLocaleDateString("es-ES", { month: "long" });
        names.push(n.charAt(0).toUpperCase() + n.slice(1));
    }

    const groups = [];
    for (let y = now.getFullYear(); y >= firstYear; y--) {
        const lastMonth = y === now.getFullYear() ? now.getMonth() : 11;
        const items = [];
        for (let m = lastMonth; m >= 0; m--) {
            const offset = (y - now.getFullYear()) * 12 + (m - now.getMonth());
            items.push({ label: names[m], sub: offset === historyOffset ? "viendo" : (offset === 0 ? "actual" : ""), value: offset });
        }
        groups.push({ title: String(y), items });
    }

    openPicker({
        title: "Calendario completo",
        groups,
        onPick: offset => { historyOffset = offset; renderHistory(); }
    });
}

/* Tocar un día: abre su entreno si ya existe, o el selector de días de la rutina */
/* Estado del día en el calendario: la rutina activa y el entreno extraordinario juntos (gana el peor) */
function workoutDayStatus(key) {
    const rank = { red: 3, gold: 2, green: 1 };
    let best = "empty";
    [findRoutine(state.activeRoutineId), findRoutine(EXTRA_ROUTINE_ID)].forEach(r => {
        if (!r) return;
        const st = dayStatus(r, key);
        if ((rank[st] || 0) > (rank[best] || 0)) best = st;
    });
    return best;
}

function openHistoryDay(key) {
    selectedDate = (key === dateKey()) ? null : key;

    const entry = state.logs[state.activeRoutineId]?.[key];
    const routine = findRoutine(state.activeRoutineId);
    const extra = extraDayFor(key);

    if (entry && routine && findDay(routine, entry.dayId)) {
        activeWorkout = { routineId: routine.id, dayId: entry.dayId };
        workoutPage = 0;
        showSection("workout");
    } else if (extra && state.logs[EXTRA_ROUTINE_ID]?.[key]) {
        activeWorkout = { routineId: EXTRA_ROUTINE_ID, dayId: extra.id };
        workoutPage = 0;
        showSection("workout");
    } else {
        showSection("week");
    }
}

/* =========================================================
    ARRANQUE
========================================================= */

/* =========================================================
    AJUSTE AUTOMÁTICO AL ESPACIO DISPONIBLE
    Si el contenido de la sección no cabe, primero se achica el encabezado
    (--hdr) para alargar el campo y luego los espacios internos (--k).
========================================================= */

function fitLayout(force) {
    if (SWIPE.busy && !force) return; /* se ajusta al terminar de cambiar de pantalla */
    const app = document.getElementById("mainApp");
    const main = document.querySelector("main");
    if (!app || !main || app.style.display === "none") return;

    const root = document.documentElement;
    root.style.removeProperty("--hdr");
    root.style.removeProperty("--k");

    /* Cuánto se pasa el contenido visible del borde inferior de la zona principal,
       mida lo que mida su contenedor (aunque este lo recorte) */
    const active = main.querySelector(".section.active");
    const overflows = () => {
        const limit = main.getBoundingClientRect().bottom - parseFloat(getComputedStyle(main).paddingBottom);
        let lowest = 0;
        active.querySelectorAll("*").forEach(el => {
            const r = el.getBoundingClientRect();
            if (el.dataset.anim === "1") return;
            const sc = el.closest("[data-scroll]");
            if (sc && sc !== el) return;   /* lo que está dentro de una lista con su propio scroll no cuenta */
            if (r.height > 0 && r.bottom > lowest) lowest = r.bottom;
        });
        return Math.max(lowest - limit, main.scrollHeight - main.clientHeight) > 1;
    };
    if (!overflows()) return;

    const base = parseFloat(getComputedStyle(document.querySelector(".week-tab-label")).height);
    for (let h = base - 4; h >= 34; h -= 4) {
        root.style.setProperty("--hdr", `${h}px`);
        if (!overflows()) return;
    }

    for (let k = 0.9; k >= 0.3; k -= 0.1) {
        root.style.setProperty("--k", k.toFixed(2));
        if (!overflows()) return;
    }
}

let fitQueued = false;
function queueFit() {
    if (fitQueued) return;
    fitQueued = true;
    requestAnimationFrame(() => { fitQueued = false; fitLayout(); });
}

/* Cambiar un número animado (kg, reps) no cambia el tamaño de nada: no hace falta volver a medir */
const isValueChange = r => {
    const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
    return !!(el && el.closest(".kg-value, .reps-value"));
};

function initFitLayout() {
    new MutationObserver(records => { if (!records.every(isValueChange)) queueFit(); }).observe(document.querySelector("main"), { childList: true, subtree: true });
    new MutationObserver(queueFit).observe(document.getElementById("mainApp"), { attributes: true, attributeFilter: ["style"] });
    window.addEventListener("resize", queueFit);
    window.addEventListener("orientationchange", queueFit);
}


/* =========================================================
    DESLIZAMIENTO (SWIPE) CON ANIMACIÓN
    - Horizontal: cambia de pestaña (Semana / Rutinas / Historial);
      dentro de las páginas de ejercicios de una rutina pasa de página.
    - Vertical (solo en Entreno): cambia de página de ejercicios.
    La pantalla sigue al dedo; al soltar se completa o rebota.
========================================================= */

/* Profundidad: la pantalla actual se aleja hacia el lado contrario al que vas, se encoge y se
   desvanece; la nueva llega desde el lado al que vas, desde el fondo, y se agranda hasta su sitio. */
const ANIM = {
    out: (p, a) => ({ transform: `translate${a}(${p * 18}%) scale(${1 - 0.16 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" }),
    in:  (p, a) => ({ transform: `translate${a}(${p * 32}%) scale(${1 - 0.2 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" })
};

/* Mismo estilo para los números de las flechas ▲▼: el número viejo se aleja y el nuevo llega desde el fondo */
const VALUE_ANIM = {
    out: (p, a) => ({ transform: `translate${a}(${p * 70}%) scale(${1 - 0.45 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" }),
    in:  (p, a) => ({ transform: `translate${a}(${p * 85}%) scale(${1 - 0.45 * Math.abs(p)})`, opacity: 1 - Math.abs(p), origin: "50% 50%" })
};

const SWIPE = { busy: false, justDragged: false };

/* Multiplicador de duración de las transiciones de navegación (se cambia en Ajustes) */
let NAV_SPEED = 1;

const frameStyle = f => ({ transform: f.transform, opacity: f.opacity, transformOrigin: f.origin });

function setFrame(el, f) {
    el.style.transform = f.transform;
    el.style.opacity = f.opacity;
    el.style.transformOrigin = f.origin;
}

function clearFrame(el) {
    el.style.transform = "";
    el.style.opacity = "";
    el.style.transformOrigin = "";
}

function playFrames(el, from, to, ms, easing) {
    const anim = el.animate([frameStyle(from), frameStyle(to)], { duration: ms, easing, fill: "forwards" });
    return anim.finished.then(() => anim.cancel()).catch(() => {});
}

/* Completa el cambio: sale la pantalla actual, se actualiza el contenido y entra la nueva */
async function commitSwipe(ctx, dir, p0) {
    const A = ANIM, a = ctx.axis === "x" ? "X" : "Y";
    SWIPE.busy = true;

    await playFrames(ctx.el, A.out(p0, a), A.out(-dir, a), 170 * NAV_SPEED, "ease-in");

    clearFrame(ctx.el);
    ctx.run(dir);
    fitLayout(true);

    setFrame(ctx.el, A.in(dir, a));
    await playFrames(ctx.el, A.in(dir, a), A.in(0, a), 260 * NAV_SPEED, "cubic-bezier(.2,.8,.2,1)");

    clearFrame(ctx.el);
    SWIPE.busy = false;
}

/* Cambia el texto de un valor (kg, repeticiones) con animación.
   dir = +1 al subir (▲): el número viejo sale hacia arriba y el nuevo llega desde abajo; -1 al bajar (▼).
   El dato ya está guardado cuando se llama: solo se anima lo que se ve. */
async function animateValue(box, dir, text) {
    let span = box.querySelector(".v");
    if (!span) {
        span = document.createElement("span");
        span.className = "v";
        span.textContent = box.textContent;
        box.textContent = "";
        box.appendChild(span);
    }

    const token = (span._token = (span._token || 0) + 1);
    const mid = span.dataset.anim === "1";   /* ya había una animación en curso: no repite la salida */
    span.dataset.anim = "1";
    span.getAnimations().forEach(a => a.cancel());

    if (!mid) await playFrames(span, VALUE_ANIM.out(0, "Y"), VALUE_ANIM.out(-dir, "Y"), 90, "ease-in");
    if (token !== span._token) return;

    span.textContent = text;
    setFrame(span, VALUE_ANIM.in(dir, "Y"));
    await playFrames(span, VALUE_ANIM.in(dir, "Y"), VALUE_ANIM.in(0, "Y"), 160, "cubic-bezier(.2,.8,.2,1)");
    if (token !== span._token) return;

    clearFrame(span);
    delete span.dataset.anim;
}

/* Rebote: vuelve a su sitio (también cuando no hay más páginas) */
async function snapBack(ctx, p0) {
    const A = ANIM, a = ctx.axis === "x" ? "X" : "Y";
    SWIPE.busy = true;
    await playFrames(ctx.el, A.out(p0, a), A.out(0, a), 240 * NAV_SPEED, "cubic-bezier(.2,.9,.3,1.2)");
    clearFrame(ctx.el);
    SWIPE.busy = false;
}

/* Qué se desliza según dónde se toque y hacia qué eje */
function swipeContext(inHeader, axis) {
    const main = document.querySelector("main");
    const active = document.querySelector(".section.active").id;

    const tabs = { el: main, axis: "x", can: () => true, run: d => shiftWeekTab(d) };

    if (inHeader) return axis === "x" ? tabs : null;

    /* Entreno: a los lados cambia de sección; arriba/abajo recorre los ejercicios */
    if (active === "workout" && axis === "y") {
        const track = document.querySelector("#workoutExercises .workout-track");
        return track ? { list: true, el: track, axis: "y" } : null;
    }

    return axis === "x" ? tabs : null;
}

function initSwipe() {
    const app = document.getElementById("mainApp");
    let g = null;

    app.addEventListener("pointerdown", e => {
        if (SWIPE.busy || (e.pointerType === "mouse" && e.button !== 0)) return;
        if (e.target.closest("input, textarea, select, .kg-value, .reps-value")) return;
        g = { x: e.clientX, y: e.clientY, t: performance.now(), inHeader: !!e.target.closest("header"), axis: null, ctx: null, p: 0, dir: 0, can: false };
    });

    window.addEventListener("pointermove", e => {
        if (!g) return;
        const dx = e.clientX - g.x, dy = e.clientY - g.y;

        if (!g.axis) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
            g.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
            g.ctx = swipeContext(g.inHeader, g.axis);
            if (!g.ctx) { g = null; return; }
            if (g.ctx.list) { g.stops = workoutStops(); g.base = g.stops[workoutPage] || 0; g.ctx.el.getAnimations().forEach(a => a.cancel()); }
            g.size = g.axis === "x" ? g.ctx.el.offsetWidth : g.ctx.el.offsetHeight;
            g.ctx.el.style.willChange = "transform, opacity";
        }

        const d = g.axis === "x" ? dx : dy;
        g.dir = d < 0 ? 1 : -1;               /* deslizar a la izquierda / arriba = siguiente */

        /* lista vertical: sigue al dedo; pasado el primero o el último ejercicio, con resistencia */
        if (g.ctx.list) {
            const max = g.stops[g.stops.length - 1];
            let y = g.base - dy;
            if (y < 0) y *= 0.3;
            else if (y > max) y = max + (y - max) * 0.3;
            g.ctx.el._y = y;
            g.ctx.el.style.transform = `translateY(${-y}px)`;
            g.dragging = true;
            return;
        }
        g.can = g.ctx.can(g.dir);
        g.p = Math.max(-1, Math.min(1, d / g.size)) * (g.can ? 1 : 0.18);   /* sin más páginas: resistencia */
        g.dragging = true;

        const A = ANIM;
        setFrame(g.ctx.el, A.out(g.p, g.axis === "x" ? "X" : "Y"));
    });

    const finish = (e, cancelled) => {
        if (!g) return;
        const gesture = g;
        g = null;
        if (!gesture.dragging) return;

        gesture.ctx.el.style.willChange = "";
        SWIPE.justDragged = true;
        setTimeout(() => { SWIPE.justDragged = false; }, 60);

        const d = Math.abs(gesture.axis === "x" ? e.clientX - gesture.x : e.clientY - gesture.y);
        const velocity = d / Math.max(1, performance.now() - gesture.t);

        /* lista vertical: un ejercicio por gesto (o vuelve a su sitio si el gesto fue corto) */
        if (gesture.ctx.list) {
            const go = !cancelled && (d > 40 || (velocity > 0.35 && d > 12));
            if (go) shiftWorkoutPage(gesture.dir);
            else setWorkoutOffset(gesture.stops[workoutPage] || 0, true);
            return;
        }
        const passed = Math.abs(gesture.p) > 0.22 || (velocity > 0.45 && d > 30);

        if (!cancelled && gesture.can && passed) commitSwipe(gesture.ctx, gesture.dir, gesture.p);
        else snapBack(gesture.ctx, gesture.p);
    };

    window.addEventListener("pointerup", e => finish(e, false));
    window.addEventListener("pointercancel", e => finish(e, true));

    /* Un arrastre no debe activar el botón sobre el que terminó el dedo */
    app.addEventListener("click", e => {
        if (SWIPE.justDragged) { e.stopPropagation(); e.preventDefault(); }
    }, true);
}

document.addEventListener("DOMContentLoaded", () => {
    initSwipe();
    renderDots(document.getElementById("tabDots"), TAB_ORDER.length, 0);
    initFitLayout();
    initLanding();
    renderWeekSection();
    renderSeriesPanel();
    renderRoutinesTab();
});
