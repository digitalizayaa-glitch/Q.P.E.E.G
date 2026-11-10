/* =========================================================
    ENTRENAMIENTO: CARRUSELES DE KG Y REPS
========================================================= */

const KG_STEP = 2.5;

/* Entreno en vertical: se ven 2 ejercicios completos y la mitad del siguiente.
   Cada deslizamiento vertical avanza (o retrocede) exactamente un ejercicio, con desplazamiento suave.
   workoutPage = índice del ejercicio que queda arriba. */
let workoutPage = 0;
let activeWorkout = { routineId: null, dayId: null };

function renderWorkoutForDay(routineId, dayId) {
    const container = document.getElementById("workoutExercises");
    container.innerHTML = "";
    container.dataset.scroll = "1";     /* el ajuste del diseño no cuenta lo que queda bajo la pantalla */

    const routine = findRoutine(routineId);
    const day = routine ? findDay(routine, dayId) : null;
    if (!day) return;

    const track = document.createElement("div");
    track.className = "workout-track";
    day.exercises.forEach(exercise => track.appendChild(buildExerciseCard(routineId, dayId, exercise.id)));

    /* entreno extraordinario: se pueden añadir ejercicios ahí mismo */
    if (routineId === EXTRA_ROUTINE_ID && day.exercises.length < MAX_EXERCISES_PER_DAY) {
        track.appendChild(addSquare("Añadir ejercicio", () => addRoutineExercise(routineId, dayId, id => { refreshWorkout(); scrollWorkoutTo(id); }), "add-wide workout-add"));
    }
    container.appendChild(track);

    /* alto de cada tarjeta: caben 2 y media */
    const gap = 10;
    track.style.setProperty("--card-h", `${Math.max(150, (container.clientHeight - 2 * gap) / 2.5)}px`);

    day.exercises.forEach(exercise => updateSemaphore(routineId, dayId, exercise.id));

    workoutPage = Math.min(workoutPage, workoutStops().length - 1);
    setWorkoutOffset(workoutStops()[workoutPage] || 0, false);
    renderWorkoutDots();
}

/* Posiciones donde se detiene la lista: el inicio de cada tarjeta, sin pasar del final */
function workoutStops() {
    const container = document.getElementById("workoutExercises");
    const track = container.querySelector(".workout-track");
    if (!track) return [0];
    const max = Math.max(0, track.scrollHeight - container.clientHeight);
    const stops = [...track.children].map(c => Math.min(c.offsetTop, max));
    return [...new Set(stops.map(v => Math.round(v)))].sort((a, b) => a - b);
}

