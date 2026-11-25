"use strict";

/* =====================================================================
   Comida · comidas guardadas ("Mi desayuno": pinto, queso, tocineta y huevo)
   - Se guardan desde una franja del historial del día, eligiendo varios en el selector, o armándolas desde cero.
   - En "Agregar comida" salen primero, en "Guardadas": tocar una la agrega entera (½, 1, 1½, 2…), se puede editar o borrar.
   state.food.meals = [{ id, name, items: [entradas de comida sin id ni hora] }]
   ===================================================================== */

const MAX_SAVED_MEALS = 30, MAX_MEAL_ITEMS = 20;

/* Adónde van las cantidades que se eligen: el día (lo normal) o el borrador de una comida guardada */
const FOOD_DAY_SINK = {
    add: e => addFoodEntry(e),
    update: (id, e) => updateFoodEntry(id, e),
    remove: id => removeFoodEntry(id),
    entries: () => foodEntries()
};
let foodSink = null;
function draftSink(draft) {
    return {
        add: e => { draft.items.push(e); },
        update: (id, e) => { const i = draft.items.findIndex(x => x.id === id); if (i >= 0) draft.items[i] = { ...draft.items[i], ...e }; },
        remove: id => { draft.items = draft.items.filter(x => x.id !== id); },
        entries: () => draft.items
    };
}

function savedMeals() { return (state.food && state.food.meals) || []; }
const mealSnapshot = e => { const { id, ts, ...rest } = e; return JSON.parse(JSON.stringify(rest)); };
const mealSummary = items => {
    const t = foodTotals(items);
    const pt = items.reduce((acc, e) => {
        /* porciones sueltas o del catálogo sin calibrar: cuentan en su grupo; lo demás, con su equivalencia */
        const p = Object.keys(unitPortions(e)).length ? entryPortions(e) : (FOOD_GROUP[e.g] ? { [e.g]: e.p } : {});
        for (const g in p) acc[g] = (acc[g] || 0) + p[g];
        return acc;
    }, {});
    return [`${fmtNum(t.kcal, 0)} kcal`, portionsText(pt)].filter(Boolean).join(" · ");
};

/* "1 porción" × 1,5 → "1,5 porciones"; "2 rebanadas" × ½ → "1 rebanada" (si no empieza con número, "1,5 × …") */
function scaleFoodText(t, k) {
    const m = /^(\d+(?:[.,]\d+)?)\s+(\S+)(.*)$/.exec(t || "");
    if (!m) return `${fmtNum(k, 2)} × ${t || ""}`.trim();
    const n = Number(m[1].replace(",", ".")) * k;
    let w = m[2];
    const sing = w.replace(/ones$/, "ón").replace(/des$/, "d").replace(/s$/, "");
    if (n === 1) w = sing;
    else if (w === sing) w = /ón$/.test(w) ? w.replace(/ón$/, "ones") : /d$/.test(w) ? w + "es" : w + "s";
    const rest = m[3].replace(/\((\d+(?:[.,]\d+)?)\s*(g|ml)\)/, (_, x, u) => `(${fmtNum(Number(x.replace(",", ".")) * k, 0)} ${u})`);
    return `${fmtNum(n, 2)} ${w}${rest}`;
}

/* Guarda (o actualiza, si viene de editar) una comida con estas entradas */
async function saveMealFrom(entries, draft = null) {
    const items = entries.filter(e => e.g !== FREE_GROUP).slice(0, MAX_MEAL_ITEMS).map(mealSnapshot);
    if (!items.length) return;
    if (!draft?.id && savedMeals().length >= MAX_SAVED_MEALS) {
        await openDialog({ title: "Comidas guardadas", message: `Puedes tener hasta ${MAX_SAVED_MEALS}. Borra alguna para guardar otra.`, buttons: [{ label: "Listo", kind: "accept", confirm: true }] });
        return;
    }
    const name = await askText({ title: draft?.id ? "Nombre de la comida" : "Guardar como comida", label: "Nombre (p. ej. Mi desayuno)", value: draft?.name || "", maxLength: 30 });
    if (!name) return;
    state.food ??= { log: {} };
    const meals = (state.food.meals ??= []);
    const old = draft?.id ? meals.find(m => m.id === draft.id) : null;
    if (old) { old.name = name; old.items = items; }
    else meals.push({ id: newId("meal"), name, items });
    saveState();
    closePicker();
    renderFood();
    await openDialog({ title: "Comida guardada", message: `"${name}" quedó en Agregar comida → Guardadas.\n${mealSummary(items)}`, buttons: [{ label: "Listo", kind: "accept", confirm: true }] });
}

