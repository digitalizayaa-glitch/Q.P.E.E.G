/* =========================================================
    CUADRO PARA CAMBIAR UN NÚMERO (toque corto sobre peso o repeticiones)
    Ventana más grande que el cuadro original: un área grande para deslizar
    arriba/abajo, botones ▲ ▼ (mantenerlos presionados repite) y, en el peso,
    un acceso para escribirlo exacto.
========================================================= */

let stepperOverlay = null;

function openStepper({ title, subtitle, unit, read, step, onEdit, editMode, extra, onClose, doneLabel, cancelLabel }) {
    if (stepperOverlay) return;

    const overlay = document.createElement("div");
    overlay.className = "picker-overlay stepper-overlay";

    const sheet = document.createElement("div");
    sheet.className = "picker-sheet stepper-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const heading = document.createElement("h3");
    heading.className = "picker-title stepper-title";
    heading.textContent = title;
    const sub = document.createElement("div");
    sub.className = "stepper-sub";
    sub.textContent = subtitle;

    const up = document.createElement("button");
    up.type = "button";
    up.className = "stepper-btn";
    up.setAttribute("aria-label", "Subir");
    up.textContent = "▲";

    const down = document.createElement("button");
    down.type = "button";
    down.className = "stepper-btn";
    down.setAttribute("aria-label", "Bajar");
    down.textContent = "▼";

    const box = document.createElement("div");
    box.className = "stepper-value";
    box.textContent = read();

    const unitEl = document.createElement("div");
    unitEl.className = "stepper-unit";
    const unitText = () => (typeof unit === "function" ? unit() : unit);
    unitEl.textContent = unitText();

    const hint = document.createElement("div");
    hint.className = "stepper-hint";
    hint.textContent = onEdit ? "Usa ▲ ▼, desliza el número o tócalo para escribirlo" : "Usa ▲ ▼ o desliza el número";

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    if (extra) {
        const extraBtn = document.createElement("button");
        extraBtn.type = "button";
        extraBtn.className = "dialog-btn ghost";
        const paintExtra = () => {
            extraBtn.textContent = typeof extra.label === "function" ? extra.label() : extra.label;
            unitEl.textContent = unitText();
        };
        paintExtra();
        extraBtn.onclick = () => {
            if (!ready()) return;
            const closeAfter = extra.onClick();
            paintExtra();
            if (closeAfter) close(true);
        };
        actions.appendChild(extraBtn);
    }
    if (cancelLabel) {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "dialog-btn ghost";
        cancelBtn.textContent = cancelLabel;
        cancelBtn.onclick = () => { if (ready()) close(false); };
        actions.appendChild(cancelBtn);
    }
    const done = document.createElement("button");
    done.type = "button";
    done.className = "dialog-btn accept";
    done.textContent = doneLabel || "Listo";
    actions.appendChild(done);

    sheet.append(heading, sub, up, box, unitEl, down, hint, actions);
    overlay.appendChild(sheet);

    const apply = dir => {
        const before = read();
        step(dir);
        const after = read();
        if (after !== before) animateValue(box, dir, after);
    };

    /* unidad que cambia con la cantidad (1 rebanada / 2 rebanadas): se repinta cada vez que cambia el número */
    if (typeof unit === "function") new MutationObserver(() => { unitEl.textContent = unitText(); }).observe(box, { childList: true, characterData: true, subtree: true });

    bindHold(up, () => apply(1));
    bindHold(down, () => apply(-1));

    const startEdit = () => { if (onEdit && ready()) editInBox(box, { read, onEdit, editMode }); };

    attachValueSwipe(box, apply, startEdit, 34);

    /* el "clic" que acompaña al toque que abrió el cuadro no debe pulsar nada */
    const openedAt = performance.now();
    const ready = () => performance.now() - openedAt > 350;

    let closed = false;
    const close = (confirmed = true) => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKey, true);
        stepperOverlay = null;

        overlay.style.pointerEvents = "none";
        sheetCollapse(sheet, 130);
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
        if (onClose) onClose(confirmed);
    };

    const onKey = e => {
        if (dialogOverlay) return;   /* hay un cuadro de texto encima: que lo maneje él */
        if (e.target.classList && e.target.classList.contains("stepper-input")) return;   /* escribiendo el número */
        if (e.key === "Escape") { e.preventDefault(); close(!cancelLabel); }
        else if (e.key === "Enter") { e.preventDefault(); close(true); }
        else if (e.key === "ArrowUp") { e.preventDefault(); apply(1); }
        else if (e.key === "ArrowDown") { e.preventDefault(); apply(-1); }
    };
    window.addEventListener("keydown", onKey, true);

    done.onclick = () => { if (ready()) close(true); };
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) close(!cancelLabel); });

    document.body.appendChild(overlay);
    stepperOverlay = overlay;

    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    sheetAppear(sheet);
}