function setWorkoutOffset(y, animate) {
    const track = document.querySelector("#workoutExercises .workout-track");
    if (!track) return Promise.resolve();
    track.getAnimations().forEach(a => a.cancel());
    const from = track._y || 0;
    track._y = y;
    track.style.transform = `translateY(${-y}px)`;
    if (!animate) return Promise.resolve();
    return track.animate([{ transform: `translateY(${-from}px)` }, { transform: `translateY(${-y}px)` }],
        { duration: 340 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)" }).finished.catch(() => {});
}

function renderWorkoutDots() {
    renderDots(document.getElementById("workoutDots"), workoutStops().length, workoutPage);
}

function shiftWorkoutPage(direction) {
    const stops = workoutStops();
    workoutPage = Math.max(0, Math.min(stops.length - 1, workoutPage + direction));
    renderWorkoutDots();
    return setWorkoutOffset(stops[workoutPage], true);
}

/* Lleva la lista hasta un ejercicio (por ejemplo, el recién añadido) */
function scrollWorkoutTo(exerciseId) {
    const card = document.querySelector(`#workoutExercises [data-exercise="${exerciseId}"]`);
    if (!card) return;
    const stops = workoutStops();
    let i = stops.findIndex(v => v >= Math.min(card.offsetTop, stops[stops.length - 1]));
    if (i < 0) i = stops.length - 1;
    workoutPage = i;
    renderWorkoutDots();
    setWorkoutOffset(stops[i], true);
}

function getWorkoutExercise(routineId, dayId, exerciseId) {
    const day = findDay(findRoutine(routineId), dayId);
    return day ? day.exercises.find(e => e.id === exerciseId) : undefined;
}

/* Tarjeta de Entreno:
     Press banca                              ● Faltan reps
     [ 80 | kg/lb ] × 4 × 8–12  │  figura de      ← plan del día
       I    II   III   IV       │  cristal        ← series teñidas según su estado (4 por fila)
       V                        │  haciendo el
                                │  ejercicio
     [ + Añadir serie extra ]                     ← siempre dorada (progreso) */
const SERIE_LABEL = { green: "En meta", gold: "Superado", red: "Faltan reps", pending: "Sin empezar" };

function buildExerciseCard(routineId, dayId, exerciseId) {
    const ex = () => getWorkoutExercise(routineId, dayId, exerciseId);
    const e0 = ex();
    const key = getWorkoutDateKey();
    const log = readExerciseLog(routineId, key, e0);
    const ranges = targetsFor(routineId, key, e0);

    const card = document.createElement("div");
    card.className = "exercise wb-card";
    card.dataset.exercise = exerciseId;

    const head = document.createElement("div");
    head.className = "wb-head";
    const name = document.createElement("div");
    name.className = "exercise-name";
    name.textContent = e0.name;
    const badge = document.createElement("span");
    badge.className = "wb-badge";
    badge.id = `badge-${exerciseId}`;
    badge.innerHTML = `<i></i><span></span>`;
    const nameRow = document.createElement("div");
    nameRow.className = "ex-name-row";
    nameRow.append(name, exerciseGear(routineId, dayId, exerciseId, ex => {
        name.textContent = ex.name;
        figure.innerHTML = exerciseFigure(ex.name, ex.fig);
        renderSeriesPanel();
    }));
    head.append(nameRow, badge);

    /* Plan del día: peso (editable) × series × reps */
    const plan = document.createElement("div");
    plan.className = "wb-plan";
    const kgBox = document.createElement("div");
    kgBox.className = "rx-kg wb-kg";
    const kgValue = document.createElement("div");
    kgValue.className = "kg-value";
    kgValue.id = `kg-${exerciseId}`;
    kgValue.textContent = String(log.kg);
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
    attachValueSwipe(kgValue, dir => changeWorkoutKg(routineId, dayId, exerciseId, dir * KG_STEP), () => openStepper({
        title: e0.name,
        subtitle: "Peso",
        unit: () => unitOf(ex()),
        read: () => String(readExerciseLog(routineId, getWorkoutDateKey(), ex()).kg),
        step: dir => changeWorkoutKg(routineId, dayId, exerciseId, dir * KG_STEP),
        onEdit: text => { const n = parseAmount(text); if (n === null) return "x"; setWorkoutKg(routineId, dayId, exerciseId, n); return ""; },
        onClose: refreshWorkout
    }));
    kgBox.append(kgValue, unitBtn);

    const planValue = (value, caption) => {
        const d = document.createElement("div");
        d.className = "wb-pv";
        d.innerHTML = `<b></b><small>${caption}</small>`;
        d.querySelector("b").textContent = value;
        return d;
    };
    const times = () => { const t = document.createElement("span"); t.className = "rx-times wb-times"; t.textContent = "×"; return t; };
    const setsPv = planValue(String(e0.series.length), "Series");
    const repsPv = planValue(fmtRange(ranges[0] || rangeOf(e0)), "Reps");
    plan.append(kgBox, times(), setsPv, times(), repsPv);

    if (routineId === EXTRA_ROUTINE_ID) {
        const xBtn = document.createElement("span");
        xBtn.className = "day-delete-x wb-x";
        xBtn.textContent = "✕";
        keyButton(xBtn, "Quitar ejercicio");
        xBtn.onclick = e => { e.stopPropagation(); deleteRoutineExercise(routineId, dayId, exerciseId, refreshWorkout); };
        head.appendChild(xBtn);

        [setsPv, repsPv].forEach(el => { el.classList.add("editable"); keyButton(el, el === setsPv ? "Cambiar series" : "Cambiar repeticiones"); });
        setsPv.onclick = () => openStepper({
            title: e0.name, subtitle: `Series (de 1 a ${MAX_SERIES_PER_EXERCISE})`, unit: "series",
            read: () => String(ex().series.length),
            step: dir => changeRoutineSets(routineId, dayId, exerciseId, dir, null),
            editMode: "numeric",
            onEdit: text => {
                const n = parseAmount(text, { integer: true, max: MAX_SERIES_PER_EXERCISE });
                if (n === null || n < 1) return "x";
                changeRoutineSets(routineId, dayId, exerciseId, n - ex().series.length, null);
                return "";
            },
            onClose: refreshWorkout
        });
        repsPv.onclick = () => openRangeEditor(routineId, dayId, exerciseId, refreshWorkout);
    }

    const seriesRow = document.createElement("div");
    seriesRow.className = "wb-sets";
    seriesRow.id = `series-row-${exerciseId}`;

    /* izquierda: plan y series (4 por fila) · derecha: la figura de cristal haciendo el ejercicio */
    const left = document.createElement("div");
    left.className = "wb-left";
    left.append(plan, seriesRow);
    const figure = document.createElement("div");
    figure.className = "wb-figure";
    figure.innerHTML = exerciseFigure(e0.name, e0.fig);
    const body = document.createElement("div");
    body.className = "wb-body";
    body.append(left, figure);

    card.append(head, body);

    renderWorkoutSeries(routineId, dayId, exerciseId, card);
    return card;
}

function renderWorkoutSeries(routineId, dayId, exerciseId, cardEl) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const key = getWorkoutDateKey();
    const log = readExerciseLog(routineId, key, ex);
    const row = (cardEl || document.querySelector(`.exercise[data-exercise="${exerciseId}"]`))
        .querySelector(`#series-row-${exerciseId}`);

    row.innerHTML = "";
    const regular = ex.series.length;

    log.reps.forEach((reps, index) => {
        const isExtra = index >= regular;
        const wrap = document.createElement("div");
        wrap.className = "wb-serie" + (isExtra ? " extra" : "");
        wrap.dataset.i = index;
        wrap.innerHTML = `
            <span class="serie-label">${isExtra ? "+" : ""}${toRoman(index + 1)}</span>
            <div class="reps-value">${reps}</div>
        `;
        const valueBox = wrap.querySelector(".reps-value");
        const current = () => readExerciseLog(routineId, getWorkoutDateKey(), getWorkoutExercise(routineId, dayId, exerciseId));
        attachValueSwipe(valueBox, dir => changeWorkoutReps(routineId, dayId, exerciseId, index, dir, valueBox), () => openStepper({
            title: ex.name,
            subtitle: isExtra
                ? `Serie extra ${toRoman(index + 1)} · repeticiones (cuenta como progreso)`
                : `Serie ${toRoman(index + 1)} · repeticiones (meta ${fmtRange(targetsFor(routineId, getWorkoutDateKey(), ex)[index] || rangeOf(ex))})`,
            unit: "reps",
            read: () => String(current().reps[index] ?? 0),
            step: dir => changeWorkoutReps(routineId, dayId, exerciseId, index, dir, null),
            editMode: "numeric",
            onEdit: text => { const n = parseAmount(text, { integer: true, max: 999 }); if (n === null) return "x"; setWorkoutReps(routineId, dayId, exerciseId, index, n, false); return ""; },
            extra: isExtra
                ? { label: "Quitar serie extra", onClick: () => { removeExtraSerie(routineId, dayId, exerciseId, index); return true; } }
                : (index < log.reps.length - 1 ? { label: "Rellenar", onClick: () => { setWorkoutReps(routineId, dayId, exerciseId, index, current().reps[index], true); return true; } } : null),
            onClose: refreshWorkout
        }));
        row.appendChild(wrap);
    });

    /* "+" con forma de serie, junto a las demás: añade una serie extra (máximo 8 en total) */
    if (log.reps.length < MAX_SERIES_PER_EXERCISE) {
        const add = document.createElement("div");
        add.className = "wb-serie wb-add-serie";
        add.innerHTML = `<span class="serie-label">Extra</span>`;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "reps-value wb-add-btn";
        btn.setAttribute("aria-label", "Añadir serie extra");
        btn.textContent = "+";
        btn.onclick = () => addExtraSerie(routineId, dayId, exerciseId);
        add.appendChild(btn);
        row.appendChild(add);
    }

    updateSemaphore(routineId, dayId, exerciseId);
}

