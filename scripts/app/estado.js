/* =========================================================
    PWA: registro del service worker
========================================================= */

/* Actualización silenciosa: al volver a la app se busca versión nueva; si llegó una mientras
   estaba en segundo plano, se recarga en ese momento (los datos ya están guardados), nunca
   en mitad de un uso. */
if ("serviceWorker" in navigator) {
    let swUpdated = false;
    window.addEventListener("load", () => {
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.register("./service-worker.js").then(reg => {
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible" && reg && reg.update) reg.update().catch(() => {});
            });
        }).catch(() => {});
        navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) swUpdated = true; });
    });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && swUpdated) flushSave().finally(() => location.reload());   /* primero lo pendiente */
    });
}

/* (La petición de almacenamiento persistente se hace en hydrateState, tras cargar los datos) */

/* =========================================================
    ESTADO
========================================================= */

const STORAGE_KEY = "qpeeg_state_v1";
const THEME_KEY = "qpeeg_theme";   /* solo el tema, para pintar el fondo correcto antes de cargar nada */
const FONT_KEY = "qpeeg_font";     /* igual con la fuente (tema.js la pone antes de pintar) */
const APP_FONTS = ["atkinson", "grotesk", "saira"];   /* la primera vez (sin datos ni cuenta) sale una al azar */

const DEFAULT_STATE = {
    photo: null,
    avatar: null,        /* avatar elegido en lugar de foto (Ajustes) */
    sports: {},          /* { "2026-11-07": [{ id, k, n, min?, km?, up? }] } (ver deportes.js) */
    achievements: [],
    routines: [],
    activeRoutineId: null,
    logs: {},
    food: { log: {} },
    nutrition: null,
    settings: { theme: "dark", glow: "verde", bright: "mid", speed: "mid" },
    meta: { schema: QStore.SCHEMA_VERSION, savedAt: 0, device: "" }   /* device: id anónimo, base de la futura sincronización */
};

/* Límites usados ya al cargar los datos (deben existir antes de loadState) */
const MAX_SERIES_PER_EXERCISE = 8;   /* series de un ejercicio, contando las extra de Entreno (2 filas de 4) */
const MAX_EXTRA_SERIES = 8;
const ACH_MAX_ACTIVE = 3;        /* logros por cumplir a la vez */
const ACH_MAX_TOTAL = 6;         /* incluidos los completados */
const EXTRA_ROUTINE_ID = "__extra";   /* rutina interna (oculta) con un día "Extraordinario" por fecha */

/* Arranque en dos pasos: primero el espejo de localStorage (inmediato), luego IndexedDB.
   Si IndexedDB tiene un guardado más reciente (p. ej. localStorage se llenó), gana IndexedDB. */
let state = loadState();
const stateReady = hydrateState();

function loadState() {
    let raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
    if (!raw) return stateFrom(null);
    try { return stateFrom(JSON.parse(raw)); }
    catch (e) { return stateFrom(null); }
}

/* Datos crudos (de cualquier versión) → estado listo para usar */
function stateFrom(parsed) {
    if (!parsed) {
        const s = structuredClone(DEFAULT_STATE);
        s.meta.device = QStore.newId();
        s.settings.font = firstFont();
        return s;
    }
    const migrated = QStore.migrate(parsed);
    try { return freezeOldPlans(sanitizeState(migrated)); }
    catch (e) { return Object.assign(structuredClone(DEFAULT_STATE), migrated); }   /* nunca perder los datos guardados */
}

/* App nueva: una fuente al azar entre las de la app. Se recuerda aparte para que no cambie
   en cada apertura antes del primer guardado. */
function firstFont() {
    let f = null;
    try { f = localStorage.getItem(FONT_KEY); } catch (e) { f = null; }
    if (!APP_FONTS.includes(f) && f !== "arial") {
        f = APP_FONTS[Math.floor(Math.random() * APP_FONTS.length)];
        try { localStorage.setItem(FONT_KEY, f); } catch (e) { /* nada */ }
    }
    return f;
}

