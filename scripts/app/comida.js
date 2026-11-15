/* =========================================================
    COMIDA — estado del día, cálculo de porciones y pantalla (datos en comida-datos.js)
========================================================= */

/* ---------- datos ---------- */

const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtNum = (n, d = 1) => Number(n).toLocaleString("es-ES", { maximumFractionDigits: d });

/* Día que se está viendo en Comida (null = hoy); se cambia desde el calendario de calorías */
let foodDate = null;
const foodKey = () => foodDate || dateKey();

function foodEntries(key = foodKey()) {
    return (state.food && state.food.log && state.food.log[key]) || [];
}

function addFoodEntry(entry) {
    state.food ??= { log: {} };
    state.food.log ??= {};
    if (!entry.ts) {
        const now = new Date(), day = foodDate ? parseKey(foodDate) : new Date(now);
        day.setHours(now.getHours(), now.getMinutes(), 0, 0);
        entry.ts = day.getTime();
    }
    (state.food.log[foodKey()] ??= []).push(entry);
    saveState();
}

function updateFoodEntry(id, patch) {
    const entry = foodEntries().find(e => e.id === id);
    if (!entry) return;
    Object.assign(entry, patch);
    saveState();
}

function removeFoodEntry(id) {
    const key = foodKey();
    if (!state.food?.log?.[key]) return;
    state.food.log[key] = state.food.log[key].filter(e => e.id !== id);
    if (!state.food.log[key].length) delete state.food.log[key];
    saveState();
}

/* Calorías del día frente a la meta del plan: ≤60 % rojo, 61-75 % amarillo, 76-120 % verde, ≥121 % rojo.
   Se usa igual en la barra de Comida y en el calendario de calorías. */
function kcalStatus(kcal) {
    const pct = kcal / planKcal() * 100;
    if (pct <= 60) return "red";
    if (pct < 76) return "gold";
    if (pct <= 120) return "green";
    return "red";
}

/* Entradas con calorías propias: comida rápida ("rapida") y el día dado como volumen sucio ("libre") */
const FAST_GROUP = "rapida", FREE_GROUP = "libre";
const ENTRY_COLORS = { [FAST_GROUP]: "#e08a3c", [FREE_GROUP]: "#9b7fd4" };
const hasOwnKcal = e => typeof e.k === "number";
function entryKcal(e) {
    if (hasOwnKcal(e)) return e.p * e.k;
    const g = FOOD_GROUP[e.g];
    return g ? e.p * groupKcal(g) : 0;
}
const entryColor = e => (FOOD_GROUP[e.g] ? FOOD_GROUP[e.g].color : ENTRY_COLORS[e.g] || "#4aa8d8");

/* Equivalencia en porciones (de 0,5 en 0,5) de UNA unidad de comida rápida, a partir de sus macros:
   1) los carbohidratos van a Harinas;
   2) la proteína que queda, a Proteína: Media Grasa mientras la grasa alcance (queso, carne, pollo frito)
      y el resto a Baja Grasa;
   3) la grasa que sobra, a Grasas.
   Así una pizza, una hamburguesa o un sub reparten sus porciones en varios grupos. */
const half = x => Math.round(x * 2) / 2;
function fastPortions(c, p, f) {
    const h = half(c / 15);
    const prot = half(Math.max(0, p - 3 * h) / 7);
    const mg = Math.min(prot, half(Math.max(0, (f - h - prot) / 4)));
    const bg = prot - mg;
    const g = half(Math.max(0, f - h - mg * 5 - bg) / 5);
    const out = {};
    for (const [k, v] of [["h", h], ["bg", bg], ["mg", mg], ["g", g]]) if (v > 0) out[k] = v;
    return out;
}
/* Porciones de una entrada con calorías propias, por la cantidad registrada:
   la equivalencia guardada al registrar; si no tiene (registros anteriores), la del catálogo;
   y si el producto ya no está, el reparto aproximado. El "volumen sucio" no tiene porciones. */
function unitPortions(e) {
    if (e.pt && typeof e.pt === "object") return e.pt;
    if (e.g === FAST_GROUP) {
        const hit = FAST_FOOD_BY_KEY.get(e.n);
        if (hit && hit.item[7]) return hit.item[7];
        if (typeof e.mc === "number") return fastPortions(e.mc, e.mp || 0, e.mf || 0);
    }
    return {};
}
const entryPortions = e => Object.fromEntries(Object.entries(unitPortions(e)).map(([k, v]) => [k, v * e.p]));
/* Flechas de 1 en 1; las medias porciones se escriben (0,5 · 1,5 · 2,5…) */
const stepByOne = (q, dir, allowZero = false) => {
    const n = Math.round((q + dir) * 100) / 100;
    if (n >= 0.5) return n;
    return allowZero ? 0 : q;      /* al corregir algo ya agregado se puede bajar a 0 para quitarlo */
};
/* "2,5 harinas · 1 prot. MG · 1 grasa" */
const PORTION_SHORT = {
    h: ["harina", "harinas"], bg: ["prot. BG", "prot. BG"], mg: ["prot. MG", "prot. MG"], g: ["grasa", "grasas"],
    v: ["vegetal", "vegetales"], fr: ["fruta", "frutas"], l: ["lácteo", "lácteos"]
};
const portionsText = pt => Object.entries(pt).map(([k, v]) => `${fmtNum(v, 1)} ${PORTION_SHORT[k][v <= 1 ? 0 : 1]}`).join(" · ");