function addExtraSerie(routineId, dayId, exerciseId) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const regular = ex.series.length;
    if (regular + (log.extra || 0) >= MAX_SERIES_PER_EXERCISE) return;
    log.reps = Array.from({ length: regular + (log.extra || 0) }, (_, i) => log.reps[i] || 0).concat(0);
    log.extra = (log.extra || 0) + 1;
    saveState();
    refreshWorkout();
    const card = document.querySelector(`.exercise[data-exercise="${exerciseId}"]`);
    const added = card && [...card.querySelectorAll(".wb-serie:not(.wb-add-serie)")].pop();
    if (added) { added.animate([{ opacity: 0, transform: "scale(.8)" }, { opacity: 1, transform: "none" }], { duration: 300 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)" }); glowOnce(added.querySelector(".reps-value")); }
}

function removeExtraSerie(routineId, dayId, exerciseId, index) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    if (!log.extra || index < ex.series.length) return;
    log.reps.splice(index, 1);
    log.extra -= 1;
    saveState();
}

/* La unidad (kg / lb) es solo un texto de cada ejercicio: nunca convierte los números */
const unitOf = ex => (ex && ex.unit === "lb" ? "lb" : "kg");

/* Números escritos a mano: acepta coma o punto. Devuelve null si no sirve. */
function parseAmount(text, { integer = false, max = 9999 } = {}) {
    const n = parseFloat(String(text).replace(",", "."));
    if (isNaN(n) || n < 0 || n > max) return null;
    return integer ? Math.round(n) : Math.round(n * 100) / 100;
}

