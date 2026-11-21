/* =========================================================
    DEPORTES — registrar y editar (el cálculo está en deportes-modelo.js)
========================================================= */

/* "1 h 30 min · 40 km · +450 m" */
function sportSummary(sp) {
    /* boxeo: "8 rounds × 3 min" (su tiempo total también se guarda, pero no se repite) */
    if (sp.rounds > 0) return `${fmtNum(sp.rounds, 0)} ${sp.rounds === 1 ? "round" : "rounds"}${sp.rmin > 0 ? ` × ${fmtNum(sp.rmin, 1)} min` : ""}`;
    return SPORT_FIELDS.filter(({ f }) => sp[f] > 0 && f !== "rmin").map(({ f, fmt }) => fmt(sp[f])).join(" · ");
}

/* ---------- Añadir y editar deporte ---------- */
/* opts (desde el calendario): { key, fromCalendar, onSaved } — la fecha, sin "Cancelar", y qué hacer al guardar */
function addSport(opts = {}) {
    const key = opts.key || getWorkoutDateKey();
    const done = state.sports[key] || [];
    openPicker({
        title: "Añadir deporte",
        groups: [
            ...(opts.fromCalendar && done.length ? [{ title: "Registrados ese día", items: done.map(sp => ({ label: sp.n, sub: sportSummary(sp), value: { edit: sp } })) }] : []),
            { title: "Con distancia", items: SPORTS.filter(s => !s.hidden && s.ref.km).map(s => ({ label: s.name, sub: s.ref.up ? "Tiempo, km y desnivel" : "Tiempo y km", value: s })) },
            { title: "Por tiempo", items: SPORTS.filter(s => !s.hidden && !s.ref.km).map(s => ({ label: s.name, sub: s.ref.rounds ? "Rounds y minutos por round" : "Tiempo", value: s })) }
        ],
        createLabel: "Otro deporte",
        onPick: v => v.edit ? askSportData({ ...sportDef(v.edit.k), k: v.edit.k, name: v.edit.n }, { key, entry: v.edit }, opts)
                            : askSportData(v, null, opts),
        onCreate: async query => {
            const name = await askText({ title: "Otro deporte", label: "Nombre del deporte", value: query || "", maxLength: 30 });
            if (name) askSportData({ ...SPORT_BY_KEY.custom, name }, null, opts);
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
function askSportData(sport, editing, opts = {}) {
    const fields = sportFields(sport.k);
    const vals = {};
    fields.forEach(({ f }) => { vals[f] = editing ? editing.entry[f] || 0 : 0; });
    const ref = sportReference(sport.k);
    if (!editing) {   /* empieza con un valor normal */
        if (ref.rounds) { vals.rounds = ref.rounds; vals.rmin = ref.rmin; }
        else vals[ref.km ? "km" : "min"] = ref.km ? Math.round(ref.km) : Math.round(ref.min / 5) * 5;
    }

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
    if (opts.fromCalendar) actions.append(saveBtn); else actions.append(cancel, saveBtn);   /* desde el calendario: solo confirmar */

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
            if (vals.rounds > 0 && vals.rmin > 0) bits.push(`${fmtDuration(vals.rounds * vals.rmin)} en total`);
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
                const r = field.f === "km" ? Math.round(ref.km * 2) / 2 : field.f === "min" ? Math.round(ref.min / 5) * 5
                    : field.f === "up" ? Math.round(ref.up / 5) * 5 : ref[field.f];
                hint.textContent = `Típico ${field.fmt(r)}`;
            }
            box.setAttribute("aria-label", `${field.label}: ${vals[field.f] > 0 ? field.fmt(vals[field.f]) : "sin dato"}`);
            fit();
        };
        const step = field.f === "km" && (sport.k === "bike" || sport.k === "mtb") ? 1 : field.step;
        const apply = (dir, size = 1) => {   /* size: el acelerador del deslizador (desnivel) */
            const before = text();
            vals[field.f] = Math.min(field.max, Math.max(0, Math.round((vals[field.f] + dir * step * size) * 10) / 10));
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
        /* desnivel: de 1 en 1, un 25 % más sensible y con acelerador (cada 6 pasos seguidos, ×1,5) */
        if (field.f === "up") attachValueSwipe(box, apply, startEdit, 22 * 0.75, { accel: 1.5, accelEvery: 6 });
        else attachValueSwipe(box, apply, startEdit, 22);
        hints.push(paintHint);
        paintHint();
        col.append(label, up, box, down, hint);
        return col;
    });
    grid.append(...cols);

    saveBtn.onclick = () => {
        const entry = editing ? { ...editing.entry } : { id: newId("sp"), k: sport.k, n: sport.name };
        fields.forEach(({ f }) => { if (vals[f] > 0) entry[f] = vals[f]; else delete entry[f]; });
        /* boxeo: también el tiempo total (rounds × min), para el historial y para teléfonos sin actualizar */
        if (vals.rounds !== undefined) { const t = sportMinutes(entry); if (t > 0) entry.min = t; else delete entry.min; }
        if (who) entry.bp = { ...who }; else delete entry.bp;     /* el cuerpo de ese día: bajar de peso no cambia el historial */
        if (!fields.some(({ f }) => entry[f] > 0)) return;
        const key = editing ? editing.key : (opts.key || getWorkoutDateKey());
        const list = (state.sports[key] ??= []);
        const at = list.findIndex(x => x.id === entry.id);
        if (at >= 0) list[at] = withLegacy(entry); else list.push(withLegacy(entry));
        saveState();
        close();
        renderWeekSection();
        if (opts.onSaved) opts.onSaved();
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
