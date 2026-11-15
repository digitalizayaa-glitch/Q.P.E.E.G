/* =========================================================
    VALORES DESLIZABLES (motor común)
    kg, reps, series, rangos, deportes, metas: deslizar arriba sube, abajo baja; un toque abre su cuadro.
    Lo usan entreno.js, rutinas.js, deportes.js, nutricion.js y selector-numero.js.
========================================================= */

/* Deslizar verticalmente sobre un número lo sube (arriba) o lo baja (abajo):
   un paso cada VALUE_STEP_PX píxeles, con la animación del número. */
const VALUE_STEP_PX = 26;

/* Deslizar sobre el número lo sube/baja (un paso cada stepPx px). Un toque corto (sin mover) llama a onTap. */
/* Valores deslizables (kg, reps, series, rangos, deportes, metas…).
   - Libres en el resto de la app y en ventanas que no necesitan desplazarse: se deslizan directo y un
     toque abre su cuadro (onTap).
   - Bloqueados en el entreno diario, en el editor de rutinas y en ventanas emergentes altas que se
     desplazan, para no cambiarlos sin querer al desplazar. 1.er toque → se activan (pulso discreto) y se pueden deslizar; 2.º toque → abre su
     cuadro; al soltar después de deslizar, o 3 s sin tocarlos → se bloquean otra vez. */
const VALUE_ARM_MS = 3000;
let armedValue = null;   /* { el, timer } — solo uno activo a la vez (el = zona que se desliza) */

/* La zona que se desliza (todo el cuadro, letras incluidas) y el cuadro que late pueden ser distintos */
const valueGlow = el => el._valueGlow || el;

function disarmValue() {
    if (!armedValue) return;
    clearTimeout(armedValue.timer);
    armedValue.el.classList.remove("value-live");
    valueGlow(armedValue.el).classList.remove("value-armed");
    armedValue = null;
}

function armValue(el) {
    if (!armedValue || armedValue.el !== el) {
        disarmValue();
        el.classList.add("value-live");
        valueGlow(el).classList.add("value-armed");
        armedValue = { el, timer: 0 };
    }
    clearTimeout(armedValue.timer);
    armedValue.timer = setTimeout(disarmValue, VALUE_ARM_MS);
}

const isArmed = el => !!(armedValue && armedValue.el === el);

/* ¿Pide un toque para activarse? Entreno diario, editor de rutinas o ventana emergente que se desplaza */
function inScrollingPopup(el) {
    if (el.closest("#workout, #exercises, .day-sheet")) return true;   /* entreno diario y editor de rutinas (ventana del día): siempre */
    const popup = el.closest(".picker-sheet");
    if (!popup) return false;
    for (let n = el.parentElement; n; n = n.parentElement) {
        if (n.scrollHeight > n.clientHeight + 2) {
            const oy = getComputedStyle(n).overflowY;
            if (oy === "auto" || oy === "scroll") return true;
        }
        if (n === popup) break;
    }
    return false;
}
/* "value-free" = se desliza sin activar (el navegador no desplaza la página con ese dedo) */
const syncValueMode = el => { if (el.isConnected) el.classList.toggle("value-free", !inScrollingPopup(el)); };

/* opts.area: zona que recibe el gesto (por defecto el número); opts.glow: cuadro que late (por defecto la zona) */
function attachValueSwipe(el, onStep, onTap, stepPx = VALUE_STEP_PX, opts = {}) {
    if (opts.area) { el = opts.area; }
    if (opts.glow) el._valueGlow = opts.glow;
    el.classList.add("value-zone");
    /* El navegador del teléfono "ajusta" un toque hacia el botón más cercano (kg/lb) si lo que hay bajo el dedo
       no parece tocable. Se marcan como tocables las partes de la zona (letras, número) para que no se lo lleve */
    const markTappable = () => el.querySelectorAll("*").forEach(n => {
        if (n._tappable || n.closest("button")) return;
        n._tappable = true;
        n.addEventListener("click", () => {});
    });
    requestAnimationFrame(markTappable);
    let lastY = null, pointer = null, startX = 0, startY = 0, startT = 0, moved = false, live = false, free = false;
    /* el modo se decide cuando ya está en pantalla (y otra vez cuando la ventana termina de abrir; al cambiar de tamaño, el escuchador global) */
    requestAnimationFrame(() => syncValueMode(el));
    setTimeout(() => syncValueMode(el), 450);

    el.addEventListener("pointerdown", e => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (e.target.closest && e.target.closest("input")) return;
        const btn = e.target.closest && e.target.closest("button");
        if (btn && btn !== el && el.contains(btn)) return;     /* un botón dentro de la zona (kg/lb) hace lo suyo */
        lastY = startY = e.clientY;
        startX = e.clientX;
        startT = performance.now();
        moved = false;
        pointer = e.pointerId;
        syncValueMode(el);
        free = el.classList.contains("value-free");
        live = free || isArmed(el);
        if (!live) return;                  /* bloqueado: solo se cuenta el toque, sin quitarle el gesto a la página */
        if (armedValue) clearTimeout(armedValue.timer);      /* mientras el dedo está encima no se bloquea */
        try { el.setPointerCapture(pointer); } catch (err) {}
    });

    el.addEventListener("pointermove", e => {
        if (lastY === null || e.pointerId !== pointer) return;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) moved = true;
        if (!live) return;

        let dy = e.clientY - lastY;
        while (Math.abs(dy) >= stepPx) {
            const dir = dy < 0 ? 1 : -1;          /* arriba = subir */
            onStep(dir);
            lastY -= dir * stepPx;
            dy = e.clientY - lastY;
        }
    });

    el.addEventListener("pointerup", () => {
        const tap = lastY !== null && !moved && performance.now() - startT < 400;
        const wasLive = live;
        lastY = null; pointer = null; live = false;
        if (!wasLive) { if (tap) armValue(el); return; }        /* 1.er toque: activar */
        if (tap && onTap) { disarmValue(); onTap(); return; }   /* libre o 2.º toque: abrir el cuadro */
        if (isArmed(el)) disarmValue();                         /* ya se puso el valor: deja de latir */
    });
    el.addEventListener("pointercancel", () => {
        lastY = null; pointer = null;
        if (live && isArmed(el)) disarmValue();
        live = false;
    });
}

/* Un solo escuchador para todos: al cambiar el tamaño de la ventana se recalcula si cada zona visible
   pide toque para activarse. (Antes cada valor agregaba el suyo y nunca se quitaba: 273 escuchadores
   tras 20 refrescos del entreno, que retenían pantallas viejas en memoria.) */
if (typeof window !== "undefined") {
    let resizeRaf = 0;
    window.addEventListener("resize", () => {
        cancelAnimationFrame(resizeRaf);
        resizeRaf = requestAnimationFrame(() => document.querySelectorAll(".value-zone").forEach(syncValueMode));
    });
}
