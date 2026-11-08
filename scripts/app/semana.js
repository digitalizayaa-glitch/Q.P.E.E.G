/* =========================================================
    SEMANA
========================================================= */

/* Orden cíclico de pestañas que recorre el deslizamiento horizontal */
const TAB_ORDER = [
    { id: "week", label: "SEMANA" },
    { id: "exercises", label: "RUTINAS" },
    { id: "food", label: "COMIDA" },
    { id: "history", label: "HISTORIAL" }
];

/* Deslizar recorre TAB_ORDER en bucle; desde Entreno
   (que no pertenece a TAB_ORDER) salen tomando "Semana" como base */
function shiftWeekTab(direction) {
    selectedDate = null;
    foodDate = null;

    const current = document.querySelector(".section.active").id;
    let currentIndex = TAB_ORDER.findIndex(tab => tab.id === current);
    if (currentIndex === -1) currentIndex = TAB_ORDER.findIndex(tab => tab.id === "week");

    const nextIndex = (currentIndex + direction + TAB_ORDER.length) % TAB_ORDER.length;
    showSection(TAB_ORDER[nextIndex].id);
}

/* Muestra los días de la rutina activa, o el mensaje de selección */
/* Pantalla de Semana sin rutina activa (o con una rutina sin días) */
function weekEmptyState(hasRoutine) {
    const box = document.createElement("div");
    box.className = "week-empty";
    box.innerHTML = `
        <div class="week-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
                <path d="M6 20v8M12 15v18M36 15v18M42 20v8M12 24h24"/>
            </svg>
        </div>
        <h3>${hasRoutine ? "Tu rutina aún no tiene días" : "Tu semana empieza aquí"}</h3>
        <p>${hasRoutine
            ? "Añade los días de tu rutina en el creador de rutinas y vuelve para elegir el de hoy."
            : "Crea tu rutina en el creador de rutinas y actívala. Aquí verás tus días para entrenar cada día."}</p>`;
    const go = document.createElement("button");
    go.type = "button";
    go.className = "food-start week-empty-btn";
    go.textContent = "Ir al creador de rutinas";
    go.onclick = () => navFade(() => showSection("exercises"));
    box.appendChild(go);
    return box;
}

function renderWeekSection() {
    const container = document.getElementById("weekRoutineContent");
    container.innerHTML = "";

    const routine = state.activeRoutineId ? findRoutine(state.activeRoutineId) : null;

    if (!routine || routine.days.length === 0) {
        if (!routine) state.activeRoutineId = null;
        container.append(weekEmptyState(!!routine), weekActions());
        return;
    }

    const picker = document.createElement("div");
    picker.className = "split-picker";

    routine.days.forEach(day => {
        const btn = document.createElement("button");
        btn.className = "split-card";
        btn.textContent = day.name;
        btn.onclick = () => navFade(() => startWorkoutDay(routine.id, day.id));
        picker.appendChild(btn);
    });

    container.appendChild(picker);

    const caption = document.createElement("p");
    caption.className = "split-caption";
    caption.textContent = "Elige el día de hoy";
    container.append(caption, weekActions());
}

/* ---------- Entreno extraordinario ----------
   Un día "Extraordinario" por fecha dentro de una rutina interna que no se ve en Rutinas.
   Cuenta como entreno: semáforo, calendario y gráfica (con su propio color). */
function ensureExtraDay(key) {
    let routine = findRoutine(EXTRA_ROUTINE_ID);
    if (!routine) {
        routine = { id: EXTRA_ROUTINE_ID, name: "Extraordinario", preset: null, days: [] };
        state.routines.push(routine);
    }
    const id = `xd-${key}`;
    let day = findDay(routine, id);
    if (!day) {
        day = { id, name: "Extraordinario", customName: true, exercises: [] };
        routine.days.push(day);
    }
    return day;
}

function extraDayFor(key) {
    return findDay(findRoutine(EXTRA_ROUTINE_ID), `xd-${key}`);
}

function startExtraWorkout() {
    navFade(() => {
        const day = ensureExtraDay(getWorkoutDateKey());
        saveState();
        startWorkoutDay(EXTRA_ROUTINE_ID, day.id);
        if (!day.exercises.length) addRoutineExercise(EXTRA_ROUTINE_ID, day.id, id => { refreshWorkout(); scrollWorkoutTo(id); });
    });
}

