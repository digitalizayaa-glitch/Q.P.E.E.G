/* =========================================================
    DEPORTES → "carga" (TRIMP de Banister): minutos × peso de la intensidad.
    100 = una sesión moderada: 40 min al 50 % de tu capacidad. Cuenta como trabajo para la salud,
    no pide descanso ni mucha carga nerviosa. Lo suave queda debajo de 100; lo intenso sube rápido
    (el peso de la intensidad crece en exponencial, como el pulso y el cansancio).

    1. Intensidad (MET) de la sesión:
       - Plano según la velocidad: ACSM para caminar y correr (caminar a más de 7 km/h se cuenta
         como trote), Compendio de actividades físicas para bici, natación y deportes de juego.
       - Desnivel: el oxígeno de subir el cuerpo (ACSM: 1,8 ml/kg por metro a pie y en bici;
         0,9 corriendo), repartido en el tiempo de la sesión.
       - Sin tiempo: el que tardaría tu cuerpo a su ritmo esperado (Naismith alarga con la subida).
    2. Capacidad (MET máximo) según el cuerpo: fórmula sin ejercicio de Jackson (edad, IMC, sexo),
       como alguien que entrena con regularidad. Tu nivel mueve la capacidad solo a la mitad (pesa poco).
    3. x = (MET − 1) ÷ (capacidad − 1)  → % de tu reserva. Carga por minuto = x · a · e^(b·x)
       (Banister: hombres a 0,64 b 1,92; mujeres a 0,86 b 1,67), escalada para que 40 min a x = 0,5 = 100.
    4. Carga = 100 × (TRIMP ÷ el de la sesión moderada)^0,6: lo largo y lo intenso suben, pero sin dispararse.
       Al final, ajuste por deporte: bici +5 %, caminar +12 %, el resto +10 %.
    Ejemplos (hombre de 30, 75 kg): 45 min caminando ≈ 45 · bici 9 km/1 h/+200 m ≈ 85 · bici 15 km/50 min ≈ 105 ·
    correr 5 km/30 min ≈ 150 · correr 10 km/1 h ≈ 225 · bici 40 km/2 h/+600 m ≈ 325.

    Cada registro guarda el cuerpo de ese día (bp), para que bajar de peso no cambie el historial.
    Los que no lo tienen usan el perfil actual.
========================================================= */

/* Salida típica = 75 % de la tabla (solo para las pistas "Típico ..." al registrar) */
const SPORT_REF_FACTOR = 0.75;

/* ref: salida típica de la tabla para la persona de referencia (hombre, 30 años, 175 cm, 75 kg).
   Sin "km" o "up" = ese dato no aplica a ese deporte */
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

/* Ritmo en plano de la persona de referencia (hombre, 30 años, 175 cm, 75 kg) y cuánto lo mueve cada dato
   del cuerpo; se usa para el tiempo esperado cuando no se pone tiempo.
   v: km/h · up: km planos por cada 100 m de subida, para el TIEMPO (Naismith/Scarf) · o2: ml/kg por metro
   subido (ACSM) · sex: mujer × · age: −x por año pasados los 30 · bmi: −x por punto de IMC fuera de 18,5–25 ·
   h: (altura ÷ 175)^h · met: MET del Compendio para los de juego (en ellos "v" = km por hora de partido) */
const SPORT_PACE = {
    run:    { v: 10,      up: 0.8, o2: 0.9, sex: 0.88, age: 0.007, bmi: 0.025, h: 0.3 },
    walk:   { v: 5,       up: 0.8, o2: 1.8, sex: 0.96, age: 0.004, bmi: 0.010, h: 0.5 },
    bike:   { v: 20,      up: 2,   o2: 1.8, sex: 0.88, age: 0.006, bmi: 0.012, h: 0 },
    swim:   { v: 2,       up: 0,   o2: 0,   sex: 0.92, age: 0.006, bmi: 0.008, h: 0.3 },
    soccer: { v: 8 / 1.5, up: 0,   o2: 0,   sex: 0.92, age: 0.006, bmi: 0.015, h: 0.2, met: 7 },
    basket: { v: 4,       up: 0,   o2: 0,   sex: 0.92, age: 0.006, bmi: 0.015, h: 0.2, met: 6.5 },
    tennis: { v: 3,       up: 0,   o2: 0,   sex: 0.92, age: 0.006, bmi: 0.015, h: 0.2, met: 6.8 },
    volley: { v: 1,       up: 0,   o2: 0,   sex: 0.92, age: 0.006, bmi: 0.015, h: 0.2, met: 4 },
    custom: { v: 5,       up: 0.8, o2: 1.8, sex: 0.92, age: 0.006, bmi: 0.015, h: 0.2, met: 5 }
};

/* MET (totales) en plano a una velocidad v en km/h. Juego: su MET, que sube o baja un poco si se recorrió
   más o menos distancia por minuto que lo esperado (relV) */
