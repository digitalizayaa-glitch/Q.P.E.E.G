/* =========================================================
    COMIDA — historial del día (ventana emergente): ver, editar y quitar lo registrado
========================================================= */

/* ---------- historial (ventana emergente) ----------
   Sin grupo: todo el día. Con grupo (al tocar Harinas, Vegetales…): solo lo que suma porciones a ese grupo,
   con un botón para agregar más. Tocar una comida abre su cantidad para cambiarla (0 = quitarla). */

let foodHistoryRedraw = null;     /* el historial abierto se repinta cuando cambia la comida del día */

function openFoodHistory(groupKey = null) {
    let mode = "time";          /* "time" = por hora, "kcal" = por calorías */
    let desc = true;
    const group = groupKey ? FOOD_GROUP[groupKey] : null;
    const inGroup = e => !group || e.g === groupKey || (entryPortions(e)[groupKey] || 0) > 0;

    const { sheet } = openSheet("fh-sheet", `${group ? group.name : "Historial"}${foodDate ? "" : " de hoy"}`);
    const body = document.createElement("div");
    body.className = "fh-body";
    sheet.appendChild(body);

    const kcalOf = entryKcal;
    const rowHtml = e => {
        const color = entryColor(e);
        const isWater = e.g === "agua";
        const editable = e.g !== FREE_GROUP;
        return `<div class="food-row${editable ? " editable" : ""}" style="--c:${color}"${editable ? ` data-edit="${esc(e.id)}" role="button" tabindex="0" aria-label="Cambiar ${esc(e.n)}"` : ""}>
            <span class="fr-dot"></span>
            <span class="fr-name">${esc(e.n)}<small>${e.ts ? fmtTime(e.ts) + " · " : ""}${esc(e.t)}${e.pt || e.g === FAST_GROUP ? " = " + esc(portionsText(entryPortions(e))) : ""}${!isWater && entryWaterMl(e) ? ` · ${fmtNum(entryWaterMl(e), 0)} ml de agua` : ""}</small></span>
            <span class="fr-kcal">${isWater ? fmtNum(e.p * WATER_ML, 0) + " ml" : fmtNum(kcalOf(e), 0) + " kcal"}</span>
            <button class="fr-del" data-id="${esc(e.id)}" aria-label="Quitar">✕</button>
        </div>`;
    };

    /* Por hora: todas las franjas del día, cada una con su total */
    const draw = () => {
        const all = foodEntries().filter(inGroup);
        let list;
        if (mode === "kcal") {
            const sorted = all.slice().sort((a, b) => desc ? kcalOf(b) - kcalOf(a) : kcalOf(a) - kcalOf(b));
            list = sorted.map(rowHtml).join("");
        } else {
            /* La franja más reciente arriba (al mediodía: mediodía y luego mañana), y dentro, lo último primero */
            list = TIME_BANDS.slice().reverse().map(b => {
                const items = all.filter(e => bandOf(e.ts)?.k === b.k).sort((x, y) => y.ts - x.ts);
                if (!items.length) return "";
                const kc = items.reduce((s, e) => s + kcalOf(e), 0);
                return `<div class="picker-group">${b.name} · ${b.hint} <span>${fmtNum(kc, 0)} kcal</span></div>${items.map(rowHtml).join("")}`;
            }).join("");
            const old = all.filter(e => !e.ts);
            if (old.length) list += `<div class="picker-group">Sin hora registrada</div>${old.map(rowHtml).join("")}`;
        }

        body.innerHTML = `
            <div class="seg fh-seg">
                <button class="seg-btn${mode === "time" ? " active" : ""}" data-mode="time">Hora</button>
                <button class="seg-btn${mode === "kcal" ? " active" : ""}" data-mode="kcal">Calorías</button>
            </div>
            ${mode === "kcal" && all.length > 1 ? `<button class="fh-order" data-order="1">${desc ? "Más calorías primero ▼" : "Menos calorías primero ▲"}</button>` : ""}
            <div class="picker-list fh-list">${list || `<p class="picker-empty">${group ? `Aún no hay ${group.name.toLowerCase()}.` : "Aún no hay comidas."}</p>`}</div>
            ${group ? `<button class="square-card add-square add-wide food-add fh-add" data-add-group="1"><span class="add-square-plus">+</span><small>${esc(group.name)}</small></button>` : ""}`;
    };
    foodHistoryRedraw = () => { if (body.isConnected) draw(); else foodHistoryRedraw = null; };

    const editRow = row => {
        const entry = foodEntries().find(x => x.id === row.dataset.edit);
        if (entry) editFoodEntry(entry);
    };
    body.addEventListener("click", e => {
        const t = e.target.closest("button");
        if (!t) {
            const row = e.target.closest(".food-row[data-edit]");
            if (row) editRow(row);
            return;
        }
        if (t.dataset.mode) { mode = t.dataset.mode; draw(); }
        else if (t.dataset.order) { desc = !desc; draw(); }
        else if (t.dataset.addGroup) openFoodPicker(groupKey);
        else if (t.dataset.id) { removeFoodEntry(t.dataset.id); renderFood(); }
    });
    body.addEventListener("keydown", e => {
        const row = e.target.closest && e.target.closest(".food-row[data-edit]");
        if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); editRow(row); }
    });

    draw();
}

