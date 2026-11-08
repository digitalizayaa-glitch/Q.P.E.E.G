/* =========================================================
    PANTALLA DE INICIO
========================================================= */

let tooltipInterval = null;

function initLanding() {
    renderProfile();
    renderAchievements();
    startTooltipLoop();

    document.getElementById("profilePhoto").addEventListener("click", onProfilePhotoClick);
    document.getElementById("photoInput").addEventListener("change", onPhotoSelected);
    document.getElementById("exportBtn").addEventListener("click", exportBackup);
    const imp = document.getElementById("importInput");
    document.getElementById("importBtn").addEventListener("click", () => imp.click());
    imp.addEventListener("change", () => { if (imp.files[0]) importBackup(imp.files[0]); imp.value = ""; });
}

function startTooltipLoop() {
    const tooltip = document.getElementById("profileTooltip");
    tooltip.classList.add("visible");
    tooltipInterval = setInterval(() => tooltip.classList.toggle("visible"), 2000);
}

function stopTooltipLoop() {
    clearInterval(tooltipInterval);
    document.getElementById("profileTooltip").classList.remove("visible");
}

function onProfilePhotoClick() {
    stopTooltipLoop();

    if (!state.photo && !state.avatar) {
        document.getElementById("photoInput").click();
        return;
    }

    enterApp(true);
}

function onPhotoSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    shrinkImage(file).then(data => {
        state.photo = data;
        saveState();
        renderProfile();
    }).catch(() => showMessage({ title: "Foto no válida", message: "No se pudo leer esa imagen." }));
    event.target.value = "";
}

function enterApp(animated) {
    const landing = document.getElementById("landing");
    const app = document.getElementById("mainApp");
    const show = () => setHeaderDateText(getDateText());

    if (animated && !SWIPE.busy) {
        switchScreen(landing, app, "flex", show);
        return;
    }

    landing.style.display = "none";
    app.style.display = "flex";
    show();
}

/* Cambia entre la pantalla de inicio y la app con la animación Profundidad */
/* Inicio <-> app: un desvanecimiento corto y discreto */
async function switchScreen(fromEl, toEl, toDisplay, after) {
    SWIPE.busy = true;
    await fromEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110 * NAV_SPEED, easing: "ease-in", fill: "forwards" }).finished.catch(() => {});

    fromEl.style.display = "none";
    fromEl.getAnimations().forEach(a => a.cancel());
    toEl.style.display = toDisplay;
    if (after) after();
    fitLayout(true);

    await toEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 170 * NAV_SPEED, easing: "ease-out" }).finished.catch(() => {});
    SWIPE.busy = false;
}

/* Entrar o salir de algo dentro de la app (un día, una rutina, volver): desvanecimiento muy corto,
   apenas perceptible. Las pestañas siguen cambiando con el deslizamiento de profundidad. */
let navFading = false;
async function navFade(change) {
    if (navFading || SWIPE.busy) return;
    navFading = true;
    const targets = [document.querySelector("main"), document.querySelector(".week-tab-label"), document.getElementById("weekDate")].filter(Boolean);
    await Promise.all(targets.map(t => t.animate([{ opacity: 1 }, { opacity: .2 }], { duration: 70 * NAV_SPEED, easing: "ease-in", fill: "forwards" }).finished.catch(() => {})));
    try { change(); } finally {
        targets.forEach(t => {
            t.getAnimations().forEach(a => a.cancel());
            t.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 140 * NAV_SPEED, easing: "ease-out" });
        });
        navFading = false;
    }
}

/* =========================================================
    LOGROS / OBJETIVOS (máx. 3)
========================================================= */

/* Logros: los completados quedan en verde con ✓. Solo se pueden tener ACH_MAX_ACTIVE por cumplir a la vez. */
const activeAchievements = list => list.filter(a => !a.done).length;

function renderAchievements() {
    const list = document.getElementById("achievementsList");
    const control = document.getElementById("achievementsControl");

    list.innerHTML = "";
    state.achievements.forEach(a => {
        const chip = document.createElement("div");
        chip.className = "achievement-chip" + (a.done ? " done" : "");
        chip.textContent = a.t;
        list.appendChild(chip);
    });

    control.innerHTML = "";

    const canAdd = activeAchievements(state.achievements) < ACH_MAX_ACTIVE && state.achievements.length < ACH_MAX_TOTAL;
    if (canAdd) {
        control.appendChild(addSquare("Añadir logro", onAddAchievement, "add-compact"));
    } else {
        const msg = document.createElement("p");
        msg.className = "achievements-limit";
        msg.textContent = "Recuerda que no puedes ocuparte de todo, un par de cosas a la vez sin perder tu constancia";
        control.appendChild(msg);
    }

    if (state.achievements.length) {
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "achievements-edit";
        edit.textContent = "Editar logros";
        edit.onclick = openAchievementsEditor;
        control.appendChild(edit);
    }
}

