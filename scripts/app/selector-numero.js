/* =========================================================
    CUADRO PARA CAMBIAR UN NÚMERO (toque corto sobre peso o repeticiones)
    Ventana más grande que el cuadro original: un área grande para deslizar
    arriba/abajo, botones ▲ ▼ (mantenerlos presionados repite) y, en el peso,
    un acceso para escribirlo exacto.
    Sin textos debajo de las flechas: la unidad, si cambia (kg/lb, rebanada/rebanadas), va en el subtítulo.
    second: un segundo número al lado (columna derecha), p. ej. el peso de una sola serie:
            { label, read, step, onEdit, editMode }; con él, cada columna lleva su nombre arriba (firstLabel / label).
========================================================= */

let stepperOverlay = null;

function openStepper({ title, subtitle, unit, read, step, onEdit, editMode, extra, onClose, doneLabel, cancelLabel, second, firstLabel, suffix = "" }) {
    const show = () => read() + suffix;   /* el número con su símbolo (p. ej. " kcal"); al escribir, solo el número */
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
    /* la unidad que cambia (kg/lb, 1 rebanada/2 rebanadas) se muestra en el subtítulo; la fija ya la dice el subtítulo */
    const unitText = () => (typeof unit === "function" ? unit() : "");
    const paintSub = () => { const u = unitText(); sub.textContent = [subtitle, u].filter(Boolean).join(" · "); };
    paintSub();

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
    box.textContent = show();
    if (suffix) box.classList.add("with-suffix");   /* con símbolo: la cifra un poco más chica para que quepa (10000 kcal) */

    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    if (extra) {
        const extraBtn = document.createElement("button");
        extraBtn.type = "button";
        extraBtn.className = "dialog-btn ghost";
        const paintExtra = () => {
            extraBtn.textContent = typeof extra.label === "function" ? extra.label() : extra.label;
            paintSub();
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

    /* Segundo número (columna derecha) */
    let box2 = null;
    if (second) {
        const mk = (cls, label, txt) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.setAttribute("aria-label", label); b.textContent = txt; return b; };
        const up2 = mk("stepper-btn", `Subir ${second.label}`, "▲"), down2 = mk("stepper-btn", `Bajar ${second.label}`, "▼");
        box2 = document.createElement("div");
        box2.className = "stepper-value";
        box2.textContent = second.read();
        const apply2 = dir => {
            const before = second.read();
            second.step(dir);
            const after = second.read();
            if (after !== before) animateValue(box2, dir, after);
        };
        bindHold(up2, () => apply2(1));
        bindHold(down2, () => apply2(-1));
        attachValueSwipe(box2, apply2, () => { if (second.onEdit && ready()) editInBox(box2, { read: second.read, onEdit: second.onEdit, editMode: second.editMode }); }, 34);
        const col = (label, ...els) => {
            const c = document.createElement("div");
            c.className = "stepper-col";
            const l = document.createElement("div");
            l.className = "stepper-col-label";
            l.textContent = label;
            c.append(l, ...els);
            return c;
        };
        const cols = document.createElement("div");
        cols.className = "stepper-cols";
        cols.append(col(firstLabel || "", up, box, down), col(second.label, up2, box2, down2));
        sheet.append(heading, sub, cols, actions);
    } else {
        sheet.append(heading, sub, up, box, down, actions);
    }
    overlay.appendChild(sheet);

    const apply = dir => {
        const before = read();
        step(dir);
        const after = read();
        if (after !== before) animateValue(box, dir, after + suffix);
    };

    /* unidad que cambia con la cantidad (1 rebanada / 2 rebanadas): se repinta cada vez que cambia el número */
    if (typeof unit === "function") new MutationObserver(paintSub).observe(box, { childList: true, characterData: true, subtree: true });

    bindHold(up, () => apply(1));
    bindHold(down, () => apply(-1));

    const startEdit = () => { if (onEdit && ready()) editInBox(box, { read, onEdit, editMode, show }); };

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
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).settled.then(() => overlay.remove());
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