/* Abre la cantidad de una comida ya registrada para cambiarla */
function editFoodEntry(e) {
    if (e.g === "agua") { askWater({ id: e.id, qty: e.p }); return; }
    if (e.g === FAST_GROUP) {
        if (FAST_FOOD_BY_KEY.has(e.n)) askFastFood(e.n, null, { id: e.id, qty: e.q ?? e.p });
        return;
    }
    if (!FOOD_GROUP[e.g]) return;
    const item = (FOOD_CATALOG[e.g] || []).find(i => i[0] === e.n) || [e.n, "1 porción"];
    askFoodAmount(e.g, item, null, { id: e.id, qty: e.q ?? Math.round(e.p / (item[3] || 1) * 100) / 100 });
}

/* existing ({ id, qty }): cambiar un agua ya registrada (0 = quitarla) */
function askWater(existing) {
    let qty = existing ? existing.qty : 1;
    openStepper({
        title: "Agua",
        subtitle: `1 vaso = ${WATER_ML} ml`,
        unit: "vasos",
        doneLabel: existing ? "Guardar" : "Agregar",
        cancelLabel: "Cancelar",
        read: () => fmtNum(qty, 2),
        step: dir => { qty = existing ? stepByOne(qty, dir, true) : Math.max(1, Math.round((qty + dir) * 100) / 100); },
        onEdit: text => {
            const v = parseAmount(text, { max: 40 });
            if (v === null || v < 0 || (v === 0 && !existing)) return "x";
            qty = v;
            return "";
        },
        onClose: confirmed => {
            if (!confirmed) return;
            const t = `${fmtNum(qty, 2)} ${qty === 1 ? "vaso" : "vasos"} (${fmtNum(qty * WATER_ML, 0)} ml)`;
            if (existing && qty === 0) removeFoodEntry(existing.id);
            else if (existing) updateFoodEntry(existing.id, { p: qty, t });
            else addFoodEntry({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: "Agua", g: "agua", p: qty, t });
            renderFood();
        }
    });
}

document.addEventListener("click", e => {
    const root = document.getElementById("foodContent");
    if (!root || !root.contains(e.target) || SWIPE.justDragged) return;

    const act = e.target.closest("[data-act]");
    if (act) {
        if (act.dataset.act === "test") runTdeeTest();
        else if (act.dataset.act === "goal") choosePlanOption("goal");
        else if (act.dataset.act === "diet") choosePlanOption("diet");
        else if (act.dataset.act === "calib") showTdeeResult({ calibrate: true });
        else if (act.dataset.act === "hist") openFoodHistory();
        else if (act.dataset.act === "done") giveTheDay();
        return;
    }

    const chip = e.target.closest(".food-chip, .food-add");
    if (!chip) return;
    if (chip.dataset.water) askWater();
    else if (chip.dataset.add) openFoodPicker(null);
    else openFoodHistory(chip.dataset.g);      /* un grupo: lo que llevas de ese grupo, para cambiarlo o agregar más */
});