function foodTotals(entries) {
    const portions = {};
    let kcal = 0, c = 0, p = 0, f = 0;
    entries.forEach(e => {
        if (hasOwnKcal(e)) {
            kcal += e.p * e.k;
            c += e.p * (e.mc || 0);
            p += e.p * (e.mp || 0);
            f += e.p * (e.mf || 0);
            for (const [k, v] of Object.entries(entryPortions(e))) portions[k] = (portions[k] || 0) + v;
            return;
        }
        const g = FOOD_GROUP[e.g];
        if (!g) return;
        portions[e.g] = (portions[e.g] || 0) + e.p;
        kcal += e.p * groupKcal(g);
        c += e.p * g.c;
        p += e.p * g.p;
        f += e.p * g.f;
    });
    return { portions, kcal, c, p, f };
}

/* ---------- pantalla ---------- */

function renderFood() {
    const root = document.getElementById("foodContent");
    if (!root) return;

    if (!nutrition()) {
        root.innerHTML = `
            <div class="food-summary food-setup">
                <h3>Antes de empezar</h3>
                <p>Responde unas preguntas (edad, género, altura, peso, ejercicio y grasa corporal) para calcular tus calorías de mantenimiento, tu peso ideal y tu potencial muscular. Luego eliges tu objetivo y tu tipo de dieta.</p>
                <button class="food-start" data-act="test">Empezar test TDEE</button>
            </div>`;
        return;
    }

    const plan = nutritionPlan();
    const n = nutrition();
    const kcalGoal = plan.kcal;
    const entries = foodEntries();
    const t = foodTotals(entries);
    const pct = Math.min(100, (t.kcal / kcalGoal) * 100);
    const mlHave = entries.reduce((s, e) => s + entryWaterMl(e), 0);
    const hasFood = entries.some(e => e.g !== "agua");
    const dayGiven = entries.some(e => e.g === FREE_GROUP);

    const chip = g => {
        const have = t.portions[g.k] || 0;
        const goal = groupGoal(g);
        const ratio = goal ? Math.min(100, (have / goal) * 100) : (have > 0 ? 100 : 0);
        const over = goal && have > goal;
        return `<button class="food-chip${over ? " over" : ""}" data-g="${g.k}" style="--c:${g.color}">
            <span class="fc-name">${g.name}</span>
            <span class="fc-val"><b>${fmtNum(have)}</b>${goal ? ` / ${fmtNum(goal)}` : ""}</span>
            <i style="width:${ratio}%"></i>
        </button>`;
    };
    const waterChip = `<button class="food-chip" data-water="1" style="--c:#4aa8d8">
            <span class="fc-name">Agua</span>
            <span class="fc-val"><b>${fmtNum(mlHave / 1000, 2)}</b> / ${fmtNum(plan.water / 1000, 2)} L</span>
            <i style="width:${Math.min(100, mlHave / plan.water * 100)}%"></i>
        </button>`;
    const top = FOOD_GROUPS.slice(0, -1).map(chip).join("");
    const last = FOOD_GROUPS[FOOD_GROUPS.length - 1];

    root.innerHTML = `
        <div class="food-summary">
            <div class="food-kcal"><b>${fmtNum(t.kcal, 0)}</b><span>/ ${fmtNum(kcalGoal, 0)} kcal</span></div>
            <div class="food-bar-row">
                <div class="food-bar"><i class="${hasFood ? kcalStatus(t.kcal) : ""}" style="width:${pct}%"></i></div>
                <button class="food-done${dayGiven ? " on" : ""}" data-act="done" aria-label="${dayGiven ? "Quitar el día dado (volumen sucio)" : "Dar el día: completar las calorías que faltan como volumen sucio"}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>
                </button>
            </div>
            <div class="food-macros">
                <span>Carbohidratos <b>${fmtNum(t.c, 0)} / ${fmtNum(plan.macros.c, 0)} g</b></span>
                <span>Proteína <b>${fmtNum(t.p, 0)} / ${fmtNum(plan.macros.p, 0)} g</b></span>
                <span>Grasa <b>${fmtNum(t.f, 0)} / ${fmtNum(plan.macros.f, 0)} g</b></span>
            </div>
            <div class="food-plan-row">
                <button class="food-plan" data-act="goal" aria-label="Cambiar objetivo: ${GOALS[n.goal].short}">
                    <span><small>Objetivo</small><b>${GOALS[n.goal].short}</b></span><i aria-hidden="true">›</i>
                </button>
                <button class="food-plan" data-act="diet" aria-label="Cambiar dieta: ${DIETS[n.diet].short}">
                    <span><small>Dieta</small><b>${DIETS[n.diet].short}</b></span><i aria-hidden="true">›</i>
                </button>
            </div>
            <button class="food-plan" data-act="calib" aria-label="Calibración: ver, repetir o reiniciar el test TDEE">
                <span><small>Calibración</small><b>TDEE ${fmtNum(calcTDEE(n.profile).tdee, 0)} kcal</b></span><i aria-hidden="true">⚙</i>
            </button>
        </div>
        <div class="food-groups">${top}</div>
        <div class="food-groups">${chip(last)}${waterChip}</div>
        <button class="square-card add-square add-wide food-add" data-add="1"><span class="add-square-plus">+</span><small>Comida</small></button>
        <button class="food-hist-btn" data-act="hist">Ver historial${foodDate ? "" : " de hoy"} <small>${entries.length ? `(${entries.length})` : ""}</small></button>`;
    if (foodHistoryRedraw) foodHistoryRedraw();
}