function sportFlatMet(k, v, relV = 1) {
    const mmin = v * 1000 / 60;
    if (k === "run" || (k === "walk" && v > 7)) return Math.max(6, (0.2 * mmin + 3.5) / 3.5);   /* ACSM: 10 km/h ≈ 10,5 */
    if (k === "walk") return Math.max(2, (0.1 * mmin + 3.5) / 3.5);    /* ACSM: 5 km/h ≈ 3,4 */
    if (k === "bike") return Math.max(3.5, 0.45 * v - 1.3);            /* Compendio: paseo ≈ 3,5–4 · 20 km/h ≈ 7,7 · 25 ≈ 10 */
    if (k === "swim") return Math.max(4, 4 * v);                       /* 2 km/h (3 min/100 m) ≈ 8 */
    return 1 + (SPORT_PACE[k].met - 1) * Math.min(1.3, Math.max(0.75, Math.sqrt(relV)));
}
const SPORT_TOO_FAST = 2.2;
/* Banister: carga por minuto a una fracción x de la reserva */
const SPORT_TRIMP = { m: [0.64, 1.92], f: [0.86, 1.67] };
const trimpMin = (x, s) => { const [a, b] = SPORT_TRIMP[s === "f" ? "f" : "m"]; return x * a * Math.exp(b * x); };
const SPORT_MODERATE = { min: 40, x: 0.5 };                     /* = 100 */
/* PA-R 5 (Jackson): hace ejercicio con regularidad, como quien usa esta app.
   Potencia 0,6: el doble de minutos suma ≈ 1,5 veces, no el doble; así una salida de 3 h no se dispara a 1000 */
const SPORT_PAR = 5, SPORT_POW = 0.6;
/* Ajuste final por deporte (comparado con cómo se sienten las sesiones reales): bici +5 %, caminar +12 %, el resto +10 % */
const SPORT_BOOST = { bike: 1.05, walk: 1.12 };
const sportBoost = k => SPORT_BOOST[k] || 1.10;

/* Cuerpo del perfil (sin plan: null → persona de referencia) */
function sportBodyNow() {
    const n = typeof nutrition === "function" ? nutrition() : null;
    const p = n && n.profile;
    if (!p || !(p.height > 0) || !(p.weight > 0)) return null;
    return { s: p.sex === "m" ? "m" : "f", a: Math.round(p.age) || 30, h: p.height, w: p.weight };
}
const sportBody = sp => (sp && sp.bp) || sportBodyNow();
const SPORT_REF_BODY = { s: "m", a: 30, h: 175, w: 75 };

/* Ritmo de este cuerpo ÷ el de referencia (entre 0,4 y 1,2) */
function sportPaceFactor(k, body) {
    const c = SPORT_PACE[k];
    if (!c || !body) return 1;
    const bmi = body.w / ((body.h / 100) ** 2);
    const fBmi = 1 - c.bmi * (Math.max(0, bmi - 25) + Math.max(0, 18.5 - bmi));
    const fAge = 1 - c.age * Math.max(0, body.a - 30);
    const f = (body.s === "f" ? c.sex : 1) * fBmi * fAge * (body.h / 175) ** c.h;
    return Math.min(1.2, Math.max(0.4, f));
}
const sportSpeed = (k, body) => SPORT_PACE[k].v * sportPaceFactor(k, body);     /* km/h en plano */

/* Capacidad (MET máximo): Jackson 1990 sin ejercicio, actividad media (PA-R 3); el nivel cuenta a la mitad */
function sportMaxMet(body) {
    const est = b => {
        const bmi = b.w / ((b.h / 100) ** 2);
        return (56.363 + 1.921 * SPORT_PAR - 0.381 * b.a - 0.754 * bmi + (b.s === "m" ? 10.987 : 0)) / 3.5;
    };
    const ref = est(SPORT_REF_BODY);
    const own = body ? Math.min(20, Math.max(5, est(body))) : ref;
    return ref + 0.5 * (own - ref);
}

/* Tiempo esperado (min) para una distancia con su desnivel a ritmo esperado */
const sportExpectedMin = (k, km, up, body) => ((km || 0) + (up || 0) / 100 * SPORT_PACE[k].up) / sportSpeed(k, body) * 60;

/* Zona según la fracción de la reserva */
const sportZone = x => x < 0.4 ? "suave" : x < 0.6 ? "moderada" : x < 0.85 ? "intensa" : "muy intensa";

