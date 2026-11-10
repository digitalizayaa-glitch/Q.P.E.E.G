/* =========================================================
    MENÚ EMERGENTE (rutinas, días y ejercicios prefabricados)
    Una ventana flotante sobre la app (no es una sección): buscador arriba
    (solo en ejercicios), lista en el medio y botón de "crear" abajo.
    Así se escribe menos con el teclado.
========================================================= */

const ROUTINE_PRESETS = [
    { key: "tp",  name: "Torso-Pierna",   days: ["Torso", "Pierna"] },
    { key: "ppl", name: "Push-Pull-Legs", days: ["Push", "Pull", "Legs"] },
    { key: "fb",  name: "Full Body",      days: ["Full Body A", "Full Body B", "Full Body C"] }
];

const GENERIC_DAYS = ["Push", "Pull", "Legs", "Torso", "Pierna", "Full Body"];

/* Todos los nombres caben en EXERCISE_NAME_MAX caracteres */
const EXERCISE_CATALOG = {
    "Pecho": ["Press banca", "Press inclinado", "Press declinado", "Press mancuernas", "Aperturas", "Cruce de poleas", "Pec deck", "Fondos", "Flexiones", "Press plano unilat.", "Press inclin. manc."],
    "Espalda": ["Dominadas", "Jalón al pecho", "Remo con barra", "Remo mancuerna", "Remo T", "Remo polea baja", "Pullover polea", "Peso muerto", "Jalón agarre cerrado", "Jalón agarre medio", "Remo agarre neutro", "Remo agarre cerrado", "Pullover acostado", "Pullover en polea"],
    "Hombro": ["Press militar", "Press hombro", "Elev. laterales", "Elev. frontales", "Pájaros", "Face pull", "Encogimientos", "Press militar máq.", "Remo con barra Z", "Remo alto posterior", "Posterior en máquina", "Laterales mancuernas", "Elevación laterales", "Frontales mancuernas"],
    "Bíceps": ["Curl barra", "Curl mancuernas", "Curl martillo", "Curl predicador", "Curl inclinado", "Curl polea", "Curl polea baja", "Bíceps martillo"],
    "Tríceps": ["Press francés", "Extensión polea", "Ext. sobre cabeza", "Press cerrado", "Fondos tríceps", "Patada tríceps", "Extensión tríceps V", "Copa con mancuerna"],
    "Pierna": ["Sentadilla", "Sentadilla frontal", "Prensa", "Zancadas", "Sentadilla búlgara", "Ext. cuádriceps", "Curl femoral", "Peso muerto rumano", "Gemelos", "Sentadilla goblet", "Sentadilla sumo", "Desplantes caminando", "Prensa vertical", "Femoral sentado", "Pantorrillas prensa", "Extensión rodillas", "Femoral acostado", "Pantorrillas máquina"],
    "Glúteo": ["Hip thrust", "Puente de glúteo", "Patada de glúteo", "Abductores", "Patada glúteo polea", "Aducción", "Abducción", "Hip thrust máquina", "Desplante búlgaro"],
    "Core": ["Plancha", "Crunch", "Elev. de piernas", "Rueda abdominal", "Russian twist"]
};

const DAY_GROUPS = [
    [/push/, ["Pecho", "Hombro", "Tríceps"]],
    [/pull/, ["Espalda", "Bíceps"]],
    [/leg|pierna/, ["Pierna", "Glúteo", "Core"]],
    [/torso|upper/, ["Pecho", "Espalda", "Hombro", "Bíceps", "Tríceps"]]
];

