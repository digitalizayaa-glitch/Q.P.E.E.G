/* =========================================================
    DEPORTES: tiempo, distancia y desnivel → "carga"
    Cada registro puede tener uno, dos o los tres datos (min, km, m de subida).
    Carga = promedio de (dato ÷ dato de una salida normal × 100) de los datos puestos:
    una salida normal da exactamente 100, pongas los datos que pongas.
    La salida normal depende del deporte y se escala con las calorías de mantenimiento del
    plan (más mantenimiento → salida normal más larga). Referencias para 2400 kcal.
========================================================= */

const SPORT_BASE_KCAL = 2400;

/* ref: salida normal para 2400 kcal de mantenimiento. Sin "km" o "up" = ese dato no aplica a ese deporte */
const SPORTS = [
    { k: "run",    name: "Correr",     ref: { min: 45, km: 7,   up: 60 } },
    { k: "bike",   name: "Ciclismo",   ref: { min: 90, km: 35,  up: 400 } },
    { k: "walk",   name: "Caminar",    ref: { min: 60, km: 5,   up: 80 } },
    { k: "swim",   name: "Nadar",      ref: { min: 45, km: 1.5 } },
    { k: "soccer", name: "Fútbol",     ref: { min: 90, km: 8 } },
    { k: "basket", name: "Básquetbol", ref: { min: 60, km: 4 } },
    { k: "tennis", name: "Tenis",      ref: { min: 60, km: 3 } },
    { k: "volley", name: "Voleibol",   ref: { min: 60 } },
    { k: "custom", name: "Otro",       ref: { min: 60, km: 5,   up: 100 }, hidden: true }
];
const SPORT_BY_KEY = Object.fromEntries(SPORTS.map(s => [s.k, s]));

const SPORT_FIELDS = [
    { f: "min", label: "Tiempo",          unit: "min", step: 5,   max: 1440, fmt: v => fmtDuration(v) },
    { f: "km",  label: "Distancia",       unit: "km",  step: 0.5, max: 500,  fmt: v => `${fmtNum(v, 1)} km` },
    { f: "up",  label: "Desnivel positivo", unit: "m", step: 10,  max: 9000, fmt: v => `+${fmtNum(v, 0)} m` }
];