async function hydrateState() {
    try {
        const rec = await QStore.load();
        const localAt = state.meta.savedAt || 0;
        if (rec && (rec.savedAt > localAt || !hasLocalData())) {   /* más nuevo, o localStorage borrado */
            state = stateFrom(JSON.parse(rec.json));
        } else if (hasLocalData() && (!rec || rec.savedAt < localAt)) {
            await QStore.queueSave(JSON.stringify(state), localAt);   /* primera copia (o copia atrasada) desde localStorage */
        }
    } catch (e) { /* sin IndexedDB: la app sigue con localStorage */ }
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

function hasLocalData() {
    try { return !!localStorage.getItem(STORAGE_KEY); } catch (e) { return false; }
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
                series: seriesOf(ex.series, num, isObj),
                /* imagen elegida en la galería (si no, se elige por el nombre) */
                fig: typeof ex.fig === "string" && /^[a-z0-9-]{1,24}$/.test(ex.fig) ? ex.fig : undefined
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
                if (!isObj(x)) continue;
                exercises[id] = { kg: num(x.kg), reps: (Array.isArray(x.reps) ? x.reps : []).map(num), extra: Math.min(MAX_EXTRA_SERIES, Math.round(num(x.extra))) };
                /* peso propio de algunas series: { índice: kg }; las demás usan el peso del ejercicio */
                if (isObj(x.kgs)) {
                    const kgs = {};
                    for (const i in x.kgs) if (/^\d+$/.test(i) && Number(i) < 16 && Number.isFinite(Number(x.kgs[i])) && Number(x.kgs[i]) >= 0) kgs[i] = Math.min(9999, Number(x.kgs[i]));
                    if (Object.keys(kgs).length) exercises[id].kgs = kgs;
                }
            }
            const entry = { dayId: typeof e.dayId === "string" ? e.dayId : "", exercises };
            if (e.done === true) entry.done = true;   /* ✓ del entreno: día dado por terminado */
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
            .map(f => {
                const out = { ...f, id: String(f.id ?? ""), n: str(f.n, 80), t: str(f.t, 80) };
                /* Comida rápida y "dar el día": calorías y macros propios por unidad */
                for (const k of ["k", "mc", "mp", "mf", "q"]) {
                    if (k in out) out[k] = Math.min(20000, Math.max(0, Number(out[k]) || 0));
                }
                /* Equivalencia en porciones por unidad (comida rápida y alimentos calibrados) */
                if ("pt" in out) {
                    const pt = isObj(out.pt) ? out.pt : {};
                    out.pt = {};
                    for (const g of ["h", "bg", "mg", "g", "v", "fr", "l"]) {
                        const v = Number(pt[g]);
                        if (v > 0 && v <= 100) out.pt[g] = v;
                    }
                    if (!Object.keys(out.pt).length) delete out.pt;
                }
                return out;
            });
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
        /* min, km y up (desnivel en m): cada uno opcional, al menos uno. Los registros viejos { u, v } se convierten,
           y se guarda también u/v para que un teléfono sin actualizar no los descarte al sincronizar */
        const list = sports[key].filter(x => isObj(x) && typeof x.n === "string").map(x => {
            const sp = { id: String(x.id ?? ""), k: str(x.k, 20), n: str(x.n, 40) };
            const v = num(x.v);
            const min = num(x.min) || (x.u === "min" ? v : 0), km = num(x.km) || (x.u === "km" ? v : 0), up = num(x.up);
            if (min > 0) sp.min = Math.min(min, 1440);
            if (km > 0) sp.km = Math.min(km, 500);
            if (up > 0) sp.up = Math.min(up, 9000);
            /* boxeo: rounds y minutos por round (y su tiempo total en min) */
            const rounds = Math.round(num(x.rounds)), rmin = num(x.rmin);
            if (rounds > 0) sp.rounds = Math.min(rounds, 50);
            if (rmin > 0) sp.rmin = Math.min(rmin, 15);
            if (sp.rounds && sp.rmin && !sp.min) sp.min = Math.min(sp.rounds * sp.rmin, 1440);
            if (sp.km) { sp.u = "km"; sp.v = sp.km; } else if (sp.min) { sp.u = "min"; sp.v = sp.min; }
            /* cuerpo del día (deportes.js): sexo, edad, altura y peso */
            const bp = x.bp;
            if (isObj(bp) && num(bp.h) > 0 && num(bp.w) > 0)
                sp.bp = { s: bp.s === "m" ? "m" : "f", a: Math.min(120, Math.max(5, num(bp.a) || 30)), h: Math.min(250, num(bp.h)), w: Math.min(400, num(bp.w)) };
            return sp;
        }).filter(sp => sp.min || sp.km || sp.up);
        if (list.length) s.sports[key] = list;
    }

    s.settings = isObj(s.settings) ? s.settings : {};
    const m = isObj(s.meta) ? s.meta : {};
    s.meta = {
        schema: Math.max(QStore.SCHEMA_VERSION, QStore.schemaOf(s)),
        savedAt: num(m.savedAt),
        device: typeof m.device === "string" && m.device ? m.device.slice(0, 60) : QStore.newId()
    };
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
    fixEntryDays(s);
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

