/* =========================================================
    DEPORTES: tiempo, distancia y desnivel → "carga"
    Cada registro puede tener uno, dos o los tres datos (min, km, m de subida).
    Cada dato se compara con el de una salida normal (dato ÷ normal × 100) y la carga es el
    promedio de los datos puestos: con 3 datos cada uno aporta hasta 33,3; con 2, hasta 50;
    con 1, hasta 100. Una salida normal da 100, pongas los datos que pongas.
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
const sportDef = k => SPORT_BY_KEY[k] || SPORT_BY_KEY.custom;

const SPORT_FIELDS = [
    { f: "min", label: "Tiempo",    unit: "min", step: 5,   max: 1440, fmt: v => fmtDuration(v), mode: "numeric" },
    { f: "km",  label: "Distancia", unit: "km",  step: 0.5, max: 500,  fmt: v => `${fmtNum(v, 1)} km`, mode: "decimal" },
    { f: "up",  label: "Desnivel",  unit: "m",   step: 5,   max: 9000, fmt: v => `+${fmtNum(v, 0)} m`, mode: "numeric" }
];
const sportFields = k => SPORT_FIELDS.filter(({ f }) => sportDef(k).ref[f]);

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

/* Salida normal de este usuario en un deporte */
function sportReference(k) {
    const base = sportDef(k).ref;
    const f = sportScale();
    const out = {};
    for (const key in base) out[key] = base[key] * f;
    return out;
}

/* Puntaje de cada dato puesto (dato ÷ normal × 100) */
function sportParts(sp) {
    const ref = sportReference(sp.k);
    return SPORT_FIELDS.filter(({ f }) => sp[f] > 0 && ref[f]).map(({ f }) => ({ f, pct: sp[f] / ref[f] * 100 }));
}

/* Carga: promedio de los puntajes (normal = 100) */
function sportLoad(sp) {
    const parts = sportParts(sp);
    return parts.length ? parts.reduce((a, p) => a + p.pct, 0) / parts.length : 0;
}

/* "1 h 30 min · 40 km · +450 m" */
function sportSummary(sp) {
    return SPORT_FIELDS.filter(({ f }) => sp[f] > 0).map(({ f, fmt }) => fmt(sp[f])).join(" · ");
}

/* ---------- Añadir y editar deporte ---------- */
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

/* Tocar un deporte de la lista del día lo abre para cambiarlo */
function editSport(key, id) {
    const sp = (state.sports[key] || []).find(x => x.id === id);
    if (sp) askSportData({ ...sportDef(sp.k), k: sp.k, name: sp.n }, { key, entry: sp });
}

/* Tiempo, distancia y desnivel: cada uno opcional ("—" = sin dato). Cada campo con ▲ arriba y ▼ abajo,
   se puede deslizar o tocar para escribir. Muestra la carga (promedio de los datos) mientras se ajusta */
