/* =========================================================
    DEPORTES → "carga" (100 = una salida normal para ti)

    Correr, ciclismo, caminar y nadar (SPORT_PACE): manda la DISTANCIA y el tiempo la corrige.
    - El desnivel se pasa a km planos con la regla de Naismith/Scarf (caminar y correr: 100 m de
      subida ≈ 0,8 km; ciclismo ≈ 2 km, ya contando que la bajada devuelve parte del tiempo).
      Distancia equivalente = km + desnivel en km planos. La carga = distancia equivalente ÷ la normal.
    - Ritmo esperado según el cuerpo: altura, peso, sexo y edad (no las calorías). Con él sale el
      tiempo esperado para esa distancia (el desnivel lo alarga, como en la regla).
    - Sin tiempo: se toma el esperado (sin cambio). Con tiempo: más rápido sube la carga y más lento
      la baja, en curva S: cerca del esperado casi no cambia, luego se nota y al final se frena.
      Topes: hasta +40 % (muy rápido) y −30 % (muy lento).
    - La salida normal dura lo mismo para todos (≈ 34 min corriendo); lo que cambia es cuánta
      distancia es, según el ritmo de cada cuerpo.
    - Cada registro guarda el cuerpo de ese día (bp), para que bajar de peso no cambie el historial.
      Los que no lo tienen usan el perfil actual.

    Fútbol, básquetbol, tenis, voleibol y "Otro": como antes (cada dato ÷ normal, promediados), con la
    normal escalada por las calorías de mantenimiento. Referencias para 2400 kcal.
========================================================= */

const SPORT_BASE_KCAL = 2400;
/* La salida normal es una que se hace en un día y aún queda para otra actividad: 25 % menos que la tabla.
   Cambia la carga de todo lo registrado también (la carga se calcula al mostrarla, no se guarda). */
const SPORT_REF_FACTOR = 0.75;

/* ref: salida normal de la tabla. Sin "km" o "up" = ese dato no aplica a ese deporte.
   Correr, ciclismo, caminar y nadar: km y up son para la persona de referencia (su tiempo sale del ritmo, "min" no se usa).
   Los demás: para 2400 kcal de mantenimiento */
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

/* Ritmo en plano de la persona de referencia (hombre, 30 años, 175 cm, 75 kg) y cuánto lo mueve cada dato del cuerpo.
   v: km/h · up: km planos por cada 100 m de subida · sex: mujer × · age: −x por año pasados los 30 ·
   bmi: −x por punto de IMC fuera de 18,5–25 · h: (altura ÷ 175)^h (piernas más largas, paso más largo) */
const SPORT_PACE = {
    run:  { v: 10, up: 0.8, sex: 0.88, age: 0.007, bmi: 0.025, h: 0.3 },
    walk: { v: 5,  up: 0.8, sex: 0.96, age: 0.004, bmi: 0.010, h: 0.5 },
    bike: { v: 25, up: 2,   sex: 0.88, age: 0.006, bmi: 0.012, h: 0 },
    swim: { v: 2,  up: 0,   sex: 0.92, age: 0.006, bmi: 0.008, h: 0.3 }
};
const SPORT_FAST_MAX = 0.4, SPORT_SLOW_MAX = 0.3, SPORT_PACE_CURVE = 0.45;

/* Cuerpo del perfil (sin plan: null → persona de referencia) */
function sportBodyNow() {
    const n = typeof nutrition === "function" ? nutrition() : null;
    const p = n && n.profile;
    if (!p || !(p.height > 0) || !(p.weight > 0)) return null;
    return { s: p.sex === "m" ? "m" : "f", a: Math.round(p.age) || 30, h: p.height, w: p.weight };
}
const sportBody = sp => (sp && sp.bp) || sportBodyNow();

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

/* Distancia equivalente en plano (km + desnivel pasado a km) */
const sportEqKm = (k, km, up) => (km || 0) + (up || 0) / 100 * SPORT_PACE[k].up;

/* Curva S del ritmo: r = tiempo esperado ÷ tiempo puesto (>1 = más rápido) */
function sportPaceMult(r) {
    if (!(r > 0)) return 1;
    const x = Math.log(r);
    const g = 1 - Math.exp(-((x / SPORT_PACE_CURVE) ** 2));
    return x >= 0 ? 1 + SPORT_FAST_MAX * g : 1 - SPORT_SLOW_MAX * g;
}

