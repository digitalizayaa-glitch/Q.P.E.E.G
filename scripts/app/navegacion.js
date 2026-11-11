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
   la del perfil. Al volver a entrar, la app empieza en Semana. */
document.addEventListener("DOMContentLoaded", () => { document.getElementById("homeBtn").addEventListener("click", goHome); });

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
