/* =========================================================
    NUTRICIÓN: test TDEE, objetivo (mantener / bulking / cutting) y tipo de dieta.
    Se guarda en state.nutrition = { profile, goal, diet }.
    El test se hace una sola vez; el objetivo y la dieta se cambian cuando quieras.
    Todo son estimaciones orientativas, no consejo médico.
========================================================= */

const ACTIVITY = [
    { k: 1.2,   name: "Sedentario",  short: "Poco o nada" },
    { k: 1.375, name: "Ligero",      short: "1-3 días" },
    { k: 1.55,  name: "Moderado",    short: "3-5 días" },
    { k: 1.725, name: "Intenso",     short: "6-7 días" },
    { k: 1.9,   name: "Muy intenso", short: "2 veces/día" }
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

/* ---------- piezas visuales del test y del resultado (tarjetas con mosaicos) ---------- */

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

function tCard(title, right) {
    const c = el("section", "t-card");
    c.appendChild(el("div", "t-lbl", `<span>${title}</span>${right ? `<span>${right}</span>` : ""}`));
    return c;
}

/* Mosaico de dato: etiqueta pequeña, número grande y unidad */
const tTile = (label, value, unit, cls = "") =>
    el("div", `t-tile ${cls}`, `<small>${label}</small><b>${value}</b>${unit ? `<i>${unit}</i>` : ""}`);

const bmiOf = (w, h) => w / ((h / 100) ** 2);
function bmiChip(bmi) {
    const [name, tone] = bmi < 18.5 ? ["Bajo peso", "gold"] : bmi < 25 ? ["Normal", "green"] : bmi < 30 ? ["Sobrepeso", "gold"] : ["Obesidad", "red"];
    return `<span class="t-chip ${tone}">IMC ${fmtNum(bmi, 1)} · ${name}</span>`;
}

/* ---------- test TDEE ---------- */

const TDEE_FIELDS = {
    age:    { label: "Edad",           unit: "años", min: 14,  max: 90,  step: 1, def: 25 },
    weight: { label: "Peso",           unit: "kg",   min: 30,  max: 250, step: 1, def: 70, dec: true },
    height: { label: "Altura",         unit: "cm",   min: 120, max: 230, step: 1, def: 170 },
    bf:     { label: "Grasa corporal", unit: "%",    min: 3,   max: 60,  step: 1, def: 20, dec: true }
};

function runTdeeTest() {
    const old = nutrition()?.profile || {};
    const v = {
        sex: old.sex || "m", activity: old.activity || 1.55,
        age: old.age ?? null, weight: old.weight ?? null, height: old.height ?? null,
        bf: typeof old.bf === "number" ? old.bf : null
    };
    let bfUnknown = !!nutrition() && v.bf === null;

    const { sheet, close } = openSheet("tdee-sheet", "Test TDEE");
    const body = el("div", "t-body");
    sheet.appendChild(body);
    const error = el("div", "dialog-error t-error");
    const tiles = {};

    const show = k => (v[k] == null ? "—" : fmtNum(v[k], 1));
    /* skip = mosaico que se está animando (no se le reescribe el número) */
    const refresh = skip => {
        for (const k in tiles) {
            if (k !== skip) tiles[k].querySelector("b").textContent = show(k);
            tiles[k].classList.toggle("empty", v[k] == null);
        }
        tiles.bf.classList.toggle("off", bfUnknown);
        unknownBtn.classList.toggle("active", bfUnknown);
        unknownBtn.setAttribute("aria-pressed", bfUnknown);
        bmiBox.innerHTML = v.weight && v.height ? bmiChip(bmiOf(v.weight, v.height)) : "";
    };
    const touched = k => {
        tiles[k].classList.remove("bad");
        error.textContent = "";
        if (k === "bf") bfUnknown = false;
    };

    /* Número que se cambia deslizando sobre él, o tocándolo (abre el cuadro grande con ▲ ▼ y teclado) */
    const numberTile = (k, extraCls) => {
        const f = TDEE_FIELDS[k];
        const t = tTile(f.label, show(k), f.unit, `t-input ${extraCls || ""}`);
        t.setAttribute("role", "button");
        t.tabIndex = 0;
        t.setAttribute("aria-label", `${f.label}: toca para cambiarlo`);
        const step = (dir, animate) => {
            const before = v[k];
            v[k] = before == null ? f.def : Math.min(f.max, Math.max(f.min, Math.round(before + dir * f.step)));
            touched(k);
            if (animate && before !== v[k]) animateValue(t.querySelector("b"), dir, show(k));
        };
        const open = () => openStepper({
            title: f.label,
            subtitle: `Entre ${f.min} y ${f.max} ${f.unit}`,
            unit: f.unit,
            read: () => show(k),
            step: dir => step(dir, false),
            editMode: f.dec ? "decimal" : "numeric",
            onEdit: text => {
                const n = parseAmount(text, { max: f.max });
                if (n === null || n < f.min) return "x";
                v[k] = f.dec ? Math.round(n * 10) / 10 : Math.round(n);
                touched(k);
                return "";
            },
            onClose: () => refresh()
        });
        attachValueSwipe(t, dir => { step(dir, true); refresh(k); }, open);
        t.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
        tiles[k] = t;
        return t;
    };

    /* Sobre ti */
    const about = tCard("Sobre ti");
    const aboutRow = el("div", "t-row");
    const seg = el("div", "seg t-seg");
    [["m", "Hombre"], ["f", "Mujer"]].forEach(([value, text]) => {
        const b = el("button", "seg-btn" + (v.sex === value ? " active" : ""));
        b.type = "button";
        b.textContent = text;
        b.onclick = () => { v.sex = value; seg.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b)); };
        seg.appendChild(b);
    });
    aboutRow.append(seg, numberTile("age", "t-small"));
    about.appendChild(aboutRow);

    /* Cuerpo */
    const bodyCard = tCard("Cuerpo");
    const bodyRow = el("div", "t-row");
    bodyRow.append(numberTile("weight"), numberTile("height"));
    const bmiBox = el("div", "t-chips");
    bodyCard.append(bodyRow, bmiBox);

    /* Actividad: 5 opciones con barras de intensidad */
    const act = tCard("Actividad");
    const list = el("div", "t-opts");
    ACTIVITY.forEach((a, i) => {
        const bars = [4, 7, 10, 12, 14].map((h, j) => `<i class="${j <= i ? "on" : ""}" style="height:${h}px"></i>`).join("");
        const b = el("button", "t-opt" + (v.activity === a.k ? " active" : ""), `<span class="t-bars" aria-hidden="true">${bars}</span><span class="t-opt-name">${a.name}</span><small>${a.short}</small>`);
        b.type = "button";
        b.setAttribute("aria-pressed", v.activity === a.k);
        b.onclick = () => {
            v.activity = a.k;
            list.querySelectorAll(".t-opt").forEach(x => { x.classList.toggle("active", x === b); x.setAttribute("aria-pressed", x === b); });
        };
        list.appendChild(b);
    });
    act.appendChild(list);

    /* Grasa corporal (opcional) */
    const fat = tCard("Grasa corporal", "Opcional");
    const fatRow = el("div", "t-row t-fat");
    const unknownBtn = el("button", "t-chip t-unknown", "No lo sé");
    unknownBtn.type = "button";
    unknownBtn.onclick = () => { bfUnknown = !bfUnknown; if (bfUnknown) v.bf = null; tiles.bf.classList.remove("bad"); refresh(); };
    fatRow.append(numberTile("bf", "t-small"), unknownBtn);
    fat.appendChild(fatRow);

    const submit = el("button", "dialog-btn accept t-submit", "Calcular");
    submit.type = "button";
    submit.onclick = () => {
        const missing = ["age", "weight", "height"].filter(k => v[k] == null);
        if (missing.length) {
            missing.forEach(k => tiles[k].classList.add("bad"));
            error.textContent = `Falta: ${missing.map(k => TDEE_FIELDS[k].label.toLowerCase()).join(", ")}. Desliza o toca el número.`;
            return;
        }
        const profile = { age: v.age, sex: v.sex, height: v.height, weight: v.weight, activity: v.activity, bf: bfUnknown ? null : v.bf };
        state.nutrition = { profile, goal: state.nutrition?.goal || "maintain", diet: state.nutrition?.diet || "mod" };
        saveState();
        renderFood();
        close();
        showTdeeResult();
    };

    body.append(about, bodyCard, act, fat, error, submit);
    refresh();
}

