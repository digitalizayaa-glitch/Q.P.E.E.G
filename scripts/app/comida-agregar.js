/* =========================================================
    COMIDA — agregar: buscador, cantidades, comida rápida y dar el día
========================================================= */

/* ---------- agregar ---------- */

const FREQUENT_MIN = 4;                       /* "más de 3 veces" */
const FREQUENT_WINDOW = 3 * 24 * 3600 * 1000; /* 3 días sin agregarla → deja de ser frecuente */

/* Comidas agregadas más de 3 veces y usadas en los últimos 3 días, de la más usada a la menos */
function frequentFoods(now = Date.now()) {
    const stats = new Map();
    const log = (state.food && state.food.log) || {};
    for (const day in log) {
        const dayTs = parseKey(day).getTime() + 12 * 3600 * 1000;
        for (const e of log[day]) {
            if (!e.n || !(FOOD_GROUP[e.g] || (e.g === FAST_GROUP && FAST_FOOD_BY_KEY.has(e.n)))) continue;
            const key = e.g + "|" + e.n;
            const s = stats.get(key) || { g: e.g, n: e.n, count: 0, last: 0 };
            s.count++;
            s.last = Math.max(s.last, e.ts || dayTs);
            stats.set(key, s);
        }
    }
    return [...stats.values()]
        .filter(s => s.count >= FREQUENT_MIN && now - s.last <= FREQUENT_WINDOW)
        .sort((a, b) => b.count - a.count || b.last - a.last)
        .slice(0, 8)
        .map(s => s.g === FAST_GROUP
            ? { g: FAST_GROUP, fk: s.n }
            : { g: s.g, item: (FOOD_CATALOG[s.g] || []).find(i => i[0] === s.n) || [s.n, "1 porción"] });
}

function openFoodPicker(groupKey) {
    const keys = groupKey ? [groupKey] : FOOD_GROUPS.map(g => g.k);
    const picked = new Map();                 /* lo agregado en este menú (clave → { id, qty }): se pinta con el color de la app */
    const keyOf = v => v.g + "|" + (v.fk || v.item[0]);
    const asItem = (g, item) => ({ label: item[0], sub: item[1], value: { g, item } });
    const fastItem = key => {
        const { item } = FAST_FOOD_BY_KEY.get(key);
        return { label: key, sub: `1 ${item[1]} · ${fmtNum(item[3], 0)} kcal`, value: { g: FAST_GROUP, fk: key } };
    };

    const frequent = frequentFoods().filter(f => f.g === FAST_GROUP ? !groupKey : keys.includes(f.g));
    const groups = keys.map(k => ({
        title: groupKey ? null : FOOD_GROUP[k].name,
        items: FOOD_CATALOG[k].map(item => asItem(k, item))
    }));
    if (!groupKey) {
        FAST_FOOD.forEach(({ chain, items, super: market, drink }) => groups.push({
            title: `${drink ? "Bebidas" : market ? "Supermercado" : "Comida rápida"} · ${chain}`,
            items: items.map(it => fastItem(`${chain} · ${it[0]}`))
        }));
    }
    if (frequent.length) groups.unshift({ title: "Frecuentes", items: frequent.map(f => f.g === FAST_GROUP ? fastItem(f.fk) : asItem(f.g, f.item)) });

    openPicker({
        title: groupKey ? FOOD_GROUP[groupKey].name : "Agregar comida",
        searchable: true,
        keepOpen: true,
        itemClass: v => picked.has(keyOf(v)) ? "picked" : "",
        groups,
        filters: [
            { label: "Todos" },
            ...(frequent.length ? [{ label: "Frecuentes", match: t => t === "Frecuentes" }] : []),
            ...(groupKey ? [] : FOOD_GROUPS.map(g => ({ label: g.name, match: t => t === g.name }))),
            ...(groupKey ? [] : [
                { label: "Comida rápida", match: t => t.startsWith("Comida rápida") },
                { label: "Supermercado", match: t => t.startsWith("Supermercado") },
                { label: "Bebidas", match: t => t.startsWith("Bebidas") }
            ])
        ],
        createLabel: "Porciones sueltas",
        onPick: (v, refresh) => {
            const key = keyOf(v);
            /* Si ya se agregó en este menú (y sigue registrado), se abre en esa cantidad para corregirla */
            let existing = picked.get(key) || null;
            if (existing && !foodEntries().some(e => e.id === existing.id)) { picked.delete(key); existing = null; }
            const done = res => {
                if (res) picked.set(key, res); else picked.delete(key);
                refresh();
            };
            if (v.g === FAST_GROUP) askFastFood(v.fk, done, existing);
            else askFoodAmount(v.g, v.item, done, existing);
        },
        onCreate: query => {
            const loose = g => askFoodAmount(g, [query || FOOD_GROUP[g].name, "1 porción"]);
            if (groupKey) { loose(groupKey); return; }
            openPicker({
                title: "¿De qué grupo?",
                groups: [{ items: FOOD_GROUPS.map(g => ({ label: g.name, sub: `≈ ${fmtNum(groupKcal(g), 0)} kcal`, value: g.k })) }],
                onPick: loose
            });
        },
        emptyText: "Sin alimentos"
    });
}