/* Cálculo completo de un registro */
function sportPaceDetail(sp) {
    const k = sp.k, body = sportBody(sp), base = sportDef(k).ref, c = SPORT_PACE[k];
    /* solo los datos que aplican al deporte */
    const km = sp.km > 0 && base.km ? sp.km : 0, up = sp.up > 0 && base.up ? sp.up : 0, min = sp.min > 0 ? sp.min : 0;
    const vExp = sportSpeed(k, body);
    const expected = km > 0 || up > 0 ? sportExpectedMin(k, km, up, body) : min;
    const minutes = Math.max(1, min > 0 ? min : expected);
    let v = vExp, tooFast = false;
    if (km > 0 && min > 0) {
        v = km / (min / 60);
        if (v > vExp * SPORT_TOO_FAST) { tooFast = true; v = vExp * SPORT_TOO_FAST; }
    }
    /* minutos en plano: con tiempo, todos (la subida ya va dentro y baja la velocidad); sin tiempo, solo los km */
    const flatMin = min > 0 ? min : (km > 0 ? km / vExp * 60 : (c.met ? minutes : 0));
    const flat = sportFlatMet(k, v, km > 0 && min > 0 ? v / vExp : 1);
    const upMetMin = up * c.o2 / 3.5;                                   /* MET·min extra de subir */
    const met = 1 + ((flat - 1) * flatMin + upMetMin) / minutes;        /* MET promedio de la sesión */
    const max = sportMaxMet(body);
    const x = Math.min(1, Math.max(0, (met - 1) / (max - 1)));
    const sex = body ? body.s : "m";
    const unit = SPORT_MODERATE.min * trimpMin(SPORT_MODERATE.x, sex);
    const kg = body ? body.w : 75;
    return {
        expected, minutes, speed: v, met, x, zone: sportZone(x), tooFast,
        kcal: met * minutes * kg / 60,
        load: Math.pow(minutes * trimpMin(x, sex) / unit, SPORT_POW) * 100 * sportBoost(k)
    };
}

/* Salida típica de este usuario en un deporte ({ min, km, up } según aplique) */
function sportReference(k) {
    const base = sportDef(k).ref, body = sportBodyNow();
    const f = sportPaceFactor(k, body) * SPORT_REF_FACTOR;
    const out = {};
    if (base.km) out.km = base.km * f;
    if (base.up) out.up = base.up * f;
    out.min = base.km ? sportExpectedMin(k, out.km, out.up, body) : base.min * SPORT_REF_FACTOR;
    return out;
}

/* Carga (100 = una sesión moderada de 40 min) */
function sportLoad(sp) {
    const k = sportDef(sp.k).k;
    return sportFields(k).some(({ f }) => sp[f] > 0) ? sportPaceDetail({ ...sp, k }).load : 0;
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

    const sk = sportDef(sport.k).k;
    const who = editing && editing.entry.bp ? editing.entry.bp : sportBodyNow();      /* cuerpo con que se calcula */
    const hints = [];
    const paintLoad = () => {
        const sp = { k: sk, ...vals, bp: who };
        const any = fields.some(({ f }) => vals[f] > 0);
        let sub = "";
        if (any) {
            const d = sportPaceDetail(sp);
            const bits = [`intensidad ${d.zone}`];
            if (vals.km > 0 && !(vals.min > 0)) bits.push(`sin tiempo: ${fmtDuration(d.expected)}`);
            if (vals.km > 0 && vals.min > 0) bits.push(`${fmtNum(d.speed, 1)} km/h`);
            bits.push(`≈ ${fmtNum(Math.round(d.kcal / 10) * 10, 0)} kcal`);
            if (d.tooFast) bits.push("¿seguro? es muy rápido");
            sub = bits.join(" · ");
        }
        load.innerHTML = any ? `Carga <b>${Math.round(sportLoad(sp))}</b><span>${sub}</span><span>100 = 40 min de ejercicio moderado</span>` : `<span>Pon al menos un dato</span>`;
        saveBtn.disabled = !any;
        hints.forEach(fn => fn());
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
            /* con distancia, el tiempo muestra el esperado para esa distancia y desnivel */
            if (field.f === "min" && (vals.km > 0)) {
                hint.textContent = `Esperado ${fmtDuration(sportPaceDetail({ k: sk, km: vals.km, up: vals.up, bp: who }).expected)}`;
            } else {
                const r = field.f === "km" ? Math.round(ref.km * 2) / 2 : field.f === "min" ? Math.round(ref.min / 5) * 5 : Math.round(ref.up / 5) * 5;
                hint.textContent = `Típico ${field.fmt(r)}`;
            }
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
        hints.push(paintHint);
        paintHint();
        col.append(label, up, box, down, hint);
        return col;
    });
    grid.append(...cols);

    saveBtn.onclick = () => {
        const entry = editing ? { ...editing.entry } : { id: newId("sp"), k: sport.k, n: sport.name };
        fields.forEach(({ f }) => { if (vals[f] > 0) entry[f] = vals[f]; else delete entry[f]; });
        if (who) entry.bp = { ...who }; else delete entry.bp;     /* el cuerpo de ese día: bajar de peso no cambia el historial */
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