/* Guardar agrupado: cada cambio (cada paso al deslizar un valor) marca el estado y lo escribe ~0,4 s
   después del último cambio, en una sola escritura. Antes se serializaba TODO el estado en cada paso
   (11–20 ms en PC y ≈ 50–100 ms en un teléfono con un año de datos): deslizar daba tirones.
   La fecha de guardado (savedAt) se pone al momento, para que la sincronización vea el cambio enseguida.
   Al ocultar o cerrar la app se escribe de inmediato (flushSave). */
const SAVE_DELAY = 400;
/* Espejo en localStorage solo mientras quepa holgado (su tope ronda 5 MB y escribe bloqueando);
   más grande, la copia completa queda solo en IndexedDB */
const LOCAL_MIRROR_MAX = 1_500_000;
let saveTimer = null, savePending = null;

function saveState() {
    refreshTodayPlans();
    state.meta.savedAt = Math.max(Date.now(), (state.meta.savedAt || 0) + 1);
    if (!savePending) {
        let resolve;
        savePending = { promise: new Promise(r => { resolve = r; }), resolve };
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, SAVE_DELAY);
    return savePending.promise;
}

/* Escribe ya lo pendiente (si hay). Devuelve si quedó guardado en algún lado. */
function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    const pending = savePending;
    if (!pending) return QStore.flush();
    savePending = null;
    const json = JSON.stringify(state);
    let localOk = true;
    try {
        if (json.length <= LOCAL_MIRROR_MAX) localStorage.setItem(STORAGE_KEY, json);
        else { localStorage.removeItem(STORAGE_KEY); localOk = false; }
    } catch (e) { localOk = false; }
    try { localStorage.setItem(THEME_KEY, state.settings.theme === "light" ? "light" : "dark"); } catch (e) { /* nada */ }
    try { localStorage.setItem(FONT_KEY, state.settings.font || "arial"); } catch (e) { /* nada */ }
    if (typeof scheduleSync === "function") scheduleSync();   /* cuenta.js: sube el cambio en unos segundos */
    const done = QStore.queueSave(json, state.meta.savedAt).then(idbOk => {
        if (!idbOk && !localOk && !saveWarned) {
            saveWarned = true;
            showMessage({ title: "No se pudo guardar", message: "El almacenamiento del teléfono está lleno o bloqueado. Exporta un respaldo y libera espacio." });
        }
        return idbOk || localOk;
    });
    done.then(pending.resolve, () => pending.resolve(localOk));
    return done;
}

/* Lo pendiente se escribe al salir, ocultar o congelar la app */
if (typeof document !== "undefined" && typeof window !== "undefined") {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSave(); });
    window.addEventListener("pagehide", () => flushSave());
    document.addEventListener("freeze", () => flushSave());
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
    const blob = new Blob([JSON.stringify({ app: "qpeeg", version: 2, schema: QStore.SCHEMA_VERSION, state }, null, 1)], { type: "application/json" });
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
    const keepDevice = state.meta.device;
    state = stateFrom(st);
    state.meta.device = keepDevice;   /* el respaldo trae los datos, no la identidad del otro teléfono */
    if (await saveState()) location.reload();
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
        kgs: stored && stored.kgs ? { ...stored.kgs } : {},   /* peso propio de algunas series */
        extra,
        reps: Array.from({ length: ex.series.length + extra }, (_, i) => (stored ? (stored.reps[i] || 0) : 0))
    };
}

