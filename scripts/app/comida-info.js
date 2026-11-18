"use strict";

/* =====================================================================
   Comida · botón "i": aviso de que todo es una estimación en desarrollo, y un comentario al día
   (evaluar un alimento, queja o sugerencia) que llega al servidor de la app (tabla feedback), no por correo.
   El id es anónimo y propio del teléfono (no es el de la cuenta).
   ===================================================================== */

const FEEDBACK_ID_KEY = "qpeeg_feedback_id";
const FEEDBACK_DAY_KEY = "qpeeg_feedback_day";      /* día (UTC, igual que el servidor) del último enviado */
const FEEDBACK_KINDS = [
    { k: "alimento",   name: "Evaluar un alimento", hint: "¿Qué alimento y qué crees que está mal? (porción, calorías, sodio…)" },
    { k: "queja",      name: "Queja",               hint: "Cuéntanos qué no te gustó o qué no funciona bien" },
    { k: "sugerencia", name: "Sugerencia",          hint: "¿Qué alimento falta o qué mejorarías?" }
];
const FEEDBACK_MAX_CHARS = 600;

const utcDay = () => new Date().toISOString().slice(0, 10);
function feedbackId() {
    let id = null;
    try { id = localStorage.getItem(FEEDBACK_ID_KEY); } catch (e) { /* sin almacenamiento */ }
    if (!/^[0-9a-f]{64}$/.test(id || "")) {
        const b = crypto.getRandomValues(new Uint8Array(32));
        id = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
        try { localStorage.setItem(FEEDBACK_ID_KEY, id); } catch (e) { /* sin almacenamiento */ }
    }
    return id;
}
function feedbackSentToday() {
    try { return localStorage.getItem(FEEDBACK_DAY_KEY) === utcDay(); } catch (e) { return false; }
}

/* Botón "i": solo en Comida, a la derecha (si está "Hoy", este se corre a su izquierda) */
function updateInfoButton(sectionId) {
    const btn = document.getElementById("infoBtn");
    if (!btn) return;
    btn.hidden = sectionId !== "food" || !nutrition();
    btn.parentElement.classList.toggle("has-info", !btn.hidden);
}

function openFoodInfo() {
    const { sheet, close } = openSheet("tdee-sheet food-info", "Sobre el contador");
    const body = el("div", "t-body food-info-body");
    body.appendChild(el("p", "food-info-note", "<b>Todo lo que ves en el contador de calorías es una estimación.</b> Está en desarrollo y puede cambiar: calorías, macros, porciones, fibra, azúcar, sodio y edulcorantes salen de etiquetas, tablas de referencia y cálculos aproximados. Úsalo como guía, no como un dato exacto."));
    body.appendChild(el("p", "food-info-note", "Si crees que un alimento está mal o falta alguno, mándanos un comentario. Puedes enviar uno al día."));

    const kinds = el("div", "food-info-kinds");
    let kind = FEEDBACK_KINDS[0].k;
    const text = el("textarea", "food-info-text");
    text.maxLength = FEEDBACK_MAX_CHARS;
    text.rows = 4;
    const count = el("small", "food-info-count");
    const status = el("p", "food-info-status");
    const send = el("button", "dialog-btn accept food-info-send", "Enviar");
    send.type = "button";
    const paint = () => {
        const k = FEEDBACK_KINDS.find(x => x.k === kind);
        text.placeholder = k.hint;
        [...kinds.children].forEach(b => b.classList.toggle("active", b.dataset.k === kind));
        count.textContent = `${text.value.length} / ${FEEDBACK_MAX_CHARS}`;
        send.disabled = !text.value.trim() || feedbackSentToday();
    };
    FEEDBACK_KINDS.forEach(k => {
        const b = el("button", "food-info-kind", k.name);
        b.type = "button";
        b.dataset.k = k.k;
        b.onclick = () => { kind = k.k; paint(); };
        kinds.appendChild(b);
    });
    text.oninput = paint;

    send.onclick = async () => {
        const msg = text.value.trim();
        if (!msg || feedbackSentToday()) return;
        const cfg = typeof QPEEG_SYNC !== "undefined" ? QPEEG_SYNC : null;
        if (!cfg || !cfg.url || navigator.onLine === false) { status.textContent = "Sin conexión: inténtalo cuando tengas internet."; return; }
        send.disabled = true;
        status.textContent = "Enviando…";
        let out = null;
        try {
            const res = await fetch(cfg.url.replace(/\/+$/, "") + "/rest/v1/rpc/qpeeg_feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json", apikey: cfg.key, Authorization: "Bearer " + cfg.key },
                body: JSON.stringify({ p_id: feedbackId(), p_kind: kind, p_text: msg, p_ver: typeof APP_VERSION !== "undefined" ? APP_VERSION : "?" })
            });
            out = res.ok ? await res.json() : null;
        } catch (e) { out = null; }
        if (out === 1 || out === -4) {
            try { localStorage.setItem(FEEDBACK_DAY_KEY, utcDay()); } catch (e) { /* sin almacenamiento */ }
        }
        if (out === 1) { text.value = ""; status.textContent = "¡Gracias! Tu comentario llegó. Lo vamos a revisar."; }
        else if (out === -4) status.textContent = "Ya enviaste tu comentario de hoy. Puedes mandar otro mañana.";
        else if (out === -3) status.textContent = "Hoy llegaron muchos comentarios. Inténtalo mañana.";
        else status.textContent = "No se pudo enviar. Inténtalo de nuevo en un rato.";
        paint();
    };

    body.append(kinds, text, count, send, status);
    if (feedbackSentToday()) status.textContent = "Ya enviaste tu comentario de hoy. Puedes mandar otro mañana.";
    sheet.appendChild(body);
    paint();
    return close;
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("infoBtn").addEventListener("click", () => { if (!SWIPE.busy) openFoodInfo(); });
});
