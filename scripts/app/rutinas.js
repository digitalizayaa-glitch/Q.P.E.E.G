/* =========================================================
    CREADOR DE RUTINAS (pestaña "Rutinas")
========================================================= */

const EXERCISE_NAME_MAX = 20;

let routineNav = { level: "root", routineId: null, dayId: null };

function newId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function findRoutine(routineId) {
    return state.routines.find(r => r.id === routineId);
}

function findDay(routine, dayId) {
    return routine ? routine.days.find(d => d.id === dayId) : undefined;
}

function setHeaderDateText(text, onBack) {
    const el = document.getElementById("weekDate");

    if (onBack) {
        el.textContent = `← ${text}`;
        el.classList.add("clickable");
        el.onclick = onBack;
    } else {
        el.textContent = text;
        el.classList.remove("clickable");
        el.onclick = null;
    }
}

function renderRoutinesTab() {
    const container = document.getElementById("routinesContainer");
    container.innerHTML = "";

    if (routineNav.level !== "root" && !findRoutine(routineNav.routineId)) routineNav = { level: "root", routineId: null, dayId: null };

    if (routineNav.level === "root") {
        setHeaderDateText(getDateText());
        container.appendChild(buildRoutinesRoot());
    } else {
        setHeaderDateText(findRoutine(routineNav.routineId).name, () => navFade(() => {
            routineNav = { level: "root", routineId: null, dayId: null };
            renderRoutinesTab();
        }));
        container.appendChild(buildDaysView(routineNav.routineId));
    }
}

/* ---------- Animación de conversión ----------
   Antes de volver a dibujar, se mide dónde estaba cada tarjeta (data-key). Después, cada una
   se desliza desde su lugar anterior al nuevo. La tarjeta recién creada nace donde estaba el
   botón de añadir ("add") y se transforma en ella; el botón de añadir se corre a su nuevo lugar. */