/* Series marcadas (reps > 0) de un día de la rutina dentro de un registro */
function markedSeriesOf(entry, day) {
    if (!day) return 0;
    return day.exercises.reduce((n, ex) => n + (entry.exercises[ex.id]?.reps || []).filter(r => r > 0).length, 0);
}

/* Asocia el registro a un día; si es nuevo o cambia de día, copia las metas actuales de ese día.
   Un registro es de un solo día por fecha: tocar otro día de la rutina (ver la pierna estando en push)
   no cambia el día entrenado mientras el actual tenga más series marcadas. */
function setEntryDay(routineId, entry, dayId) {
    if (entry.dayId === dayId && entry.plan) return;
    const routine = findRoutine(routineId);
    if (entry.dayId && entry.dayId !== dayId && routine) {
        const cur = markedSeriesOf(entry, findDay(routine, entry.dayId));
        if (cur > 0 && markedSeriesOf(entry, findDay(routine, dayId)) + 1 <= cur) return;
    }
    entry.dayId = dayId;
    const day = findDay(routine, dayId);
    if (day) entry.plan = planOf(day);
}

/* Registros guardados con el día equivocado (se tocó otro día de la rutina): pasan al día con más series marcadas */
function fixEntryDays(s) {
    for (const rid in s.logs) {
        const routine = s.routines.find(r => r.id === rid);
        if (!routine) continue;
        for (const key in s.logs[rid]) {
            const entry = s.logs[rid][key];
            const cur = markedSeriesOf(entry, routine.days.find(d => d.id === entry.dayId));
            let best = null, most = cur;
            routine.days.forEach(d => { const n = markedSeriesOf(entry, d); if (n > most) { most = n; best = d; } });
            if (best) { entry.dayId = best.id; entry.plan = planOf(best); }
        }
    }
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

/* Avance de un día, serie por serie: total de la rutina, en rojo, sin marcar, y las series extra hechas
   (las extra de cada ejercicio y las de los ejercicios extra de esa fecha) que reemplazan a las no hechas */
function dayProgress(routine, key) {
    const entry = state.logs[routine.id]?.[key];
    if (!entry) return null;

    /* Hoy: la rutina actual. Días pasados: las metas guardadas ese día (aunque luego se borrara el día o el ejercicio) */
    const day = findDay(routine, entry.dayId);
    const plan = key !== dateKey() && entry.plan ? entry.plan : (day ? planOf(day) : null);
    if (!plan || plan.length === 0) return null;

    let total = 0, red = 0, unmarked = 0, extra = 0, gold = false;
    plan.forEach(p => {
        const reps = entry.exercises[p.id]?.reps || [];
        p.t.forEach((range, i) => {
            total++;
            const st = reps[i] > 0 ? serieStatus(range, reps[i]) : "";
            if (!st) unmarked++;
            else { if (st === "red") red++; if (st === "gold") gold = true; }
        });
        extra += reps.slice(p.t.length).filter(r => r > 0).length;   /* series extra del ejercicio */
    });
    /* ejercicios extra de esa fecha (para reemplazar los que no se hicieron) */
    if (routine.id !== EXTRA_ROUTINE_ID) {
        const xe = state.logs[EXTRA_ROUTINE_ID]?.[key];
        if (xe) for (const id in xe.exercises) extra += (xe.exercises[id].reps || []).filter(r => r > 0).length;
    }
    if (extra) gold = true;
    const missing = Math.max(0, unmarked - extra);   /* lo no hecho que las extra no cubren */
    return { total, red, unmarked, extra, missing, gold, marked: total - unmarked, done: Math.min(1, (total - missing) / total) };
}

function dayStatus(routine, key) {
    const d = dayProgress(routine, key);
    if (!d || d.marked + d.extra === 0) return "empty";
    /* rojo solo si al menos el 25 % de las series quedó en rojo o sin hacer (las extra cuentan como hechas) */
    if (d.red >= d.total * 0.25 || d.missing >= d.total * 0.25) return "red";
    /* amarillo solo si toda la rutina quedó hecha y en meta (ninguna serie sin marcar ni en rojo) y algo se superó */
    return d.gold && d.unmarked === 0 && d.red === 0 ? "gold" : "green";
}
