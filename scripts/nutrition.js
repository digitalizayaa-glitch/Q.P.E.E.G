/* =========================================================
    NUTRICIÓN: test TDEE, objetivo (mantener / bulking / cutting) y tipo de dieta.
    Se guarda en state.nutrition = { profile, goal, diet }.
    El test se hace una sola vez; el objetivo y la dieta se cambian cuando quieras.
    Todo son estimaciones orientativas, no consejo médico.
========================================================= */

const ACTIVITY = [
    { k: 1.2,   name: "Sedentario",         sub: "Poco o nada de ejercicio" },
    { k: 1.375, name: "Ligero",             sub: "1-3 días de ejercicio por semana" },
    { k: 1.55,  name: "Moderado",           sub: "3-5 días por semana" },
    { k: 1.725, name: "Intenso",            sub: "6-7 días por semana" },
    { k: 1.9,   name: "Muy intenso",        sub: "Entrenas 2 veces al día o trabajo físico pesado" }
];
const GOALS = {
    maintain: { name: "Mantener peso", short: "Mantener", factor: 1,    sub: "Calorías de mantenimiento" },
    bulk:     { name: "Bulking",       short: "Bulking",  factor: 1.10, sub: "+10 % para ganar músculo" },
    cut:      { name: "Cutting",       short: "Cutting",  factor: 0.80, sub: "−20 % para perder grasa" }
};
const DIETS = {
    mod:  { name: "Carbohidratos moderados", short: "Moderada",  sub: "Equilibrada (plan base)",              mult: { h: 1,    bg: 1,    mg: 1,   g: 1,   v: 1 } },
    high: { name: "Muchos carbohidratos",    short: "Alta en carbos", sub: "Más harinas, menos grasa",          mult: { h: 1.2,  bg: 1,    mg: 0.8, g: 0.7, v: 1 } },
    low:  { name: "Pocos carbohidratos",     short: "Baja en carbos", sub: "Menos harinas, más proteína y grasa", mult: { h: 0.55, bg: 1.15, mg: 1.4, g: 1.5, v: 1.3 } }
};

const nutrition = () => state.nutrition && state.nutrition.profile ? state.nutrition : null;

function calcTDEE(p) {
    const h = p.height / 100;
    const bmi = p.weight / (h * h);
    const male = p.sex === "m";
    const bfKnown = typeof p.bf === "number";
    const bf = bfKnown ? p.bf : Math.max(5, 1.2 * bmi + 0.23 * p.age - (male ? 10.8 : 0) - 5.4);
    const lean = p.weight * (1 - bf / 100);
    const bmr = bfKnown ? 370 + 21.6 * lean : 10 * p.weight + 6.25 * p.height - 5 * p.age + (male ? 5 : -161);
    const tdee = bmr * p.activity;

    const ideal = 22 * h * h;
    const leanMax = (p.height - 100) * 0.95 * (male ? 1 : 0.85);
    const bfTarget = male ? 0.10 : 0.18;
    return {
        bmr, tdee, bf, bfKnown, lean,
        ideal, idealMin: 20 * h * h, idealMax: 24.9 * h * h,
        leanMax, weightAtMax: leanMax / (1 - bfTarget), bfTarget,
        muscleLeft: Math.max(0, leanMax - lean)
    };
}

/* Plan del día: calorías objetivo y porciones por grupo según objetivo y dieta */
function nutritionPlan() {
    const n = nutrition();
    if (!n) return null;
    const t = calcTDEE(n.profile);
    const kcal = Math.round(t.tdee * GOALS[n.goal].factor / 10) * 10;
    const mult = DIETS[n.diet].mult;
    const raw = {};
    let sum = 0;
    FOOD_GROUPS.forEach(g => {
        if (!g.goal) return;
        raw[g.k] = g.goal * (mult[g.k] || 1);
        sum += raw[g.k] * groupKcal(g);
    });
    const goals = {};
    for (const k in raw) goals[k] = Math.max(1, Math.round(raw[k] * kcal / sum * 2) / 2);
    return { kcal, goals, water: Math.round(n.profile.weight * 35 / 250) * 250 };
}

/* ---------- ayudas de interfaz ---------- */

/* Devuelve el valor elegido, o null si se cierra la ventana */
const choose = (title, items) => new Promise(resolve =>
    openPicker({ title, groups: [{ items }], onPick: resolve, onCancel: () => resolve(null) }));

const numAsk = (title, label, min, max, extra = {}) => askText({
    title, label, inputMode: "decimal", maxLength: 5, confirmLabel: "Siguiente", ...extra,
    validate: text => {
        const v = parseFloat(text.replace(",", "."));
        return isFinite(v) && v >= min && v <= max ? "" : `Escribe un número entre ${min} y ${max}.`;
    }
});
const toNum = text => parseFloat(String(text).replace(",", "."));

