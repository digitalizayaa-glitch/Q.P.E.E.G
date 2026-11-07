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

/* ---------- test TDEE: todas las preguntas en una sola ventana ---------- */

const TDEE_FIELDS = [
    { k: "age",    label: "Edad",           unit: "años", min: 14,  max: 90,  mode: "numeric" },
    { k: "weight", label: "Peso",           unit: "kg",   min: 30,  max: 250, mode: "decimal" },
    { k: "height", label: "Altura",         unit: "cm",   min: 120, max: 230, mode: "numeric" },
    { k: "bf",     label: "Grasa corporal", unit: "%",    min: 3,   max: 60,  mode: "decimal", optional: true }
];

function runTdeeTest() {
    const old = nutrition()?.profile || {};
    const { sheet, close } = openSheet("tdee-sheet", "Test TDEE");

    const form = document.createElement("form");
    form.className = "tdee-form";
    form.noValidate = true;

    const row = (labelText, control) => {
        const label = document.createElement("div");
        label.className = "tdee-label";
        label.innerHTML = labelText;
        const wrap = document.createElement("div");
        wrap.className = "tdee-control";
        wrap.append(...control);
        form.append(label, wrap);
    };

    /* Género */
    const sexes = [["m", "Hombre"], ["f", "Mujer"]].map(([value, text]) => {
        const l = document.createElement("label");
        l.className = "tdee-radio";
        l.innerHTML = `<input type="radio" name="sex" value="${value}"${(old.sex || "m") === value ? " checked" : ""}> ${text}`;
        return l;
    });
    row("Género", sexes);

    const error = document.createElement("div");
    error.className = "dialog-error tdee-error";

    const select = document.createElement("select");
    select.className = "tdee-select";
    select.setAttribute("aria-label", "Ejercicio");
    ACTIVITY.forEach(a => {
        const o = document.createElement("option");
        o.value = a.k;
        o.textContent = `${a.name} (${a.sub})`;
        o.selected = old.activity ? old.activity === a.k : a.k === 1.55;
        select.appendChild(o);
    });

    /* Números (el ejercicio va después de la altura) */
    const inputs = {};
    TDEE_FIELDS.forEach(f => {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "tdee-input";
        input.inputMode = f.mode;
        input.maxLength = 5;
        input.autocomplete = "off";
        input.setAttribute("aria-label", f.label);
        if (typeof old[f.k] === "number") input.value = String(old[f.k]).replace(".", ",");
        input.addEventListener("input", () => { input.classList.remove("bad"); error.textContent = ""; });
        inputs[f.k] = input;
        const unit = document.createElement("span");
        unit.className = "tdee-unit";
        unit.textContent = f.unit;
        row(f.optional ? `${f.label}<small>(opcional)</small>` : f.label, [input, unit]);
        if (f.k === "height") row("Ejercicio", [select]);
    });

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "dialog-btn accept tdee-submit";
    submit.textContent = "Calcular";
    form.append(error, submit);
    sheet.appendChild(form);

    form.addEventListener("submit", e => {
        e.preventDefault();
        const values = {};
        for (const f of TDEE_FIELDS) {
            const text = inputs[f.k].value.trim();
            if (!text && f.optional) { values[f.k] = null; continue; }
            const v = parseFloat(text.replace(",", "."));
            if (!isFinite(v) || v < f.min || v > f.max) {
                inputs[f.k].classList.add("bad");
                inputs[f.k].focus();
                error.textContent = `${f.label}: escribe un número entre ${f.min} y ${f.max}.`;
                return;
            }
            values[f.k] = v;
        }
        const profile = {
            age: values.age, sex: form.querySelector("input[name=sex]:checked").value,
            height: values.height, weight: values.weight, activity: parseFloat(select.value), bf: values.bf
        };
        state.nutrition = { profile, goal: state.nutrition?.goal || "maintain", diet: state.nutrition?.diet || "mod" };
        saveState();
        renderFood();
        close();
        showTdeeResult();
    });
}

