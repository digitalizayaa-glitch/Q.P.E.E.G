/* =========================================================
    CUADROS DE DIÁLOGO PROPIOS (reemplazan prompt / confirm / alert del navegador)
    Misma ventana flotante que el menú de selección. Devuelven una promesa:
      askText(...)    -> texto (sin espacios en los extremos) o null si se cancela
      askConfirm(...) -> true / false
      showMessage(...)-> se resuelve al cerrarlo
========================================================= */

let dialogOverlay = null;

function openDialog({ title, message, input, buttons, validate }) {
    return new Promise(resolve => {
        if (dialogOverlay) { dialogOverlay.remove(); dialogOverlay = null; }

        const overlay = document.createElement("div");
        overlay.className = "picker-overlay dialog-overlay";

        const sheet = document.createElement("form");
        sheet.className = "picker-sheet dialog-sheet";
        sheet.setAttribute("role", "dialog");
        sheet.setAttribute("aria-modal", "true");
        sheet.noValidate = true;

        const heading = document.createElement("h3");
        heading.className = "picker-title dialog-title";
        heading.textContent = title;
        sheet.appendChild(heading);

        if (message) {
            const text = document.createElement("p");
            text.className = "dialog-text";
            text.textContent = message;
            sheet.appendChild(text);
        }

        let field = null, error = null;
        if (input) {
            field = document.createElement("input");
            field.className = "dialog-input";
            field.type = "text";
            field.value = input.value || "";
            field.placeholder = input.placeholder || "";
            if (input.maxLength) field.maxLength = input.maxLength;
            if (input.inputMode) field.inputMode = input.inputMode;
            field.autocomplete = "off";
            field.spellcheck = false;
            field.setAttribute("aria-label", input.label || title);

            if (input.label) {
                const label = document.createElement("label");
                label.className = "dialog-text";
                label.textContent = input.label;
                sheet.appendChild(label);
            }
            sheet.appendChild(field);

            error = document.createElement("div");
            error.className = "dialog-error";
            sheet.appendChild(error);
        }

        const actions = document.createElement("div");
        actions.className = "dialog-actions";
        sheet.appendChild(actions);

        let finished = false;
        const finish = value => {
            if (finished) return;
            finished = true;
            window.removeEventListener("keydown", onKey, true);
            dialogOverlay = null;

            overlay.style.pointerEvents = "none";
            sheetCollapse(sheet, 130);
            overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
            resolve(value);
        };

        const submit = button => {
            if (!button.confirm) { finish(button.cancelValue); return; }
            if (!field) { finish(button.value); return; }

            const text = field.value.trim();
            let problem = "";
            if (!text && !input.allowEmpty) problem = "Escribe algo para continuar.";
            else if (validate && text) problem = validate(text) || "";
            else if (input.validate && text) problem = input.validate(text) || "";

            if (problem) { error.textContent = problem; field.focus(); return; }
            finish(text);
        };

        buttons.forEach(b => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `dialog-btn ${b.kind || "ghost"}`;
            btn.textContent = b.label;
            btn.onclick = () => submit(b);
            actions.appendChild(btn);
            b._el = btn;
        });

        const confirmButton = buttons.find(b => b.confirm);
        const cancelButton = buttons.find(b => !b.confirm) || confirmButton;

        sheet.addEventListener("submit", e => { e.preventDefault(); submit(confirmButton); });
        if (field) field.addEventListener("input", () => { error.textContent = ""; });

        const onKey = e => { if (e.key === "Escape") { e.stopPropagation(); submit(cancelButton); } };
        window.addEventListener("keydown", onKey, true);

        overlay.addEventListener("pointerdown", e => { if (e.target === overlay) submit(cancelButton); });

        overlay.appendChild(sheet);
        document.body.appendChild(overlay);
        dialogOverlay = overlay;

        overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
        sheetAppear(sheet);

        const focusTarget = field || confirmButton._el;
        setTimeout(() => { focusTarget.focus(); if (field) field.select(); }, 60);
    });
}