/* Botones de Semana: entreno extraordinario y deporte, y los deportes del día */
function weekActions() {
    const wrap = document.createElement("div");
    wrap.className = "week-actions";

    const key = getWorkoutDateKey();
    const extra = extraDayFor(key);
    const row = document.createElement("div");
    row.className = "week-actions-row";
    row.append(
        addSquare(extra && extra.exercises.length ? `Seguir extraordinario (${extra.exercises.length})` : "Entreno extraordinario", startExtraWorkout, "add-wide week-act"),
        addSquare("Añadir deporte", addSport, "add-wide week-act")
    );
    wrap.appendChild(row);

    const sports = state.sports[key] || [];
    if (sports.length) {
        const list = document.createElement("div");
        list.className = "sport-list";
        sports.forEach(sp => {
            const chip = document.createElement("span");
            chip.className = "sport-chip";
            const text = document.createElement("span");
            text.innerHTML = `${esc(sp.n)} <b>${fmtNum(sp.v, 1)} ${sp.u}</b>`;
            const x = document.createElement("span");
            x.className = "day-delete-x sport-x";
            x.textContent = "✕";
            keyButton(x, `Quitar ${sp.n}`);
            x.onclick = () => removeSport(key, sp.id);
            chip.append(text, x);
            list.appendChild(chip);
        });
        wrap.appendChild(list);
    }
    return wrap;
}

/* ---------- Deportes ---------- */
const SPORTS = [
    { k: "run",    name: "Correr",     u: "km" },
    { k: "bike",   name: "Ciclismo",   u: "km" },
    { k: "swim",   name: "Nadar",      u: "km" },
    { k: "walk",   name: "Caminar",    u: "km" },
    { k: "soccer", name: "Fútbol",     u: "min" },
    { k: "basket", name: "Básquetbol", u: "min" },
    { k: "volley", name: "Voleibol",   u: "min" },
    { k: "tennis", name: "Tenis",      u: "min" }
];

function addSport() {
    openPicker({
        title: "Añadir deporte",
        groups: [
            { title: "Por distancia", items: SPORTS.filter(x => x.u === "km").map(x => ({ label: x.name, sub: "Kilómetros", value: x })) },
            { title: "Por tiempo", items: SPORTS.filter(x => x.u === "min").map(x => ({ label: x.name, sub: "Minutos", value: x })) }
        ],
        createLabel: "Otro deporte (por tiempo)",
        onPick: sport => askSportAmount(sport),
        onCreate: async query => {
            const name = await askText({ title: "Otro deporte", label: "Nombre del deporte", value: query || "", maxLength: 30 });
            if (name) askSportAmount({ k: "custom", name, u: "min" });
        }
    });
}

/* Distancia (km) o tiempo (min): se ajusta con ▲▼, deslizando o escribiendo */
function askSportAmount(sport) {
    const km = sport.u === "km";
    let value = km ? 5 : 60;
    openStepper({
        title: sport.name,
        subtitle: km ? "Distancia recorrida" : "Tiempo jugado",
        unit: km ? "km" : "min",
        read: () => fmtNum(value, 1),
        step: dir => { value = Math.max(0, Math.round((value + dir * (km ? 0.5 : 5)) * 10) / 10); },
        editMode: km ? "decimal" : "numeric",
        onEdit: text => {
            const n = parseAmount(text, { max: km ? 500 : 1440 });
            if (n === null || n <= 0) return "x";
            value = n;
            return "";
        },
        cancelLabel: "Cancelar",
        doneLabel: "Añadir",
        onClose: confirmed => {
            if (!confirmed || value <= 0) return;
            const key = getWorkoutDateKey();
            (state.sports[key] ??= []).push({ id: newId("sp"), k: sport.k, n: sport.name, u: sport.u, v: value });
            saveState();
            renderWeekSection();
        }
    });
}

function removeSport(key, id) {
    state.sports[key] = (state.sports[key] || []).filter(x => x.id !== id);
    if (!state.sports[key].length) delete state.sports[key];
    saveState();
    renderWeekSection();
}

/* Al elegir un día, entra a Entreno y crea/asocia el registro de esa fecha */
function startWorkoutDay(routineId, dayId) {
    activeWorkout = { routineId, dayId };
    workoutPage = 0;

    const key = getWorkoutDateKey();
    state.logs[routineId] ??= {};
    const entry = (state.logs[routineId][key] ??= { dayId, exercises: {} });
    setEntryDay(routineId, entry, dayId);
    saveState();

    showSection("workout");
}

/* Panel "Series": progreso del día activo (hechas / totales) */
function renderSeriesPanel() {
    const left = document.getElementById("seriesColLeft");
    const right = document.getElementById("seriesColRight");
    left.innerHTML = "";
    right.innerHTML = "";

    const routine = findRoutine(state.activeRoutineId);
    const key = getWorkoutDateKey();
    const entry = routine && state.logs[routine.id]?.[key];
    const day = entry && findDay(routine, entry.dayId);
    document.getElementById("week").classList.toggle("no-series", !day || day.exercises.length === 0);
    if (!day) return;

    const half = Math.ceil(day.exercises.length / 2);

    day.exercises.forEach((exercise, index) => {
        const log = readExerciseLog(routine.id, key, exercise);
        const done = log.reps.filter(r => r > 0).length;

        const line = document.createElement("div");
        line.className = "series-line";
        const nameEl = document.createElement("span");
        nameEl.textContent = exercise.name;
        const countEl = document.createElement("span");
        countEl.textContent = `${done}/${log.reps.length}`;
        line.append(nameEl, countEl);

        (index < half ? left : right).appendChild(line);
    });
}
