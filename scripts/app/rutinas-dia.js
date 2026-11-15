/* =========================================================
    RUTINAS — ventana emergente del día con sus ejercicios (editor)
========================================================= */

/* ---------- Nivel 3: ventana emergente del día con sus ejercicios ---------- */

const MAX_EXERCISES_PER_DAY = 12;
let daySheet = null;   /* { routineId, dayId, list } mientras la ventana está abierta */

const routineExercise = (routineId, dayId, exerciseId) =>
    findDay(findRoutine(routineId), dayId)?.exercises.find(e => e.id === exerciseId);

function openDaySheet(routineId, dayId) {
    const day = findDay(findRoutine(routineId), dayId);
    if (!day) return;

    const { sheet } = openSheet("day-sheet", day.name, () => { daySheet = null; });

    /* Tuerca junto al título: cambiar el orden de los ejercicios del día */
    const title = sheet.querySelector(".picker-title");
    const titleRow = document.createElement("div");
    titleRow.className = "ex-name-row day-title-row";
    title.replaceWith(titleRow);
    const gear = document.createElement("button");
    gear.type = "button";
    gear.className = "ex-gear";
    gear.setAttribute("aria-label", "Ordenar ejercicios");
    gear.innerHTML = GEAR_SVG;
    gear.onclick = () => openExerciseOrder(routineId, dayId);
    titleRow.append(title, gear);

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
    }), VALUE_STEP_PX, { area: kgField, glow: kgBox });     /* todo el cuadro (número, kg/lb y "Peso") */
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
    }), VALUE_STEP_PX, { area: setsField, glow: setsValue });
    setsField.append(setsValue, setsCap);

    /* Rango de repeticiones */
    const [repsField, repsCap] = field("rx-reps", "Reps");
    const repsValue = document.createElement("div");
    repsValue.className = "reps-value rx-num";
    repsValue.textContent = fmtRange(rangeOf(exercise));
    attachValueSwipe(repsValue, dir => shiftRoutineRange(routineId, dayId, exerciseId, dir, repsValue), () => openRangeEditor(routineId, dayId, exerciseId),
        VALUE_STEP_PX, { area: repsField, glow: repsValue });
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
