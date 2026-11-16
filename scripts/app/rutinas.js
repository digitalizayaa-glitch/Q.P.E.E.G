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

/* En una sección interna (entreno de un día, días de una rutina) la casita pasa a ser "volver" */
function setHeaderDateText(text, onBack) {
    const el = document.getElementById("weekDate");
    el.textContent = text;
    el.classList.remove("clickable");
    el.onclick = onBack || null;   /* el título también vuelve, pero el botón es la flecha */
    setHeaderBack(onBack || null);
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
                .settled.then(() => ghost.remove());
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
        groups: [{ items: ROUTINE_PRESETS.map(p => ({ label: p.name, value: p })) }],   /* sin subtítulo: el nombre ya dice los días */
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
