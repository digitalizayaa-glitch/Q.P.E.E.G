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
    "Pecho": ["Press banca", "Press inclinado", "Press declinado", "Press mancuernas", "Aperturas", "Cruce de poleas", "Pec deck", "Fondos", "Flexiones"],
    "Espalda": ["Dominadas", "Jalón al pecho", "Remo con barra", "Remo mancuerna", "Remo T", "Remo polea baja", "Pullover polea", "Peso muerto"],
    "Hombro": ["Press militar", "Press hombro", "Elev. laterales", "Elev. frontales", "Pájaros", "Face pull", "Encogimientos"],
    "Bíceps": ["Curl barra", "Curl mancuernas", "Curl martillo", "Curl predicador", "Curl inclinado", "Curl polea"],
    "Tríceps": ["Press francés", "Extensión polea", "Ext. sobre cabeza", "Press cerrado", "Fondos tríceps", "Patada tríceps"],
    "Pierna": ["Sentadilla", "Sentadilla frontal", "Prensa", "Zancadas", "Sentadilla búlgara", "Ext. cuádriceps", "Curl femoral", "Peso muerto rumano", "Gemelos"],
    "Glúteo": ["Hip thrust", "Puente de glúteo", "Patada de glúteo", "Abductores"],
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
              itemClass(value) (clase extra para un elemento, p. ej. "picked") } */
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
        search = document.createElement("input");
        search.type = "search";
        search.className = "picker-search";
        search.placeholder = "Buscar…";
        search.autocomplete = "off";
        search.spellcheck = false;
        sheet.appendChild(search);
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

        options.groups.forEach(group => {
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