async function onAddAchievement() {
    const text = await askText({ title: "Nuevo objetivo", label: "Escribe un objetivo o logro", maxLength: 60, placeholder: "Ej. Dominada con +10 kg" });
    if (!text) return;

    state.achievements.push({ t: text, done: false });
    saveState();
    renderAchievements();
}

/* Editor de logros: oscurece el resto del inicio y deja solo los logros.
   ✓ = completado (se queda, en verde) · ✕ = quitar (en rojo, se borra al guardar) · + = añadir.
   Nada cambia hasta pulsar "Guardar". */
function openAchievementsEditor() {
    let draft = state.achievements.map(a => ({ t: a.t, done: a.done, remove: false }));

    const overlay = document.createElement("div");
    overlay.className = "ach-overlay";
    const box = document.createElement("div");
    box.className = "ach-editor";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Editar logros");
    overlay.appendChild(box);

    const draw = () => {
        box.innerHTML = `<h3 class="ach-title">Logros</h3><p class="ach-help"><b class="g">✓</b> completado · <b class="r">✕</b> quitar</p>`;
        const list = document.createElement("div");
        list.className = "ach-list";

        draft.forEach((a, i) => {
            const row = document.createElement("div");
            row.className = "ach-row achievement-chip" + (a.done ? " done" : "") + (a.remove ? " remove" : "");
            const text = document.createElement("span");
            text.className = "ach-text";
            text.textContent = a.t;

            const ok = document.createElement("button");
            ok.type = "button";
            ok.className = "ach-btn ok" + (a.done ? " on" : "");
            ok.textContent = "✓";
            ok.setAttribute("aria-label", a.done ? "Quitar de completados" : "Marcar como completado");
            ok.setAttribute("aria-pressed", a.done);
            ok.onclick = () => { a.done = !a.done; a.remove = false; draw(); };

            const del = document.createElement("button");
            del.type = "button";
            del.className = "ach-btn del" + (a.remove ? " on" : "");
            del.textContent = "✕";
            del.setAttribute("aria-label", a.remove ? "No quitar" : "Quitar");
            del.setAttribute("aria-pressed", a.remove);
            del.onclick = () => { a.remove = !a.remove; if (a.remove) a.done = false; draw(); };

            row.append(text, ok, del);
            list.appendChild(row);
        });
        box.appendChild(list);

        const kept = draft.filter(a => !a.remove);
        if (activeAchievements(kept) < ACH_MAX_ACTIVE && kept.length < ACH_MAX_TOTAL) {
            box.appendChild(addSquare("Añadir logro", async () => {
                const text = await askText({ title: "Nuevo objetivo", label: "Escribe un objetivo o logro", maxLength: 60, placeholder: "Ej. Dominada con +10 kg" });
                if (!text) return;
                draft.push({ t: text, done: false, remove: false });
                draw();
            }, "add-compact"));
        } else {
            const msg = document.createElement("p");
            msg.className = "achievements-limit";
            msg.textContent = `Máximo ${ACH_MAX_ACTIVE} logros por cumplir a la vez. Marca alguno como completado o quítalo para añadir otro.`;
            box.appendChild(msg);
        }

        const actions = document.createElement("div");
        actions.className = "dialog-actions ach-actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "dialog-btn ghost";
        cancel.textContent = "Cancelar";
        cancel.onclick = () => close(false);
        const save = document.createElement("button");
        save.type = "button";
        save.className = "dialog-btn accept";
        save.textContent = "Guardar";
        save.onclick = () => close(true);
        actions.append(cancel, save);
        box.appendChild(actions);
    };

    let closed = false;
    const close = commit => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKey, true);
        if (commit) {
            state.achievements = draft.filter(a => !a.remove).map(a => ({ t: a.t, done: a.done }));
            saveState();
            renderAchievements();
        }
        overlay.style.pointerEvents = "none";
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
    };
    const onKey = e => { if (e.key === "Escape" && !dialogOverlay) { e.preventDefault(); close(false); } };
    window.addEventListener("keydown", onKey, true);

    draw();
    document.body.appendChild(overlay);
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" });
    box.animate([{ clipPath: "inset(0 0 100% 0)", opacity: .3 }, { clipPath: "inset(0 0 0 0)", opacity: 1 }], { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
    box.querySelectorAll(".ach-row").forEach(glowOnce);
}