function askText({ title, label, value, placeholder, maxLength, inputMode, allowEmpty, validate, confirmLabel }) {
    return openDialog({
        title,
        input: { label, value, placeholder, maxLength, inputMode, allowEmpty, validate },
        buttons: [
            { label: "Cancelar", kind: "ghost", confirm: false, cancelValue: null },
            { label: confirmLabel || "Aceptar", kind: "accept", confirm: true }
        ]
    });
}

function askConfirm({ title, message, confirmLabel, danger = true }) {
    return openDialog({
        title,
        message,
        buttons: [
            { label: "Cancelar", kind: "ghost", confirm: false, cancelValue: false },
            { label: confirmLabel || "Borrar", kind: danger ? "danger" : "accept", confirm: true, value: true }
        ]
    });
}

function showMessage({ title, message }) {
    return openDialog({
        title,
        message,
        buttons: [{ label: "Entendido", kind: "accept", confirm: true, value: true, cancelValue: undefined }]
    });
}

/* Destello discreto (color del destello de Ajustes) que se apaga solo: al aparecer ventanas y tarjetas nuevas */
const GLOW_RING = "0 0 0 1px rgba(var(--ui-rgb), .6), 0 0 11px rgba(var(--ui-rgb), .4)";
function glowOnce(el) {
    const base = getComputedStyle(el).boxShadow;
    const rest = base && base !== "none" ? base : "0 0 0 0 transparent";
    el.animate([{ boxShadow: `${GLOW_RING}, ${rest}` }, { boxShadow: `0 0 0 0 transparent, 0 0 0 0 transparent, ${rest}` }],
               { duration: 700 * NAV_SPEED, easing: "ease-out" });
}

/* Aparición de toda ventana emergente: empieza arriba y se despliega hacia abajo, con el destello */
function sheetAppear(sheet) {
    sheet.animate([
        { clipPath: "inset(0 0 100% 0 round 20px)", transform: "translateY(-10px)", opacity: .3 },
        { clipPath: "inset(0 0 0 0 round 20px)", transform: "none", opacity: 1 }
    ], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
    glowOnce(sheet);
}

/* Al cerrarse, se recoge hacia arriba */
function sheetCollapse(sheet, ms) {
    return sheet.animate([
        { clipPath: "inset(0 0 0 0 round 20px)", transform: "none", opacity: 1 },
        { clipPath: "inset(0 0 100% 0 round 20px)", transform: "translateY(-10px)", opacity: 0 }
    ], { duration: ms, easing: "ease-in", fill: "forwards" });
}

/* Ventana flotante genérica con título y ✕ (test TDEE, resultado, plan, historial de comida).
   Se cierra con ✕, Escape o tocando fuera. Devuelve { sheet, close }. */
/* locked: sin ✕, sin cerrar con Escape ni tocando fuera (hay que usar sus botones) */
function openSheet(className, title, onClose, { locked = false } = {}) {
    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";
    const sheet = document.createElement("div");
    sheet.className = `picker-sheet ${className}`;
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "picker-head";
    const h = document.createElement("h3");
    h.className = "picker-title";
    h.textContent = title;
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "picker-close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.textContent = "✕";
    head.append(h, closeBtn);
    sheet.appendChild(head);
    overlay.appendChild(sheet);

    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener("keydown", onKey, true);
        if (onClose) onClose();
        overlay.style.pointerEvents = "none";
        sheetCollapse(sheet, 130);
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
    };
    /* Escape cierra solo la ventana de más arriba (no si hay otra encima o si se está escribiendo) */
    const onKey = e => {
        if (e.key !== "Escape" || locked || dialogOverlay || stepperOverlay || pickerOverlay) return;
        if (e.target.closest && e.target.closest("input, textarea")) return;
        if (overlay !== [...document.querySelectorAll(".picker-overlay")].pop()) return;
        e.preventDefault();
        close();
    };
    window.addEventListener("keydown", onKey, true);
    closeBtn.onclick = close;
    closeBtn.hidden = locked;
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay && !locked) close(); });

    document.body.appendChild(overlay);
    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    sheetAppear(sheet);
    return { sheet, close };
}