/* Cuadro de cantidad común. Con "existing" ({ id, qty }) abre en la cantidad ya agregada en este menú:
   se puede subir, bajar o dejar en 0 para quitarla. done({ id, qty }) al guardar, done(null) al quitar. */
/* unitOne: la unidad en singular, para 1 o menos ("1 rebanada", "2 rebanadas") */
function amountStepper({ title, subtitle, unit, unitOne, existing, makeEntry, done }) {
    let qty = existing ? existing.qty : 1;
    const allowZero = !!existing;
    openStepper({
        title,
        subtitle,
        unit: () => (unitOne && qty > 0 && qty <= 1 ? unitOne : unit),
        doneLabel: existing ? "Guardar" : "Agregar",
        cancelLabel: "Cancelar",
        read: () => fmtNum(qty, 2),
        step: dir => { qty = stepByOne(qty, dir, allowZero); },
        onEdit: text => {
            const n = parseAmount(text, { max: 99 });
            if (n === null || n < 0 || (n === 0 && !allowZero)) return "x";
            qty = n;
            return "";
        },
        onClose: confirmed => {
            if (!confirmed) return;
            if (existing && qty === 0) {
                removeFoodEntry(existing.id);
                renderFood();
                if (done) done(null);
                return;
            }
            const entry = makeEntry(qty);
            if (existing) updateFoodEntry(existing.id, entry);
            else addFoodEntry(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, entry));
            renderFood();
            if (done) done({ id: existing ? existing.id : foodEntries().at(-1).id, qty });
        }
    });
}

function askFoodAmount(groupKey, item, done, existing) {
    const [name, equiv, unit, per] = item;
    const perUnit = per || 1;
    const unitName = unit || "porciones";
    const cal = FOOD_CALIBRATION[name] || null;    /* alimentos calibrados: calorías reales y porciones en varios grupos */
    amountStepper({
        title: name,
        subtitle: (unit ? equiv : `1 porción = ${equiv}`) + (cal ? `\n= ${fmtNum(cal.k, 0)} kcal · ${portionsText(cal.pt)}` : ""),
        unit: unitName,
        unitOne: unit ? unit.replace(/s$/, "") : "porción",   /* latas, scoops, rebanadas */
        existing,
        done,
        makeEntry: qty => ({
            n: name,
            g: groupKey,
            p: qty * perUnit,
            q: qty,
            t: `${fmtNum(qty, 2)} ${qty === 1 ? unitName.replace(/(ciones|s)$/, m => m === "ciones" ? "ción" : "") : unitName}`,
            ...(cal ? { k: cal.k, mc: cal.c, mp: cal.p, mf: cal.f, pt: cal.pt } : {})
        })
    });
}

/* ---------- comida rápida ---------- */

function askFastFood(key, done, existing) {
    const { item } = FAST_FOOD_BY_KEY.get(key);
    const [name, unit, plural, kcal, c, p, f] = item;
    const pt = item[7] || fastPortions(c, p, f);
    amountStepper({
        title: name,
        subtitle: `1 ${unit} = ${fmtNum(kcal, 0)} kcal\n= ${portionsText(pt)}`,
        unit: plural,
        unitOne: unit,
        existing,
        done,
        makeEntry: qty => ({
            n: key, g: FAST_GROUP, p: qty, q: qty, k: kcal, mc: c, mp: p, mf: f, pt,
            t: `${fmtNum(qty, 2)} ${qty === 1 ? unit : plural}`
        })
    });
}

/* ---------- dar el día ----------
   Para días en que se come fuera de lo común y no se puede contar: completa las calorías
   que faltan para la meta con una entrada "Volumen sucio" (sin macros: no se conocen).
   Si ya se dio el día, el mismo botón permite quitarlo. */
async function giveTheDay() {
    const entries = foodEntries();
    const given = entries.find(e => e.g === FREE_GROUP);
    if (given) {
        const ok = await askConfirm({
            title: "Quitar el día dado",
            message: `Se quitarán las ${fmtNum(entryKcal(given), 0)} kcal de volumen sucio de este día.`,
            confirmLabel: "Quitar"
        });
        if (!ok) return;
        removeFoodEntry(given.id);
        renderFood();
        return;
    }
    const goal = nutritionPlan().kcal;
    const missing = Math.round(goal - foodTotals(entries).kcal);
    if (missing <= 0) {
        await showMessage({ title: "Meta alcanzada", message: "Ya llegaste a tu meta de calorías de este día." });
        return;
    }
    const ok = await askConfirm({
        title: "Dar el día",
        message: `Se sumarán ${fmtNum(missing, 0)} kcal como volumen sucio para completar tu meta de ${fmtNum(goal, 0)} kcal.\n\nÚsalo los días en que comes fuera de lo común y no puedes contar.`,
        confirmLabel: "Dar el día"
    });
    if (!ok) return;
    addFoodEntry({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        n: "Volumen sucio", g: FREE_GROUP, p: 1, k: missing,
        t: "Calorías que faltaban"
    });
    renderFood();
}
