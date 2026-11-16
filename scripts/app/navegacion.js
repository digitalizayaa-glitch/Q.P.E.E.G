/* =========================================================
    NAVEGACIÓN ENTRE SECCIONES
========================================================= */

/* Día que se está viendo en toda la app (Semana, Entreno, Comida e Historial). null = hoy */
function viewDate() { return selectedDate || foodDate || null; }
function setViewDate(key) {
    const k = key && key !== dateKey() ? key : null;
    selectedDate = k;
    foodDate = k;
}

/* Botón "Hoy" a la derecha del título: solo aparece al ver otro día */
function updateTodayButton(sectionId) {
    const btn = document.getElementById("todayBtn");
    if (!btn) return;
    const show = !!viewDate() && sectionId !== "exercises" && sectionId !== "workout";
    btn.hidden = !show;
    btn.onclick = show ? () => navFade(() => { setViewDate(null); showSection(sectionId); }) : null;
}

/* El título del día se achica si no cabe (fechas largas como "Miércoles, 29 de septiembre") */
function fitHeaderDate() {
    const el = document.getElementById("weekDate");
    if (!el) return;
    el.style.fontSize = "";
    const base = parseFloat(getComputedStyle(el).fontSize) || 20;
    let size = base;
    while (el.scrollWidth > el.clientWidth + 1 && size > 12) {
        size -= 1;
        el.style.fontSize = size + "px";
    }
}

function showSection(sectionId) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById(sectionId).classList.add("active");

    const label = document.querySelector(".week-tab-label");
    label.onclick = null;
    label.classList.remove("clickable");

    if (sectionId === "exercises") {
        routineNav = { level: "root", routineId: null, dayId: null };
        renderRoutinesTab();
    } else if (sectionId === "week") {
        setHeaderDateText(getDateText(viewDate() ? parseKey(viewDate()) : new Date()));
        renderWeekSection();
        renderSeriesPanel();
    } else if (sectionId === "workout") {
        const day = findDay(findRoutine(activeWorkout.routineId), activeWorkout.dayId);
        setHeaderDateText(day ? day.name : "", () => navFade(() => showSection("week")));
        renderWorkoutForDay(activeWorkout.routineId, activeWorkout.dayId);
    } else if (sectionId === "food") {
        setHeaderDateText(getDateText(viewDate() ? parseKey(viewDate()) : new Date()));
        renderFood();
    } else if (sectionId === "history") {
        setHeaderDateText(getDateText(viewDate() ? parseKey(viewDate()) : new Date()));
        renderHistory();
    } else {
        setHeaderDateText("");
    }

    updateTodayButton(sectionId);
    updateDayDoneButton(sectionId);
    requestAnimationFrame(fitHeaderDate);

    const tab = TAB_ORDER.find(t => t.id === sectionId);
    label.textContent = tab ? tab.label : (sectionId === "workout" ? "ENTRENO" : label.textContent);

    /* Entreno pertenece a Semana: ilumina el punto de Semana */
    const dotId = sectionId === "workout" ? "week" : sectionId;
    renderDots(document.getElementById("tabDots"), TAB_ORDER.length, TAB_ORDER.findIndex(t => t.id === dotId));
}

/* Puntos indicadores (index = -1: ninguno activo) */
function renderDots(container, total, index) {
    container.innerHTML = "";
    if (total < 2) return;
    for (let i = 0; i < total; i++) {
        const dot = document.createElement("span");
        dot.className = "page-dot" + (i === index ? " active" : "");
        container.appendChild(dot);
    }
}

/* Botón de la casita (siempre visible en el encabezado): vuelve a la pantalla de inicio de toda la app,
   la del perfil. Al volver a entrar, la app empieza en Semana.
   En una sección interna (entreno de un día, días de una rutina) se vuelve flecha y regresa a la sección de antes. */
const HOME_ICON = '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h5v-6h3v6h5V10"/>';
const BACK_ICON = '<path d="M15 5l-7 7 7 7"/>';
let headerBack = null;

