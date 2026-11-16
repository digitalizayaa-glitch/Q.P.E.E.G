/* =========================================================
    RUTINAS — piezas reutilizables del editor, ajustes y orden de los ejercicios
========================================================= */

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
function editInBox(box, { read, onEdit, editMode, show }) {
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
        box.textContent = (show || read)();
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

/* ---------- Orden de los ejercicios de un día (tuerca del título del día) ----------
   Cada fila sube o baja con ▲ ▼; se guarda al momento. Los registros van por id, así que no se pierden. */
function openExerciseOrder(routineId, dayId) {
    const day = findDay(findRoutine(routineId), dayId);
    if (!day || !day.exercises.length) return;
    const { sheet } = openSheet("order-sheet", "Ordenar ejercicios", () => {
        renderDaySheet();
        if (typeof refreshWorkout === "function") refreshWorkout();
    });
    const body = document.createElement("div");
    body.className = "order-list";
    sheet.appendChild(body);

    const move = (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= day.exercises.length) return;
        [day.exercises[i], day.exercises[j]] = [day.exercises[j], day.exercises[i]];
        saveState();
        paint(day.exercises[j].id);
    };
    const paint = movedId => {
        body.innerHTML = "";
        day.exercises.forEach((ex, i) => {
            const row = document.createElement("div");
            row.className = "order-row" + (ex.id === movedId ? " moved" : "");
            row.dataset.id = ex.id;
            const n = document.createElement("span");
            n.className = "order-num";
            n.textContent = i + 1;
            const name = document.createElement("span");
            name.className = "order-name";
            name.textContent = ex.name;
            const btn = (label, dir, aria) => {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "stepper-btn order-btn";
                b.textContent = label;
                b.setAttribute("aria-label", `${aria} ${ex.name}`);
                b.disabled = (dir < 0 && i === 0) || (dir > 0 && i === day.exercises.length - 1);
                b.onclick = () => move(i, dir);
                return b;
            };
            row.append(n, name, btn("▲", -1, "Subir"), btn("▼", 1, "Bajar"));
            body.appendChild(row);
        });
    };
    paint();
}