/* ---------- resultado: cada dato en su propia sección ---------- */

function showTdeeResult() {
    const n = nutrition();
    if (!n) return;
    const t = calcTDEE(n.profile);
    const f = (x, d = 0) => fmtNum(x, d);
    const { sheet, close } = openSheet("tdee-result", "Tu resultado");

    const card = (title, value, lines, main) => {
        const c = document.createElement("section");
        c.className = "tdee-card" + (main ? " main" : "");
        c.innerHTML = `<h4>${title}</h4><div class="tdee-value">${value}</div>${lines.map(l => `<p>${l}</p>`).join("")}`;
        return c;
    };

    const grid = document.createElement("div");
    grid.className = "tdee-cards";
    grid.append(
        card("Calorías de mantenimiento", `${f(t.tdee)} <small>kcal/día</small>`, [`Metabolismo basal: ${f(t.bmr)} kcal`], true),
        card("Peso ideal", `${f(t.ideal, 1)} <small>kg</small>`, [`Rango sano: ${f(t.idealMin, 1)}–${f(t.idealMax, 1)} kg`]),
        card("Grasa corporal", `${f(t.bf, 0)} <small>%</small>`, [t.bfKnown ? `Masa magra: ${f(t.lean, 1)} kg` : "Estimada (no la indicaste)"]),
        card("Máximo potencial muscular", `${f(t.leanMax, 1)} <small>kg de masa magra</small>`, [
            `Unos ${f(t.weightAtMax, 1)} kg de peso con ${Math.round(t.bfTarget * 100)} % de grasa.`,
            ...(t.bfKnown ? [`Te faltan ≈ ${f(t.muscleLeft, 1)} kg de músculo.`] : [])
        ], true)
    );
    sheet.appendChild(grid);

    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "dialog-btn accept tdee-submit";
    ok.textContent = "Entendido";
    ok.onclick = close;
    sheet.appendChild(ok);
}

/* ---------- plan: objetivo, dieta y opciones del test (botón bajo la línea de calorías) ---------- */

function openPlanMenu() {
    if (!nutrition()) return;
    const { sheet, close } = openSheet("settings-sheet plan-sheet", "Plan de nutrición");

    const choice = (title, key, options) => {
        const label = document.createElement("div");
        label.className = "settings-label";
        label.textContent = title;
        const seg = document.createElement("div");
        seg.className = "seg";
        const sub = document.createElement("div");
        sub.className = "plan-sub";
        const paint = () => {
            seg.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b.dataset.v === state.nutrition[key]));
            sub.textContent = options[state.nutrition[key]].sub;
        };
        Object.entries(options).forEach(([k, v]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "seg-btn";
            b.dataset.v = k;
            b.textContent = v.short;
            b.onclick = () => { state.nutrition[key] = k; saveState(); renderFood(); paint(); };
            seg.appendChild(b);
        });
        paint();
        sheet.append(label, seg, sub);
    };
    choice("Objetivo", "goal", GOALS);
    choice("Tipo de dieta", "diet", DIETS);

    const label = document.createElement("div");
    label.className = "settings-label";
    label.textContent = "Test TDEE";
    const actions = document.createElement("div");
    actions.className = "plan-actions";
    const action = (text, kind, onClick) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `dialog-btn ${kind}`;
        b.textContent = text;
        b.onclick = onClick;
        actions.appendChild(b);
    };
    action("Ver mi TDEE", "ghost", () => { close(); showTdeeResult(); });
    action("Repetir el test", "ghost", () => { close(); runTdeeTest(); });
    action("Reiniciar plan", "danger", async () => {
        if (!await askConfirm({ title: "Reiniciar plan", message: "Se borrará el test, el objetivo y la dieta. Tu historial de comidas se mantiene.", confirmLabel: "Reiniciar" })) return;
        state.nutrition = null; saveState(); renderFood(); close();
    });
    sheet.append(label, actions);
}