function setHeaderBack(onBack) {
    headerBack = onBack;
    const btn = document.getElementById("homeBtn");
    if (!btn) return;
    const mode = onBack ? "back" : "home";
    if (btn.dataset.mode === mode) return;
    btn.dataset.mode = mode;
    btn.querySelector("svg").innerHTML = onBack ? BACK_ICON : HOME_ICON;
    btn.setAttribute("aria-label", onBack ? "Volver" : "Ir al inicio");
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("homeBtn").addEventListener("click", () => {
        if (SWIPE.busy) return;
        if (headerBack) headerBack(); else goHome();
    });
    document.getElementById("dayDoneBtn").addEventListener("click", toggleDayDone);
});

/* ✓ del entreno del día: lo da por terminado aunque falten ejercicios por marcar
   (los que faltan no cuentan; lo marcado sigue su color). Se quita tocando otra vez. */
function workoutEntry() {
    if (!activeWorkout || !activeWorkout.routineId) return null;
    return state.logs[activeWorkout.routineId]?.[getWorkoutDateKey()] || null;
}

function updateDayDoneButton(sectionId) {
    const btn = document.getElementById("dayDoneBtn");
    if (!btn) return;
    const entry = sectionId === "workout" ? workoutEntry() : null;
    btn.hidden = !entry;
    const on = !!(entry && entry.done);
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Quitar día terminado" : "Dar el día por terminado");
    /* aviso cada 5 s junto al ✓ mientras el día no esté terminado */
    let hint = document.getElementById("dayDoneHint");
    if (!hint) {
        hint = document.createElement("div");
        hint.id = "dayDoneHint";
        hint.className = "day-done-hint";
        hint.setAttribute("aria-hidden", "true");
        hint.textContent = "Completar";
        btn.parentElement.appendChild(hint);
    }
    hint.classList.toggle("on", !!entry && !on);
}

async function toggleDayDone() {
    const entry = workoutEntry();
    if (!entry) return;
    if (entry.done) {   /* quitarlo: sin preguntar y sin salir */
        delete entry.done;
        saveState();
        updateDayDoneButton("workout");
        return;
    }
    const ok = await askConfirm({ title: "¿Estás seguro?", message: "El día se dará por terminado.", confirmLabel: "Completar", danger: false });
    if (!ok || workoutEntry() !== entry) return;
    entry.done = true;
    saveState();
    updateDayDoneButton("workout");
    showDoneDay(getWorkoutDateKey());
}

/* Día completado: se desvanece el entreno, aparece el calendario de entrenos en su mes y el día pulsa 2 s */
async function showDoneDay(key) {
    if (navFading || SWIPE.busy) return;
    navFading = true;
    const parts = () => [document.querySelector("main"), document.querySelector(".week-tab-label"), document.getElementById("weekDate")].filter(Boolean);
    try {
        await Promise.all(parts().map(t => t.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260 * NAV_SPEED, easing: "ease-in", fill: "forwards" }).settled));
        const now = new Date(), d = parseKey(key);
        historyMode = "workout";
        historyView = "calendar";
        historyOffset = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
        showSection("history");
    } finally {
        parts().forEach(t => {
            t.getAnimations().forEach(a => a.cancel());
            t.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320 * NAV_SPEED, easing: "ease-out" });
        });
        navFading = false;
    }
    /* el día recién completado: el pulso de "hoy" (mismo ritmo, 3,4 s), con el doble de intensidad, una vez */
    const cell = document.querySelector(`.history-cell[data-key="${key}"]`);
    if (cell) {
        cell.classList.add("just-done");
        cell.addEventListener("animationend", () => cell.classList.remove("just-done"), { once: true });
    }
}

function goHome() {
    if (SWIPE.busy) return;

    switchScreen(document.getElementById("mainApp"), document.getElementById("landing"), "flex", () => {
        setViewDate(null);
        showSection("week");
        stopTooltipLoop();
        startTooltipLoop();
        window.scrollTo(0, 0);
    });
}