function normalizeText(text) {
    return String(text || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

function priorityGroups(dayName) {
    const n = normalizeText(dayName);
    const hit = DAY_GROUPS.find(([re]) => re.test(n));
    return hit ? hit[1] : [];
}

function priorityIndex(priority, group) {
    const i = priority.indexOf(group);
    return i === -1 ? 99 : i;
}

let pickerOverlay = null;

/* options: { title, groups: [{ title?, items: [{ label, sub?, value }] }], searchable, createLabel, emptyText, onPick(value), onCreate(query),
              keepOpen (no se cierra al elegir; onPick recibe además refresh() para volver a pintar la lista),
              itemClass(value) (clase extra para un elemento, p. ej. "picked"),
              filters: [{ label, match(groupTitle) }] (fila de filtros bajo el buscador; el primero suele ser "Todos") } */
function openPicker(options) {
    closePicker(true);

    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";

    const sheet = document.createElement("div");
    sheet.className = "picker-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "picker-head";
    const title = document.createElement("h3");
    title.className = "picker-title";
    title.textContent = options.title;
    const closeBtn = document.createElement("button");
    closeBtn.className = "picker-close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.textContent = "✕";
    closeBtn.onclick = () => closePicker();
    head.append(title, closeBtn);
    sheet.appendChild(head);

    let search = null;
    if (options.searchable) {
        const row = document.createElement("div");
        row.className = "picker-search-row";
        search = document.createElement("input");
        search.type = "search";
        search.className = "picker-search";
        search.placeholder = "Buscar…";
        search.autocomplete = "off";
        search.spellcheck = false;
        search.enterKeyHint = "search";
        /* Enter o la lupa cierran el teclado para ver los resultados */
        search.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); search.blur(); } });
        const lens = document.createElement("button");
        lens.type = "button";
        lens.className = "picker-lens";
        lens.setAttribute("aria-label", "Buscar y cerrar el teclado");
        lens.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>';
        lens.onclick = () => search.blur();
        row.append(search, lens);
        sheet.appendChild(row);
    }

    /* Filtros por grupo */
    let activeFilter = 0;
    let filterRow = null;
    if (options.filters && options.filters.length > 1) {
        filterRow = document.createElement("div");
        filterRow.className = "picker-filters";
        options.filters.forEach((f, i) => {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "picker-filter" + (i === 0 ? " active" : "");
            chip.textContent = f.label;
            chip.onclick = () => {
                activeFilter = i;
                filterRow.querySelectorAll(".picker-filter").forEach((c, j) => c.classList.toggle("active", j === i));
                list.scrollTop = 0;
                renderList();
            };
            filterRow.appendChild(chip);
        });
        sheet.appendChild(filterRow);
    }

    const list = document.createElement("div");
    list.className = "picker-list";
    sheet.appendChild(list);

    if (options.onCreate) {
        const createBtn = document.createElement("button");
        createBtn.className = "picker-create";
        createBtn.textContent = `+ ${options.createLabel}`;
        createBtn.onclick = () => {
            const query = search ? search.value.trim() : "";
            closePicker();
            options.onCreate(query);
        };
        sheet.appendChild(createBtn);
    }

    const renderList = () => {
        const query = search ? normalizeText(search.value) : "";
        list.innerHTML = "";
        let count = 0;

        const filter = options.filters && options.filters[activeFilter];
        options.groups.forEach(group => {
            if (filter && filter.match && !filter.match(group.title || "")) return;
            const items = group.items.filter(item => !query || normalizeText(item.label).includes(query));
            if (!items.length) return;

            if (group.title) {
                const heading = document.createElement("div");
                heading.className = "picker-group";
                heading.textContent = group.title;
                list.appendChild(heading);
            }

            items.forEach(item => {
                const btn = document.createElement("button");
                btn.className = "picker-item";
                const extra = options.itemClass && options.itemClass(item.value);
                if (extra) btn.classList.add(extra);
                const label = document.createElement("span");
                label.textContent = item.label;
                btn.appendChild(label);
                if (item.sub) {
                    const sub = document.createElement("small");
                    sub.textContent = item.sub;
                    btn.appendChild(sub);
                }
                btn.onclick = () => {
                    if (options.keepOpen) { options.onPick(item.value, renderList); return; }
                    closePicker();
                    options.onPick(item.value);
                };
                list.appendChild(btn);
                count++;
            });
        });

        if (!count) {
            const empty = document.createElement("p");
            empty.className = "picker-empty";
            empty.textContent = query ? "Sin resultados. Puedes crearlo con el botón de abajo." : (options.emptyText || "Sin opciones");
            list.appendChild(empty);
        }
    };

    if (search) search.addEventListener("input", renderList);
    renderList();

    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) closePicker(); });
    overlay.appendChild(sheet);
    document.body.appendChild(overlay);
    pickerOverlay = overlay;

    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    sheetAppear(sheet);
}

function closePicker(immediate) {
    const overlay = pickerOverlay;
    if (!overlay) return;
    pickerOverlay = null;

    if (immediate) { overlay.remove(); return; }

    const sheet = overlay.firstElementChild;
    overlay.style.pointerEvents = "none";
    sheetCollapse(sheet, 140);
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
}

/* Con un cuadro de cantidad abierto encima, Escape cierra solo ese cuadro */
document.addEventListener("keydown", e => { if (e.key === "Escape" && !dialogOverlay && !document.querySelector(".stepper-overlay")) closePicker(); });