function askSportData(sport, editing) {
    const fields = sportFields(sport.k);
    const vals = {};
    fields.forEach(({ f }) => { vals[f] = editing ? editing.entry[f] || 0 : 0; });
    const ref = sportReference(sport.k);
    if (!editing) vals[ref.km ? "km" : "min"] = ref.km ? Math.round(ref.km) : Math.round(ref.min / 5) * 5;   /* empieza con un valor normal */

    const { sheet, close } = openSheet("sport-sheet", sport.name);
    const body = document.createElement("div");
    body.className = "sport-form";
    const grid = document.createElement("div");
    grid.className = "sport-fields";
    grid.style.gridTemplateColumns = `repeat(${fields.length}, 1fr)`;
    const load = document.createElement("div");
    load.className = "sport-load";

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "dialog-btn ghost";
    cancel.textContent = "Cancelar";
    cancel.onclick = close;
    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "dialog-btn accept";
    saveBtn.textContent = editing ? "Guardar" : "Añadir";
    actions.append(cancel, saveBtn);

    const paintLoad = () => {
        const sp = { k: sport.k, ...vals };
        const parts = sportParts(sp);
        const any = parts.length > 0;
        load.innerHTML = any
            ? `Carga <b>${Math.round(sportLoad(sp))}</b><span>${parts.length === 1 ? "con 1 dato" : `promedio de ${parts.length} datos: ${parts.map(p => Math.round(p.pct)).join(" · ")}`}</span>`
            : `<span>Pon al menos un dato</span>`;
        saveBtn.disabled = !any;
    };

    const cols = fields.map(field => {
        const col = document.createElement("div");
        col.className = "sport-col";
        const label = document.createElement("div");
        label.className = "sport-col-label";
        label.textContent = field.label;
        const up = document.createElement("button");
        const down = document.createElement("button");
        up.type = down.type = "button";
        up.className = down.className = "stepper-btn sport-step";
        up.textContent = "▲";
        down.textContent = "▼";
        up.setAttribute("aria-label", `Más ${field.label.toLowerCase()}`);
        down.setAttribute("aria-label", `Menos ${field.label.toLowerCase()}`);
        const box = document.createElement("div");
        box.className = "sport-value";
        box.setAttribute("role", "spinbutton");
        box.tabIndex = 0;
        const hint = document.createElement("small");
        hint.className = "sport-col-hint";

        const text = () => (vals[field.f] > 0 ? field.fmt(vals[field.f]) : "—");
        const fit = () => requestAnimationFrame(() => { fitText(box, 19, 12); fitText(hint, 12, 9.5); });
        const paintHint = () => {
            const r = field.f === "km" ? Math.round(ref.km * 2) / 2 : field.f === "min" ? Math.round(ref.min / 5) * 5 : Math.round(ref.up / 5) * 5;
            hint.textContent = `Normal ${field.fmt(r)}`;
            box.setAttribute("aria-label", `${field.label}: ${vals[field.f] > 0 ? field.fmt(vals[field.f]) : "sin dato"}`);
            fit();
        };
        const step = field.f === "km" && sport.k === "bike" ? 1 : field.step;
        const apply = dir => {
            const before = text();
            vals[field.f] = Math.min(field.max, Math.max(0, Math.round((vals[field.f] + dir * step) * 10) / 10));
            const after = text();
            if (after !== before) animateValue(box, dir, after);
            paintHint();
            paintLoad();
        };
        box.textContent = text();
        bindHold(up, () => apply(1));
        bindHold(down, () => apply(-1));
        /* tocar para escribir el número exacto (vacío = sin dato) */
        const startEdit = () => editInBox(box, {
            read: () => (vals[field.f] > 0 ? String(vals[field.f]) : ""),
            editMode: field.mode,
            onEdit: t => {
                const n = parseAmount(t, { max: field.max });
                if (n === null) return "x";
                vals[field.f] = n;
                return "";
            }
        });
        /* al terminar de escribir, el cuadro vuelve a mostrarse con formato ("1 h 30 min") */
        new MutationObserver(() => {
            if (!box.classList.contains("editing") && !box.querySelector(".v") && box.textContent !== text()) { box.textContent = text(); paintHint(); paintLoad(); }
        }).observe(box, { attributes: true, attributeFilter: ["class"], childList: true });
        attachValueSwipe(box, apply, startEdit, 22);
        paintHint();
        col.append(label, up, box, down, hint);
        return col;
    });
    grid.append(...cols);

    saveBtn.onclick = () => {
        const entry = editing ? { ...editing.entry } : { id: newId("sp"), k: sport.k, n: sport.name };
        fields.forEach(({ f }) => { if (vals[f] > 0) entry[f] = vals[f]; else delete entry[f]; });
        if (!fields.some(({ f }) => entry[f] > 0)) return;
        const key = editing ? editing.key : getWorkoutDateKey();
        const list = (state.sports[key] ??= []);
        const at = list.findIndex(x => x.id === entry.id);
        if (at >= 0) list[at] = withLegacy(entry); else list.push(withLegacy(entry));
        saveState();
        close();
        renderWeekSection();
    };

    body.append(grid, load, actions);
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