function describeResult(n) {
    const p = n.profile, t = calcTDEE(p);
    const f = (x, d = 0) => fmtNum(x, d);
    const lines = [
        `Calorías de mantenimiento: ${f(t.tdee)} kcal/día`,
        `Metabolismo basal: ${f(t.bmr)} kcal`,
        `Peso ideal: ${f(t.ideal, 1)} kg (rango sano ${f(t.idealMin, 1)}–${f(t.idealMax, 1)} kg)`,
        `Máximo potencial muscular: ${f(t.leanMax, 1)} kg de masa magra, unos ${f(t.weightAtMax, 1)} kg de peso con ${Math.round(t.bfTarget * 100)} % de grasa.`
    ];
    lines.push(t.bfKnown
        ? `Tu masa magra actual: ${f(t.lean, 1)} kg → te faltan ≈ ${f(t.muscleLeft, 1)} kg de músculo.`
        : `Grasa corporal estimada: ${f(t.bf, 0)} % (no la indicaste).`);
    return lines.join("\n");
}

/* ---------- test TDEE ---------- */

async function runTdeeTest() {
    const age = await numAsk("Edad", "¿Cuántos años tienes?", 14, 90, { inputMode: "numeric" });
    if (age === null) return false;

    const sex = await choose("Género", [{ label: "Hombre", value: "m" }, { label: "Mujer", value: "f" }]);
    if (sex === null) return false;
    const height = await numAsk("Altura", "Altura en centímetros", 120, 230, { inputMode: "numeric" });
    if (height === null) return false;
    const weight = await numAsk("Peso", "Peso en kilogramos", 30, 250);
    if (weight === null) return false;

    const activity = await choose("Ejercicio", ACTIVITY.map(a => ({ label: a.name, sub: a.sub, value: a.k })));
    if (activity === null) return false;
    const bfText = await numAsk("Grasa corporal", "% de grasa corporal (déjalo vacío si no lo sabes)", 3, 60, { allowEmpty: true, confirmLabel: "Calcular" });
    if (bfText === null) return false;

    const profile = { age: toNum(age), sex, height: toNum(height), weight: toNum(weight), activity, bf: bfText === "" ? null : toNum(bfText) };
    state.nutrition = { profile, goal: state.nutrition?.goal || "maintain", diet: state.nutrition?.diet || "mod" };

    /* se guarda ya: si luego se cierra la elección de objetivo o dieta, quedan los valores por defecto */
    saveState();
    renderFood();
    await showMessage({ title: "Tu resultado", message: describeResult(state.nutrition) });
    const goal = await chooseGoal(true);
    if (goal) await chooseDiet(true);
    return true;
}

async function chooseGoal(first) {
    const g = await choose(first ? "¿Cuál es tu objetivo?" : "Cambiar objetivo",
        Object.entries(GOALS).map(([k, v]) => ({ label: v.name, sub: v.sub, value: k })));
    if (g) { state.nutrition.goal = g; saveState(); renderFood(); }
    return g;
}

async function chooseDiet(first) {
    const d = await choose(first ? "¿Qué tipo de dieta prefieres?" : "Cambiar dieta",
        Object.entries(DIETS).map(([k, v]) => ({ label: v.name, sub: v.sub, value: k })));
    if (d) { state.nutrition.diet = d; saveState(); renderFood(); }
    return d;
}

function openPlanMenu() {
    const n = nutrition();
    if (!n) return;
    openPicker({
        title: "Plan de nutrición",
        groups: [{ items: [
            { label: `Objetivo: ${GOALS[n.goal].short}`, sub: "Mantener, bulking o cutting", value: "goal" },
            { label: `Dieta: ${DIETS[n.diet].short}`, sub: "Carbohidratos altos, moderados o bajos", value: "diet" },
            { label: "Ver mi TDEE", sub: "Mantenimiento, peso ideal y potencial", value: "info" },
            { label: "Repetir el test", sub: "Actualiza edad, peso, ejercicio…", value: "test" },
            { label: "Reiniciar plan", sub: "Borra el test (el historial se conserva)", value: "reset" }
        ] }],
        onPick: async v => {
            if (v === "goal") chooseGoal(false);
            else if (v === "diet") chooseDiet(false);
            else if (v === "info") showMessage({ title: "Tu TDEE", message: describeResult(n) });
            else if (v === "test") runTdeeTest();
            else if (v === "reset" && await askConfirm({ title: "Reiniciar plan", message: "Se borrará el test, el objetivo y la dieta. Tu historial de comidas se mantiene.", confirmLabel: "Reiniciar" })) {
                state.nutrition = null; saveState(); renderFood();
            }
        }
    });
}