/* Detalle del cálculo de un registro de correr/ciclismo/caminar/nadar */
function sportPaceDetail(sp) {
    const k = sp.k, body = sportBody(sp), base = sportDef(k).ref;
    const v = sportSpeed(k, body), f = sportPaceFactor(k, body) * SPORT_REF_FACTOR;
    const refEq = sportEqKm(k, base.km, base.up) * f;
    const km = sp.km > 0 ? sp.km : 0, up = sp.up > 0 ? sp.up : 0, min = sp.min > 0 ? sp.min : 0;
    let eq, expected, mult = 1;
    if (km > 0) {
        eq = sportEqKm(k, km, up);
        expected = eq / v * 60;
        if (min > 0) mult = sportPaceMult(expected / min);
    } else if (min > 0) {
        eq = min / 60 * v;               /* solo tiempo: la distancia que se hace en ese tiempo (con la subida dentro) */
        expected = min;
    } else {
        eq = sportEqKm(k, 0, up);        /* solo desnivel */
        expected = eq / v * 60;
    }
    return {
        eq, refEq, expected, mult, speed: v,
        tooFast: km > 0 && min > 0 && expected / min > 2.2,
        load: refEq > 0 ? eq / refEq * 100 * mult : 0
    };
}

/* Escala de la salida normal de los deportes de juego: mantenimiento del plan ÷ 2400 (sin plan: 1) */
function sportScale() {
    const n = typeof nutrition === "function" ? nutrition() : null;
    if (!n) return 1;
    const tdee = calcTDEE(n.profile).tdee;
    return Math.min(2, Math.max(0.5, tdee / SPORT_BASE_KCAL));
}

/* Salida normal de este usuario en un deporte ({ min, km, up } según aplique) */
function sportReference(k) {
    const base = sportDef(k).ref;
    if (SPORT_PACE[k]) {
        const body = sportBodyNow();
        const f = sportPaceFactor(k, body) * SPORT_REF_FACTOR;
        const out = { min: sportEqKm(k, base.km, base.up) * f / sportSpeed(k, body) * 60, km: base.km * f };
        if (base.up) out.up = base.up * f;
        return out;
    }
    const f = sportScale() * SPORT_REF_FACTOR;
    const out = {};
    for (const key in base) out[key] = base[key] * f;
    return out;
}

/* Deportes de juego: puntaje de cada dato puesto (dato ÷ normal × 100) */
function sportParts(sp) {
    const ref = sportReference(sp.k);
    return SPORT_FIELDS.filter(({ f }) => sp[f] > 0 && ref[f]).map(({ f }) => ({ f, pct: sp[f] / ref[f] * 100 }));
}

/* Carga (normal = 100) */
function sportLoad(sp) {
    if (SPORT_PACE[sp.k]) return (sp.min > 0 || sp.km > 0 || sp.up > 0) ? sportPaceDetail(sp).load : 0;
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

    const pace = !!SPORT_PACE[sport.k];
    const who = editing && editing.entry.bp ? editing.entry.bp : sportBodyNow();      /* cuerpo con que se calcula */
    const hints = [];
    const paintLoad = () => {
        const sp = { k: sport.k, ...vals, bp: who };
        let any, sub = "";
        if (pace) {
            any = fields.some(({ f }) => vals[f] > 0);
            if (any) {
                const d = sportPaceDetail(sp);
                const pct = Math.round((d.mult - 1) * 100);
                sub = vals.km > 0 && vals.min > 0
                    ? `Esperado ${fmtDuration(d.expected)} · ritmo ${pct > 0 ? "+" : ""}${pct} %${d.tooFast ? " · ¿seguro? es muy rápido" : ""}`
                    : vals.km > 0 ? `Sin tiempo: se toma el esperado, ${fmtDuration(d.expected)}` : vals.min > 0 ? "Solo tiempo: sin ajuste de ritmo" : "Solo desnivel";
            }
        } else {
            const parts = sportParts(sp);
            any = parts.length > 0;
            sub = parts.length === 1 ? "con 1 dato" : `promedio de ${parts.length} datos: ${parts.map(p => Math.round(p.pct)).join(" · ")}`;
        }
        load.innerHTML = any ? `Carga <b>${Math.round(sportLoad(sp))}</b><span>${sub}</span>` : `<span>Pon al menos un dato</span>`;
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
            if (pace && field.f === "min" && (vals.km > 0)) {
                hint.textContent = `Esperado ${fmtDuration(sportPaceDetail({ k: sport.k, km: vals.km, up: vals.up, bp: who }).expected)}`;
            } else {
                const r = field.f === "km" ? Math.round(ref.km * 2) / 2 : field.f === "min" ? Math.round(ref.min / 5) * 5 : Math.round(ref.up / 5) * 5;
                hint.textContent = `Normal ${field.fmt(r)}`;
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
        if (pace && who) entry.bp = { ...who }; else delete entry.bp;     /* el cuerpo de ese día: bajar de peso no cambia el historial */
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