function flipRender(container, render, newKey) {
    const before = new Map();
    container.querySelectorAll("[data-key]").forEach(el => before.set(el.dataset.key, el.getBoundingClientRect()));
    render();

    const ms = 420 * NAV_SPEED;
    const ease = "cubic-bezier(.2,.8,.2,1)";
    container.querySelectorAll("[data-key]").forEach(el => {
        const key = el.dataset.key;
        const isNew = newKey && key === newKey;
        const from = isNew ? before.get("add") : before.get(key);
        const to = el.getBoundingClientRect();

        if (!from || !to.width) {
            el.animate([{ opacity: 0, transform: "scale(.85)" }, { opacity: 1, transform: "none" }], { duration: ms, easing: ease });
            return;
        }
        const dx = from.left - to.left, dy = from.top - to.top;
        const sx = from.width / to.width, sy = from.height / to.height;
        if (!isNew && Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .01 && Math.abs(sy - 1) < .01) return;

        el.animate([{ transformOrigin: "top left", transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` },
                    { transformOrigin: "top left", transform: "none" }], { duration: ms, easing: ease });

        if (isNew) {
            /* el "+" se desvanece mientras aparece el contenido nuevo */
            const ghost = document.createElement("span");
            ghost.className = "convert-ghost";
            ghost.textContent = "+";
            el.appendChild(ghost);
            ghost.animate([{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.6)" }], { duration: ms * .55, easing: "ease-out", fill: "forwards" })
                .finished.then(() => ghost.remove()).catch(() => ghost.remove());
            [...el.children].filter(c => c !== ghost).forEach(c =>
                c.animate([{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }], { duration: ms, easing: "ease-out" }));
            glowOnce(el);
        }
    });
}

/* Botón cuadrado de añadir (rutinas, días, ejercicios, comida, logros) */
function addSquare(label, onClick, extraClass = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `square-card add-square ${extraClass}`;
    btn.dataset.key = "add";
    btn.innerHTML = `<span class="add-square-plus">+</span><small>${label}</small>`;
    btn.onclick = onClick;
    return btn;
}

/* Tarjeta de rutina o de día (con ✕ en la esquina) */
function gridCard(key, text, onOpen, onDelete, deleteLabel) {
    const card = document.createElement("button");
    card.className = "day-card";
    card.dataset.key = key;

    const xBtn = document.createElement("span");
    xBtn.className = "day-delete-x";
    xBtn.textContent = "✕";
    keyButton(xBtn, deleteLabel);
    xBtn.onclick = event => { event.stopPropagation(); onDelete(); };

    const label = document.createElement("span");
    label.textContent = text;
    card.append(xBtn, label);
    card.onclick = onOpen;
    return card;
}

/* Rejilla de tarjetas + botón de añadir (rutinas y días) */
function buildGrid(cards, add, hint) {
    const root = document.createElement("div");
    root.className = "routine-page";
    const gridWrapper = document.createElement("div");
    gridWrapper.className = "day-grid-wrapper";
    const grid = document.createElement("div");
    grid.className = "day-grid";
    const twoColumns = cards.length >= 4;
    grid.classList.toggle("two-columns", twoColumns);

    grid.append(...cards);
    if (add) {
        if (twoColumns && (cards.length + 1) % 2 === 1) add.classList.add("add-day-full-row");
        grid.appendChild(add);
    }
    if (cards.length === 0) {
        gridWrapper.classList.add("empty-wrapper");
        grid.classList.add("empty-grid");
    }
    gridWrapper.appendChild(grid);
    root.appendChild(gridWrapper);

    if (hint) {
        const p = document.createElement("p");
        p.className = "hint-text";
        p.textContent = hint;
        root.appendChild(p);
    }
    return root;
}

const routinesBox = () => document.getElementById("routinesContainer");

/* ---------- Nivel 1: lista de rutinas ---------- */

function buildRoutinesRoot() {
    const cards = state.routines.filter(r => r.id !== EXTRA_ROUTINE_ID).map(routine => {
        const card = gridCard(routine.id, routine.name,
            () => navFade(() => { routineNav = { level: "days", routineId: routine.id, dayId: null }; renderRoutinesTab(); }),
            () => deleteRoutine(routine.id), "Borrar rutina");
        card.classList.add("routine-pill");
        card.classList.toggle("routine-active", state.activeRoutineId === routine.id);

        /* no es <button>: un botón dentro de otro botón no es HTML válido */
        const activateBtn = document.createElement("span");
        activateBtn.className = "routine-activate";
        keyButton(activateBtn);
        /* sin texto: un check del color de la app (lleno = rutina activa) */
        const isActive = state.activeRoutineId === routine.id;
        activateBtn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7"/></svg>`;
        activateBtn.setAttribute("aria-label", isActive ? "Rutina activa (toca para desactivar)" : "Activar rutina");
        activateBtn.setAttribute("aria-pressed", isActive);
        activateBtn.onclick = event => { event.stopPropagation(); toggleActiveRoutine(routine.id); };
        card.prepend(activateBtn);
        return card;
    });
    return buildGrid(cards, addSquare("Añadir rutina", addRoutine));
}

async function deleteRoutine(routineId) {
    const routine = findRoutine(routineId);

    if (!await askConfirm({ title: "Borrar rutina", message: `¿Borrar la rutina "${routine.name}" completa, con todos sus días y ejercicios? Esta acción no se puede deshacer.` })) return;

    state.routines = state.routines.filter(r => r.id !== routineId);
    if (state.activeRoutineId === routineId) state.activeRoutineId = null;
    saveState();

    routineNav = { level: "root", routineId: null, dayId: null };
    flipRender(routinesBox(), renderRoutinesTab);
}

function toggleActiveRoutine(routineId) {
    state.activeRoutineId = (state.activeRoutineId === routineId) ? null : routineId;
    saveState();
    renderRoutinesTab();
}

function addRoutine() {
    openPicker({
        title: "Nueva rutina",
        groups: [{ items: ROUTINE_PRESETS.map(p => ({ label: p.name, sub: p.days.join(" · "), value: p })) }],
        createLabel: "Rutina personalizada",
        onPick: preset => createRoutine(preset.name, preset.key),
        onCreate: async () => {
            const name = await askText({ title: "Rutina personalizada", label: "Nombre de la rutina", maxLength: 24 });
            if (name) createRoutine(name, null);
        }
    });
}

/* La rutina nueva aparece en la lista transformándose desde el botón "Añadir rutina" */
function createRoutine(name, preset) {
    const routine = { id: newId("routine"), name, preset, days: [] };
    state.routines.push(routine);
    saveState();

    routineNav = { level: "root", routineId: null, dayId: null };
    flipRender(routinesBox(), renderRoutinesTab, routine.id);
}

/* ---------- Nivel 2: días de una rutina ---------- */

function buildDaysView(routineId) {
    const routine = findRoutine(routineId);
    const cards = routine.days.map(day => {
        const card = gridCard(day.id, day.name, () => openDaySheet(routineId, day.id), () => deleteDay(routineId, day.id), "Borrar día");
        attachLongPress(card, () => renameDay(routineId, day.id));
        return card;
    });
    const add = routine.days.length < 6 ? addSquare("Añadir día", () => addDay(routineId)) : null;
    return buildGrid(cards, add, "Toca un día para abrirlo. Mantén presionado para renombrarlo. Máx. 6 días.");
}

function renumberAutoDays(routine) {
    routine.days.forEach((day, index) => {
        if (!day.customName) day.name = `Día ${index + 1}`;
    });
}

function addDay(routineId) {
    const routine = findRoutine(routineId);
    if (routine.days.length >= 6) return;

    /* Opciones según la rutina prefabricada elegida (o todas, si es personalizada); sin repetir las ya creadas */
    const preset = ROUTINE_PRESETS.find(p => p.key === routine.preset);
    const used = routine.days.map(d => normalizeText(d.name));
    const options = (preset ? preset.days : GENERIC_DAYS).filter(n => !used.includes(normalizeText(n)));

    openPicker({
        title: "Nuevo día",
        groups: [{ items: options.map(n => ({ label: n, value: n })) }],
        emptyText: "Ya añadiste todos los días de esta rutina",
        createLabel: "Día personalizado",
        onPick: name => createDay(routineId, name),
        onCreate: async () => {
            const name = await askText({ title: "Día personalizado", label: "Nombre del día (vacío = \"Día N\")", maxLength: 24, allowEmpty: true });
            if (name === null) return;
            createDay(routineId, name);   /* vacío = "Día N" automático */
        }
    });
}

/* El día nuevo aparece transformándose desde el botón "Añadir día" */
function createDay(routineId, name) {
    const routine = findRoutine(routineId);
    if (routine.days.length >= 6) return;

    const day = { id: newId("day"), name: name || "", customName: !!name, exercises: [] };
    routine.days.push(day);
    renumberAutoDays(routine);
    saveState();
    flipRender(routinesBox(), renderRoutinesTab, day.id);
}

async function deleteDay(routineId, dayId) {
    const routine = findRoutine(routineId);
    const day = findDay(routine, dayId);

    if (!await askConfirm({ title: "Borrar día", message: `¿Borrar "${day.name}" y todos sus ejercicios? Esta acción no se puede deshacer.` })) return;

    routine.days = routine.days.filter(d => d.id !== dayId);
    renumberAutoDays(routine);
    saveState();
    flipRender(routinesBox(), renderRoutinesTab);
}

async function renameDay(routineId, dayId) {
    const routine = findRoutine(routineId);
    const day = findDay(routine, dayId);

    const name = await askText({ title: "Renombrar día", label: "Nombre del día", value: day.name, maxLength: 24 });
    if (!name) return;

    day.name = name;
    day.customName = true;
    saveState();
    renderRoutinesTab();
}

/* ---------- Nivel 3: ventana emergente del día con sus ejercicios ---------- */

const MAX_EXERCISES_PER_DAY = 12;
let daySheet = null;   /* { routineId, dayId, list } mientras la ventana está abierta */

const routineExercise = (routineId, dayId, exerciseId) =>
    findDay(findRoutine(routineId), dayId)?.exercises.find(e => e.id === exerciseId);

function openDaySheet(routineId, dayId) {
    const day = findDay(findRoutine(routineId), dayId);
    if (!day) return;

    const { sheet } = openSheet("day-sheet", day.name, () => { daySheet = null; });
    const list = document.createElement("div");
    list.className = "day-sheet-list";
    sheet.appendChild(list);

    daySheet = { routineId, dayId, list };
    renderDaySheet();
}

/* newKey: id del ejercicio recién creado (se transforma desde el botón de añadir) */
function renderDaySheet(newKey) {
    if (!daySheet) return;
    const { routineId, dayId, list } = daySheet;
    const day = findDay(findRoutine(routineId), dayId);
    if (!day) return;

    const draw = () => {
        list.innerHTML = "";
        day.exercises.forEach(ex => list.appendChild(buildRoutineExerciseCard(routineId, dayId, ex.id)));
        if (day.exercises.length < MAX_EXERCISES_PER_DAY) {
            list.appendChild(addSquare("Añadir ejercicio", () => addRoutineExercise(routineId, dayId), "add-wide"));
        }
    };

    if (newKey !== undefined) flipRender(list, draw, newKey);
    else draw();

    if (newKey) list.querySelector(`[data-key="add"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/* onCreated(id): qué hacer después de crear (por defecto, redibujar la ventana del día) */
function addRoutineExercise(routineId, dayId, onCreated) {
    const day = findDay(findRoutine(routineId), dayId);
    if (day.exercises.length >= MAX_EXERCISES_PER_DAY) return;

    /* Grupos musculares del día primero (Push: pecho, hombro, tríceps...), sin repetir los ya añadidos */
    const used = day.exercises.map(e => normalizeText(e.name));
    const priority = priorityGroups(day.name);
    const groups = Object.entries(EXERCISE_CATALOG)
        .sort(([a], [b]) => priorityIndex(priority, a) - priorityIndex(priority, b))
        .map(([title, names]) => ({
            title,
            items: names.filter(n => !used.includes(normalizeText(n))).map(n => ({ label: n, value: n }))
        }));

    openPicker({
        title: "Añadir ejercicio",
        groups,
        searchable: true,
        createLabel: "Nuevo ejercicio",
        onPick: name => createExercise(routineId, dayId, name, onCreated),
        onCreate: async query => {
            const name = await askText({ title: "Nuevo ejercicio", label: `Nombre del ejercicio (máx. ${EXERCISE_NAME_MAX} caracteres)`, value: query || "", maxLength: EXERCISE_NAME_MAX });
            if (name) createExercise(routineId, dayId, name, onCreated);
        }
    });
}

function createExercise(routineId, dayId, name, onCreated) {
    const day = findDay(findRoutine(routineId), dayId);
    name = name.slice(0, EXERCISE_NAME_MAX).trim();
    if (!name || day.exercises.length >= MAX_EXERCISES_PER_DAY) return;

    const exercise = { id: newId("ex"), name, kg: 0, unit: "kg", series: [{ min: 0, max: 0 }, { min: 0, max: 0 }, { min: 0, max: 0 }] };
    day.exercises.push(exercise);
    saveState();
    if (onCreated) onCreated(exercise.id); else renderDaySheet(exercise.id);
}

async function deleteRoutineExercise(routineId, dayId, exerciseId, after) {
    const day = findDay(findRoutine(routineId), dayId);
    const exercise = routineExercise(routineId, dayId, exerciseId);
    if (!exercise) return;

    if (!await askConfirm({ title: "Borrar ejercicio", message: `¿Borrar el ejercicio "${exercise.name}"? Esta acción no se puede deshacer.` })) return;

    day.exercises = day.exercises.filter(e => e.id !== exerciseId);
    saveState();
    if (after) after(); else renderDaySheet(null);
}

/* Tarjeta de ejercicio del creador:
     Press banca                        ✕
     [ 80  kg/lb ]  ×  [ 3 ]  ×  [ 8–12 ]
        peso           series      reps
   Cada número se cambia deslizando o tocándolo; "kg/lb" cambia la unidad. */
function buildRoutineExerciseCard(routineId, dayId, exerciseId) {
    const ex = () => routineExercise(routineId, dayId, exerciseId);
    const exercise = ex();

    const card = document.createElement("div");
    card.className = "exercise rx-card";
    card.dataset.key = exerciseId;

    const head = document.createElement("div");
    head.className = "rx-head";
    const name = document.createElement("div");
    name.className = "exercise-name";
    name.textContent = exercise.name;
    const xBtn = document.createElement("span");
    xBtn.className = "day-delete-x rx-x";
    xBtn.textContent = "✕";
    keyButton(xBtn, "Borrar ejercicio");
    xBtn.onclick = event => { event.stopPropagation(); deleteRoutineExercise(routineId, dayId, exerciseId); };
    const nameRow = document.createElement("div");
    nameRow.className = "ex-name-row";
    nameRow.append(name, exerciseGear(routineId, dayId, exerciseId, () => renderDaySheet()));
    head.append(nameRow, xBtn);

    const field = (cls, caption) => {
        const wrap = document.createElement("div");
        wrap.className = `rx-field ${cls}`;
        const small = document.createElement("small");
        small.textContent = caption;
        return [wrap, small];
    };
    const times = () => { const t = document.createElement("span"); t.className = "rx-times"; t.textContent = "×"; t.setAttribute("aria-hidden", "true"); return t; };

    /* Peso + botón kg/lb */
    const [kgField, kgCap] = field("rx-weight", "Peso");
    const kgBox = document.createElement("div");
    kgBox.className = "rx-kg";
    const kgValue = document.createElement("div");
    kgValue.className = "kg-value rx-num";
    kgValue.textContent = String(exercise.kg);
    const unitBtn = document.createElement("button");
    unitBtn.type = "button";
    unitBtn.className = "rx-unit";
    const paintUnit = () => {
        const u = unitOf(ex());
        unitBtn.innerHTML = `<span class="${u === "kg" ? "on" : ""}">kg</span>/<span class="${u === "lb" ? "on" : ""}">lb</span>`;
        unitBtn.setAttribute("aria-label", `Unidad: ${u}. Toca para cambiar a ${u === "kg" ? "lb" : "kg"}`);
    };
    paintUnit();
    unitBtn.onclick = () => { const e = ex(); e.unit = unitOf(e) === "kg" ? "lb" : "kg"; saveState(); paintUnit(); };
    attachValueSwipe(kgValue, dir => changeRoutineKg(routineId, dayId, exerciseId, dir * KG_STEP, kgValue), () => openStepper({
        title: exercise.name,
        subtitle: "Peso",
        unit: () => unitOf(ex()),
        read: () => String(ex().kg),
        step: dir => changeRoutineKg(routineId, dayId, exerciseId, dir * KG_STEP, null),
        onEdit: text => { const n = parseAmount(text); if (n === null) return "x"; setRoutineKg(routineId, dayId, exerciseId, n); return ""; },
        onClose: () => renderDaySheet()
    }));
    kgBox.append(kgValue, unitBtn);
    kgField.append(kgBox, kgCap);

    /* Series */
    const [setsField, setsCap] = field("rx-sets", "Series");
    const setsValue = document.createElement("div");
    setsValue.className = "reps-value rx-num";
    setsValue.textContent = String(exercise.series.length);
    attachValueSwipe(setsValue, dir => changeRoutineSets(routineId, dayId, exerciseId, dir, setsValue), () => openStepper({
        title: exercise.name,
        subtitle: `Series (de 1 a ${MAX_SERIES_PER_EXERCISE})`,
        unit: "series",
        read: () => String(ex().series.length),
        step: dir => changeRoutineSets(routineId, dayId, exerciseId, dir, null),
        editMode: "numeric",
        onEdit: text => {
            const n = parseAmount(text, { integer: true, max: MAX_SERIES_PER_EXERCISE });
            if (n === null || n < 1) return "x";
            changeRoutineSets(routineId, dayId, exerciseId, n - ex().series.length, null);
            return "";
        },
        onClose: () => renderDaySheet()
    }));
    setsField.append(setsValue, setsCap);

    /* Rango de repeticiones */
    const [repsField, repsCap] = field("rx-reps", "Reps");
    const repsValue = document.createElement("div");
    repsValue.className = "reps-value rx-num";
    repsValue.textContent = fmtRange(rangeOf(exercise));
    attachValueSwipe(repsValue, dir => shiftRoutineRange(routineId, dayId, exerciseId, dir, repsValue), () => openRangeEditor(routineId, dayId, exerciseId));
    repsField.append(repsValue, repsCap);

    const row = document.createElement("div");
    row.className = "rx-row";
    row.append(kgField, times(), setsField, times(), repsField);

    card.append(head, row);
    return card;
}

function setRoutineKg(routineId, dayId, exerciseId, value) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    exercise.kg = value;
    syncKgToToday(routineId, exercise);
    saveState();
}

function changeRoutineKg(routineId, dayId, exerciseId, delta, valueBox) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    const before = exercise.kg;
    exercise.kg = Math.max(0, exercise.kg + delta);
    syncKgToToday(routineId, exercise);
    saveState();
    if (valueBox && exercise.kg !== before) animateValue(valueBox, delta > 0 ? 1 : -1, String(exercise.kg));
}

/* Cambia el número de series (1 a 6): las nuevas copian el rango de repeticiones */
function changeRoutineSets(routineId, dayId, exerciseId, delta, valueBox) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    const before = exercise.series.length;
    const n = Math.min(MAX_SERIES_PER_EXERCISE, Math.max(1, before + delta));
    const [lo, hi] = rangeOf(exercise);
    exercise.series = Array.from({ length: n }, () => ({ min: lo, max: hi }));

    /* el registro de hoy se ajusta a las series nuevas; las extra se quedan al final */
    const logged = state.logs[routineId]?.[dateKey()]?.exercises?.[exercise.id];
    if (logged) logged.reps = Array.from({ length: n }, (_, i) => (i < before ? logged.reps[i] || 0 : 0)).concat(logged.reps.slice(before));
    saveState();
    if (valueBox && n !== before) animateValue(valueBox, delta > 0 ? 1 : -1, String(n));
}

function setRoutineRange(routineId, dayId, exerciseId, lo, hi) {
    const exercise = routineExercise(routineId, dayId, exerciseId);
    exercise.series = exercise.series.map(() => ({ min: lo, max: hi }));
    saveState();
}

/* Deslizar sobre el rango lo mueve entero (8–12 → 9–13; 10 → 11) */
function shiftRoutineRange(routineId, dayId, exerciseId, dir, valueBox) {
    const [lo, hi] = rangeOf(routineExercise(routineId, dayId, exerciseId));
    if (lo + dir < 0) return;
    setRoutineRange(routineId, dayId, exerciseId, lo + dir, hi + dir);
    if (valueBox) animateValue(valueBox, dir, fmtRange([lo + dir, hi + dir]));
}

/* Ventana para el rango: mínimo y máximo, cada uno se desliza, usa ▲ ▼ o se toca para escribirlo.
   Si son iguales, es un número fijo. */
function openRangeEditor(routineId, dayId, exerciseId, onDone = () => renderDaySheet()) {
    const ex = () => routineExercise(routineId, dayId, exerciseId);
    const { sheet, close } = openSheet("range-sheet", ex().name, onDone);

    const sub = document.createElement("div");
    sub.className = "stepper-sub";
    sub.textContent = "Repeticiones por serie";

    const cols = document.createElement("div");
    cols.className = "range-cols";
    const boxes = {};

    const apply = (which, dir, typed) => {
        const [lo, hi] = rangeOf(ex());
        let nlo = lo, nhi = hi;
        if (which === "min") { nlo = typed ?? Math.max(0, lo + dir); if (nlo > nhi) nhi = nlo; }
        else { nhi = typed ?? Math.max(0, hi + dir); if (nhi < nlo) nlo = nhi; }
        setRoutineRange(routineId, dayId, exerciseId, nlo, nhi);
        const d = dir || 1;
        if (nlo !== lo && !(typed != null && which === "min")) animateValue(boxes.min, d, String(nlo));
        if (nhi !== hi && !(typed != null && which === "max")) animateValue(boxes.max, d, String(nhi));
        paintNote();
    };

    ["min", "max"].forEach(which => {
        const col = document.createElement("div");
        col.className = "range-col";
        const label = document.createElement("div");
        label.className = "range-label";
        label.textContent = which === "min" ? "Mínimo" : "Máximo";
        const up = document.createElement("button");
        up.type = "button";
        up.className = "stepper-btn";
        up.setAttribute("aria-label", `Subir ${label.textContent.toLowerCase()}`);
        up.textContent = "▲";
        const down = document.createElement("button");
        down.type = "button";
        down.className = "stepper-btn";
        down.setAttribute("aria-label", `Bajar ${label.textContent.toLowerCase()}`);
        down.textContent = "▼";
        const box = document.createElement("div");
        box.className = "stepper-value range-value";
        box.textContent = String(rangeOf(ex())[which === "min" ? 0 : 1]);
        boxes[which] = box;

        bindHold(up, () => apply(which, 1));
        bindHold(down, () => apply(which, -1));
        attachValueSwipe(box, dir => apply(which, dir), () => editInBox(box, {
            read: () => String(rangeOf(ex())[which === "min" ? 0 : 1]),
            editMode: "numeric",
            onEdit: text => { const n = parseAmount(text, { integer: true, max: 999 }); if (n === null) return "x"; apply(which, 0, n); return ""; }
        }), 34);

        col.append(label, up, box, down);
        cols.appendChild(col);
    });

    const note = document.createElement("div");
    note.className = "stepper-hint";
    const paintNote = () => {
        const r = rangeOf(ex());
        note.textContent = r[0] === r[1] ? `Número fijo: ${r[0]} repeticiones` : `Rango: de ${r[0]} a ${r[1]} repeticiones`;
    };
    paintNote();

    const done = document.createElement("button");
    done.type = "button";
    done.className = "dialog-btn accept range-done";
    done.textContent = "Listo";
    done.onclick = close;

    sheet.append(sub, cols, note, done);
}

/* ---------- Piezas reutilizables del creador de rutinas ---------- */

/* Un <span> que actúa como botón: se puede enfocar y pulsar con Enter o Espacio */
function keyButton(el, label) {
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    if (label) el.setAttribute("aria-label", label);
    el.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        el.click();
    });
}

function attachLongPress(el, callback) {
    let timer = null;

    let sx = 0, sy = 0;

    const start = (event) => {
        if (event.type === "mousedown" && event.button !== 0) return;
        const point = event.touches ? event.touches[0] : event;
        sx = point.clientX; sy = point.clientY;
        timer = setTimeout(callback, 550);
    };

    const cancel = () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
    };

    el.addEventListener("mousedown", start);
    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("mouseup", cancel);
    el.addEventListener("mouseleave", cancel);
    el.addEventListener("touchend", cancel);
    el.addEventListener("touchcancel", cancel);
    el.addEventListener("touchmove", cancel);
    el.addEventListener("pointermove", e => { if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) cancel(); });
}

/* Deslizar verticalmente sobre un número lo sube (arriba) o lo baja (abajo):
   un paso cada VALUE_STEP_PX píxeles, con la animación del número. */
const VALUE_STEP_PX = 26;

/* Deslizar sobre el número lo sube/baja (un paso cada stepPx px). Un toque corto (sin mover) llama a onTap. */
function attachValueSwipe(el, onStep, onTap, stepPx = VALUE_STEP_PX) {
    let lastY = null, pointer = null, startX = 0, startY = 0, startT = 0, moved = false;

    el.addEventListener("pointerdown", e => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.target.closest && e.target.closest("input")) return;
        lastY = startY = e.clientY;
        startX = e.clientX;
        startT = performance.now();
        moved = false;
        pointer = e.pointerId;
        try { el.setPointerCapture(pointer); } catch (err) {}
    });

    el.addEventListener("pointermove", e => {
        if (lastY === null || e.pointerId !== pointer) return;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) moved = true;

        let dy = e.clientY - lastY;
        while (Math.abs(dy) >= stepPx) {
            const dir = dy < 0 ? 1 : -1;          /* arriba = subir */
            onStep(dir);
            lastY -= dir * stepPx;
            dy = e.clientY - lastY;
        }
    });

    el.addEventListener("pointerup", () => {
        const tap = lastY !== null && !moved && onTap && performance.now() - startT < 400;
        lastY = null; pointer = null;
        if (tap) onTap();
    });
    el.addEventListener("pointercancel", () => { lastY = null; pointer = null; });
}

function refreshWorkout() {
    renderWorkoutForDay(activeWorkout.routineId, activeWorkout.dayId);
    renderSeriesPanel();
}

/* Botones ▲ ▼: un paso al tocar; si se mantienen, se repite */
function bindHold(btn, fn) {
    let timer = null, interval = null;
    const stop = () => { clearTimeout(timer); clearInterval(interval); timer = interval = null; };
    btn.addEventListener("pointerdown", e => {
        e.preventDefault();
        fn();
        timer = setTimeout(() => { interval = setInterval(fn, 110); }, 420);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, stop));
    btn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
}

/* Tocar un número lo convierte en un campo de texto: se abre el teclado, Enter aplica y Escape cancela.
   onEdit(texto) devuelve "" si sirve o un texto de error (el campo se marca en rojo). */
function editInBox(box, { read, onEdit, editMode }) {
    if (box.classList.contains("editing")) return;

    const input = document.createElement("input");
    input.type = "text";
    input.className = "stepper-input";
    input.inputMode = editMode || "decimal";
    input.enterKeyHint = "done";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 7;
    input.setAttribute("aria-label", "Escribir valor");
    input.value = read().replace(".", ",");

    box.textContent = "";
    box.classList.add("editing");
    box.appendChild(input);
    input.focus();
    input.select();

    let finished = false;
    const finish = (commit, fromBlur) => {
        if (finished) return;
        if (commit) {
            const text = input.value.trim();
            const problem = text ? onEdit(text) : "vacío";
            if (problem && !fromBlur) { input.classList.add("bad"); return; }
        }
        finished = true;
        box.classList.remove("editing");
        box.textContent = read();
    };

    input.addEventListener("keydown", e => {
        e.stopPropagation();
        if (e.key === "Enter") { e.preventDefault(); finish(true, false); }
        else if (e.key === "Escape") { e.preventDefault(); finish(false, false); }
    });
    input.addEventListener("input", () => input.classList.remove("bad"));
    input.addEventListener("blur", () => finish(true, true));
}

/* ---------- Ajustes de un ejercicio (tuerca junto al nombre) ----------
   Cambiar el nombre y elegir la imagen en una galería. onChange(ejercicio) actualiza la tarjeta. */
const GEAR_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

function exerciseGear(routineId, dayId, exerciseId, onChange) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ex-gear";
    btn.setAttribute("aria-label", "Ajustes del ejercicio");
    btn.innerHTML = GEAR_SVG;
    btn.addEventListener("pointerdown", e => e.stopPropagation());
    btn.onclick = e => { e.stopPropagation(); openExerciseSettings(routineId, dayId, exerciseId, onChange); };
    return btn;
}

function openExerciseSettings(routineId, dayId, exerciseId, onChange) {
    const ex = () => routineExercise(routineId, dayId, exerciseId);
    if (!ex()) return;
    const { sheet } = openSheet("ex-settings-sheet", "Ejercicio");
    const body = document.createElement("div");
    body.className = "ex-settings";
    sheet.appendChild(body);

    const changed = () => { saveState(); if (onChange) onChange(ex()); };

    const label = text => { const l = document.createElement("div"); l.className = "settings-label"; l.textContent = text; return l; };
    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.className = "ex-rename";
    const paintName = () => { nameBtn.innerHTML = `<span>${esc(ex().name)}</span><small>Cambiar nombre</small>`; };
    paintName();
    nameBtn.onclick = async () => {
        const value = await askText({ title: "Cambiar nombre", label: `Nombre del ejercicio (máx. ${EXERCISE_NAME_MAX} caracteres)`, value: ex().name, maxLength: EXERCISE_NAME_MAX });
        if (!value || value === ex().name) return;
        ex().name = value;
        paintName();
        paintGallery();
        changed();
    };

    const note = document.createElement("p");
    note.className = "settings-note";
    note.textContent = "Elige la imagen del ejercicio. \"Automática\" la elige según el nombre.";
    const gallery = document.createElement("div");
    gallery.className = "ex-gallery";
    const options = [
        { key: "", label: "Automática" },
        ...Object.entries(EQUIPMENT_FIGURES).map(([key, f]) => ({ key, label: f.label })),
        ...Object.keys(FIGURE_POSES).map(key => ({ key, label: "" }))
    ];
    const paintGallery = () => {
        const current = ex().fig || "";
        gallery.innerHTML = "";
        options.forEach(o => {
            const tile = document.createElement("button");
            tile.type = "button";
            tile.className = "ex-tile" + (o.key === current ? " selected" : "");
            tile.setAttribute("aria-label", o.label || "Pose");
            tile.innerHTML = exerciseFigure(ex().name, o.key || undefined) + (o.label ? `<small>${esc(o.label)}</small>` : "");
            tile.onclick = () => {
                if (o.key) ex().fig = o.key; else delete ex().fig;
                paintGallery();
                changed();
            };
            gallery.appendChild(tile);
        });
    };
    paintGallery();

    body.append(label("Nombre"), nameBtn, label("Imagen"), note, gallery);
}