async function deleteSavedMeal(id) {
    const meal = savedMeals().find(m => m.id === id);
    if (!meal) return;
    if (!await askConfirm({ title: "Borrar comida guardada", message: `Se borra "${meal.name}". Lo que ya registraste en tus días no cambia.`, confirmLabel: "Borrar" })) return;
    state.food.meals = savedMeals().filter(m => m.id !== id);
    if (!state.food.meals.length) delete state.food.meals;
    saveState();
    closePicker();
}

/* Armar una nueva (o editar una): el selector de comida, pero lo elegido va al borrador */
function openMealBuilder(meal = null) {
    const draft = meal
        ? { id: meal.id, name: meal.name, items: meal.items.map((e, i) => ({ ...JSON.parse(JSON.stringify(e)), id: "d" + i + Date.now().toString(36) })) }
        : { items: [] };
    openFoodPicker(null, draft);
}

/* Tocar una guardada: su resumen y cuántas veces (½, 1, 1½, 2…); "Agregar" la pone entera en el día */
function askSavedMeal(meal) {
    let qty = 1;
    const facts = el("div", "food-facts meal-facts");
    const paint = () => {
        const scaled = meal.items.map(e => ({ ...e, p: e.p * qty }));
        facts.innerHTML = "";
        const eq = el("div", "food-facts-eq");
        eq.textContent = mealSummary(scaled);
        const list = el("div", "meal-items");
        meal.items.forEach(e => {
            const row = el("div", "meal-item");
            row.textContent = `${e.n}${e.t ? " · " + e.t : ""}`;
            list.appendChild(row);
        });
        facts.append(eq, list);
    };
    paint();
    openStepper({
        title: meal.name,
        subNode: facts,
        unit: "",
        doneLabel: "Agregar",
        cancelLabel: "Cancelar",
        read: () => fmtNum(qty, 2),
        step: dir => { qty = Math.min(5, Math.max(0.5, Math.round((qty + dir * 0.5) * 2) / 2)); paint(); },
        editMode: "decimal",
        onEdit: text => {
            const n = parseAmount(text, { max: 10 });
            if (n === null || n <= 0) return "x";
            qty = n; paint();
            return "";
        },
        extra: { label: "Editar o borrar", onClick: () => { setTimeout(() => openMealBuilder(meal), 0); return true; } },
        onClose: confirmed => {
            if (!confirmed) return;
            const ts = Date.now();
            meal.items.forEach((e, i) => {
                const entry = { ...JSON.parse(JSON.stringify(e)), id: ts.toString(36) + i + Math.random().toString(36).slice(2, 5), p: e.p * qty };
                if (typeof e.q === "number") entry.q = e.q * qty;
                if (qty !== 1) entry.t = scaleFoodText(e.t, qty);
                addFoodEntry(entry);
            });
            renderFood();
        }
    });
}

/* Desde el historial del día: guardar todo lo de una franja (Mañana, Mediodía…) */
function saveBandAsMeal(bandKey) {
    const items = foodEntries().filter(e => bandOf(e.ts)?.k === bandKey);
    const band = TIME_BANDS.find(b => b.k === bandKey);
    saveMealFrom(items, { name: band ? `Mi ${band.name.toLowerCase() === "mañana" ? "desayuno" : band.name.toLowerCase() === "mediodía" ? "almuerzo" : band.name.toLowerCase() === "tarde" ? "merienda" : "cena"}` : "" });
}