/* ---------- resultado: mismas tarjetas que el test ---------- */

/* calibrate: abierto desde "Calibración" (con botones para repetir o reiniciar el test) */
function showTdeeResult({ calibrate = false } = {}) {
    const n = nutrition();
    if (!n) return;
    const p = n.profile, t = calcTDEE(p);
    const f = (x, d = 0) => fmtNum(x, d);
    const { sheet, close } = openSheet("tdee-sheet tdee-result", calibrate ? "Calibración" : "Tu resultado");
    const body = el("div", "t-body");
    sheet.appendChild(body);

    const card = (title, tiles, chips) => {
        const c = tCard(title);
        const row = el("div", "t-row");
        row.append(...tiles);
        c.appendChild(row);
        if (chips && chips.length) c.appendChild(el("div", "t-chips", chips.join("")));
        return c;
    };

    body.append(
        card("Calorías", [
            tTile("Mantenimiento", f(t.tdee), "kcal/día", "t-main"),
            tTile("Metabolismo basal", f(t.bmr), "kcal")
        ]),
        card("Peso", [
            tTile("Peso ideal", f(t.ideal, 1), "kg"),
            tTile("Rango sano", `${f(t.idealMin, 1)}–${f(t.idealMax, 1)}`, "kg")
        ], [bmiChip(bmiOf(p.weight, p.height))]),
        card("Grasa corporal", t.bfKnown
            ? [tTile("Grasa", f(t.bf, 0), "%"), tTile("Masa magra", f(t.lean, 1), "kg")]
            : [tTile("Grasa estimada", f(t.bf, 0), "%")],
            t.bfKnown ? [] : ['<span class="t-chip">Estimada (no la indicaste)</span>']),
        card("Máximo potencial muscular", [
            tTile("Masa magra máxima", f(t.leanMax, 1), "kg"),
            tTile(`Peso con ${Math.round(t.bfTarget * 100)} % de grasa`, f(t.weightAtMax, 1), "kg")
        ], t.bfKnown ? [`<span class="t-chip green">Te faltan ≈ ${f(t.muscleLeft, 1)} kg de músculo</span>`] : [])
    );

    const ok = el("button", "dialog-btn accept t-submit", "Entendido");
    ok.type = "button";
    ok.onclick = close;

    if (calibrate) {
        const row = el("div", "dialog-actions t-actions");
        const again = el("button", "dialog-btn ghost", "Repetir el test");
        again.type = "button";
        again.onclick = () => { close(); runTdeeTest(); };
        const reset = el("button", "dialog-btn danger", "Reiniciar plan");
        reset.type = "button";
        reset.onclick = async () => {
            if (!await askConfirm({ title: "Reiniciar plan", message: "Se borrará el test, el objetivo y la dieta. Tu historial de comidas se mantiene.", confirmLabel: "Reiniciar" })) return;
            state.nutrition = null; saveState(); renderFood(); close();
        };
        row.append(again, reset);
        body.append(row);
    }
    body.appendChild(ok);
}

/* ---------- Objetivo o dieta: una ventana con las opciones (la elegida, marcada) ---------- */

function choosePlanOption(key) {
    if (!nutrition()) return;
    const options = key === "goal" ? GOALS : DIETS;
    const { sheet, close } = openSheet("tdee-sheet plan-choice", key === "goal" ? "Objetivo" : "Tipo de dieta");
    const list = el("div", "t-body t-opts");

    Object.entries(options).forEach(([k, v]) => {
        const active = state.nutrition[key] === k;
        const b = el("button", "t-opt plan-opt" + (active ? " active" : ""), `<span class="t-opt-name">${v.name}</span><small>${v.sub}</small>`);
        b.type = "button";
        b.setAttribute("aria-pressed", active);
        b.onclick = () => { state.nutrition[key] = k; saveState(); renderFood(); close(); };
        list.appendChild(b);
    });
    sheet.appendChild(list);
}