function fmtDuration(min) {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/* Escala de la salida normal: mantenimiento del plan ÷ 2400 (sin plan: 1) */
function sportScale() {
    const n = typeof nutrition === "function" ? nutrition() : null;
    if (!n) return 1;
    const tdee = calcTDEE(n.profile).tdee;
    return Math.min(2, Math.max(0.5, tdee / SPORT_BASE_KCAL));
}

/* Salida normal de este usuario para un deporte */
function sportReference(k) {
    const base = (SPORT_BY_KEY[k] || SPORT_BY_KEY.custom).ref;
    const f = sportScale();
    const out = {};
    for (const key in base) out[key] = base[key] * f;
    return out;
}

/* Carga de un registro: promedio de los datos puestos, cada uno respecto a la salida normal (normal = 100) */
function sportLoad(sp) {
    const ref = sportReference(sp.k);
    const parts = SPORT_FIELDS.map(({ f }) => (sp[f] > 0 && ref[f] ? sp[f] / ref[f] * 100 : null)).filter(x => x !== null);
    return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
}

/* "1 h 30 min · 40 km · +450 m" */
function sportSummary(sp) {
    return SPORT_FIELDS.filter(({ f }) => sp[f] > 0).map(({ f, fmt }) => fmt(sp[f])).join(" · ");
}

/* ---------- Añadir deporte ---------- */
function addSport() {
    openPicker({
        title: "Añadir deporte",
        groups: [
            { title: "Con distancia", items: SPORTS.filter(s => !s.hidden && s.ref.km).map(s => ({ label: s.name, sub: s.ref.up ? "Tiempo, km y desnivel" : "Tiempo y km", value: s })) },
            { title: "Por tiempo", items: SPORTS.filter(s => !s.hidden && !s.ref.km).map(s => ({ label: s.name, sub: "Tiempo", value: s })) }
        ],
        createLabel: "Otro deporte",
        onPick: sport => askSportData(sport),
        onCreate: async query => {
            const name = await askText({ title: "Otro deporte", label: "Nombre del deporte", value: query || "", maxLength: 30 });
            if (name) askSportData({ ...SPORT_BY_KEY.custom, name });
        }
    });
}

/* Tiempo, distancia y desnivel: cada uno opcional ("—" = no se cuenta). Muestra la carga mientras se ajusta */
function askSportData(sport) {
    const ref = sportReference(sport.k);
    const fields = SPORT_FIELDS.filter(({ f }) => ref[f]);
    const vals = {};
    fields.forEach(({ f }) => { vals[f] = 0; });
    vals[fields.find(x => x.f === "km") ? "km" : "min"] = ref.km ? Math.round(ref.km) : Math.round(ref.min / 5) * 5;   /* empieza con un valor típico */

    const { sheet, close } = openSheet("sport-sheet", sport.name);
    const body = document.createElement("div");
    body.className = "sport-form";
    const load = document.createElement("div");
    load.className = "sport-load";

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "dialog-btn ghost";
    cancel.textContent = "Cancelar";
    cancel.onclick = close;
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "dialog-btn accept";
    addBtn.textContent = "Añadir";
    addBtn.onclick = () => {
        const entry = { id: newId("sp"), k: sport.k, n: sport.name };
        fields.forEach(({ f }) => { if (vals[f] > 0) entry[f] = vals[f]; });
        if (!fields.some(({ f }) => entry[f] > 0)) return;
        const key = getWorkoutDateKey();
        (state.sports[key] ??= []).push(withLegacy(entry));
        saveState();
        close();
        renderWeekSection();
    };
    const paintLoad = () => {
        const any = fields.some(({ f }) => vals[f] > 0);
        const l = Math.round(sportLoad({ k: sport.k, ...vals }));
        load.innerHTML = any ? `Carga <b>${l}</b> <span>100 = una salida normal para ti</span>` : `<span>Pon al menos un dato</span>`;
        addBtn.disabled = !any;
    };

    fields.forEach(field => {
        const row = document.createElement("div");
        row.className = "sport-row";
        const label = document.createElement("div");
        label.className = "sport-row-label";
        label.innerHTML = `${field.label}<small>Normal: ${field.fmt(Math.round(ref[field.f] * (field.f === "km" ? 2 : 1)) / (field.f === "km" ? 2 : 1))}</small>`;
        const down = document.createElement("button");
        const up = document.createElement("button");
        const value = document.createElement("button");
        down.type = up.type = value.type = "button";
        down.className = up.className = "stepper-btn sport-step";
        down.textContent = "▼";
        up.textContent = "▲";
        down.setAttribute("aria-label", `Menos ${field.label.toLowerCase()}`);
        up.setAttribute("aria-label", `Más ${field.label.toLowerCase()}`);
        value.className = "sport-value";
        const paint = () => {
            value.textContent = vals[field.f] > 0 ? field.fmt(vals[field.f]) : "—";
            value.setAttribute("aria-label", `${field.label}: ${vals[field.f] > 0 ? field.fmt(vals[field.f]) : "sin dato"}. Toca para escribir`);
            paintLoad();
        };
        const stepBy = dir => {
            const step = field.f === "up" && sport.k === "bike" ? 25 : field.f === "km" && sport.k === "bike" ? 1 : field.step;
            vals[field.f] = Math.min(field.max, Math.max(0, Math.round((vals[field.f] + dir * step) * 10) / 10));
            paint();
        };
        bindHold(down, () => stepBy(-1));
        bindHold(up, () => stepBy(1));
        value.onclick = async () => {
            const text = await askText({
                title: field.label, label: `En ${field.unit === "m" ? "metros de subida" : field.unit === "min" ? "minutos" : "kilómetros"} (vacío = sin dato)`,
                value: vals[field.f] > 0 ? String(vals[field.f]).replace(".", ",") : "", maxLength: 6, allowEmpty: true, inputMode: field.f === "km" ? "decimal" : "numeric",
                validate: t => (!t.trim() || parseAmount(t, { max: field.max }) !== null ? "" : "Escribe un número")
            });
            if (text === null || text === undefined) return;
            vals[field.f] = text.trim() ? parseAmount(text, { max: field.max }) || 0 : 0;
            paint();
        };
        row.append(label, down, value, up);
        body.appendChild(row);
        paint();
    });

    actions.append(cancel, addBtn);
    body.append(load, actions);
    sheet.appendChild(body);
    paintLoad();
}

/* Las versiones anteriores de la app solo entienden { u, v }: se guardan también para que un teléfono
   sin actualizar no borre el registro al sincronizar */
function withLegacy(sp) {
    const out = { ...sp };
    delete out.u; delete out.v;
    if (sp.km > 0) { out.u = "km"; out.v = sp.km; }
    else if (sp.min > 0) { out.u = "min"; out.v = sp.min; }
    return out;
}

function removeSport(key, id) {
    state.sports[key] = (state.sports[key] || []).filter(x => x.id !== id);
    if (!state.sports[key].length) delete state.sports[key];
    saveState();
    renderWeekSection();
}
