/* =========================================================
    NAVEGACIÓN ENTRE SECCIONES
========================================================= */

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
        setHeaderDateText(getDateText(selectedDate ? parseKey(selectedDate) : new Date()));
        renderWeekSection();
        renderSeriesPanel();
    } else if (sectionId === "workout") {
        const day = findDay(findRoutine(activeWorkout.routineId), activeWorkout.dayId);
        setHeaderDateText(day ? day.name : "", () => navFade(() => showSection("week")));
        renderWorkoutForDay(activeWorkout.routineId, activeWorkout.dayId);
    } else if (sectionId === "food") {
        if (foodDate) setHeaderDateText(getDateText(parseKey(foodDate)), () => navFade(() => { foodDate = null; showSection("history"); }));
        else setHeaderDateText(getDateText());
        renderFood();
    } else if (sectionId === "history") {
        setHeaderDateText(getDateText());
        renderHistory();
    } else {
        setHeaderDateText("");
    }

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
function goHome() {
    if (SWIPE.busy) return;

    switchScreen(document.getElementById("mainApp"), document.getElementById("landing"), "flex", () => {
        selectedDate = null;
        foodDate = null;
        showSection("week");
        stopTooltipLoop();
        startTooltipLoop();
        window.scrollTo(0, 0);
    });
}