function setWorkoutKg(routineId, dayId, exerciseId, value) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex).kg = value;
    if (!selectedDate) ex.kg = value;
    saveState();
}

/* Pone `value` repeticiones en la serie `index` y, si fill = true, también en todas las siguientes */
function setWorkoutReps(routineId, dayId, exerciseId, index, value, fill) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const total = ex.series.length + (log.extra || 0);
    for (let i = index; i < total; i++) { if (i === index || fill) log.reps[i] = value; }
    saveState();
    updateSemaphore(routineId, dayId, exerciseId);
    renderSeriesPanel();
}

/* Si el ejercicio ya tiene registro de hoy, su peso se actualiza para que Entreno y Rutina coincidan */
function syncKgToToday(routineId, exercise) {
    const logged = state.logs[routineId]?.[dateKey()]?.exercises?.[exercise.id];
    if (logged) logged.kg = exercise.kg;
}

function changeWorkoutKg(routineId, dayId, exerciseId, delta) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const before = log.kg;
    log.kg = Math.max(0, log.kg + delta);
    if (!selectedDate) ex.kg = log.kg;   /* el peso de hoy también queda en la rutina (los días pasados no la tocan) */
    saveState();
    const box = document.getElementById(`kg-${exerciseId}`);
    if (box && log.kg !== before) animateValue(box, delta > 0 ? 1 : -1, String(log.kg));
}

function changeWorkoutReps(routineId, dayId, exerciseId, index, delta, valueBox) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const log = ensureExerciseLog(routineId, getWorkoutDateKey(), dayId, ex);
    const before = log.reps[index] || 0;
    log.reps[index] = Math.max(0, before + delta);
    saveState();

    if (valueBox && log.reps[index] !== before) animateValue(valueBox, delta > 0 ? 1 : -1, String(log.reps[index]));
    updateSemaphore(routineId, dayId, exerciseId);
    renderSeriesPanel();
}

function toRoman(number) {
    const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
    return romans[number - 1] || number;
}

/* =========================================================
    SEMÁFORO (verde / dorado / rojo)
========================================================= */

function updateSemaphore(routineId, dayId, exerciseId) {
    const ex = getWorkoutExercise(routineId, dayId, exerciseId);
    const badge = document.getElementById(`badge-${exerciseId}`);
    if (!badge || !ex) return;

    const key = getWorkoutDateKey();
    const ranges = targetsFor(routineId, key, ex);
    const reps = readExerciseLog(routineId, key, ex).reps;
    const status = exerciseStatus(ranges, reps);

    badge.className = `wb-badge ${status}`;
    badge.querySelector("span").textContent = SERIE_LABEL[status];

    const row = document.getElementById(`series-row-${exerciseId}`);
    if (row) row.querySelectorAll(".wb-serie").forEach(el => {
        const i = Number(el.dataset.i);
        const st = i >= ex.series.length ? "gold" : serieStatus(ranges[i] || rangeOf(ex), reps[i]);
        el.classList.remove("green", "gold", "red");
        if (st) el.classList.add(st);
    });
}
