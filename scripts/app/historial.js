/* =========================================================
    HISTORIAL
========================================================= */

let historyOffset = 0;          /* 0 = mes actual, -1 = anterior… */
let historyMode = "workout";    /* "workout" = ejercicio, "food" = calorías */

/* Calorías del día frente a la meta del plan: ≤60 % rojo, 61-75 % amarillo, 76-120 % verde, ≥121 % rojo */
function foodDayStatus(key) {
    const entries = foodEntries(key).filter(e => e.g !== "agua");   /* el agua no tiene calorías: un día con solo agua queda gris */
    return entries.length ? kcalStatus(foodTotals(entries).kcal) : "empty";
}

const HISTORY_KIND = { workout: "Entrenos", food: "Calorías", sport: "Deportes" };

let historyView = "calendar";   /* "calendar" o "chart" */
let chartPeriod = "day";        /* "day", "week" o "month" */

function renderHistory(animate) {
    const now = new Date();
    const view = new Date(now.getFullYear(), now.getMonth() + historyOffset, 1);
    const year = view.getFullYear();
    const month = view.getMonth();
    const isChart = historyView === "chart";

    /* el botón cambia entre ejercicio → calorías → deportes */
    const MODES = ["workout", "food", "sport"], NEXT_LABEL = { workout: "Ver calorías", food: "Ver deportes", sport: "Ver ejercicio" };
    const modeBtn = document.getElementById("histModeBtn");
    modeBtn.textContent = NEXT_LABEL[historyMode];
    modeBtn.onclick = () => { historyMode = MODES[(MODES.indexOf(historyMode) + 1) % MODES.length]; renderHistory(true); };

    /* En la gráfica, "Calendario completo" pasa a ser el filtro: cada toque cambia Días → Semanas → Meses */
    const monthsBtn = document.getElementById("histMonthsBtn");
    monthsBtn.textContent = isChart ? `Por ${CHART_PERIODS[chartPeriod].label.toLowerCase()}` : "Calendario completo";
    monthsBtn.onclick = isChart
        ? () => { const order = Object.keys(CHART_PERIODS); chartPeriod = order[(order.indexOf(chartPeriod) + 1) % order.length]; renderHistory(true); }
        : openMonthPicker;

    const chartBtn = document.getElementById("histChartBtn");
    chartBtn.textContent = isChart ? "Ver calendario" : "Ver gráfica";
    chartBtn.onclick = () => fadeHistoryView(isChart ? "calendar" : "chart");

    const grid = document.getElementById("historyGrid");
    const chart = document.getElementById("historyChart");
    grid.hidden = isChart;
    chart.hidden = !isChart;

    /* Entre el calendario y los botones: en qué calendario se está (en la gráfica ya lo dice su título) */
    const kind = document.getElementById("historyKind");
    kind.textContent = HISTORY_KIND[historyMode];
    kind.hidden = isChart;

    if (isChart) {
        document.getElementById("historyTitle").textContent = `${{ workout: "Peso levantado", food: "Calorías", sport: "Deportes" }[historyMode]} por ${CHART_PERIODS[chartPeriod].unit}`;
        renderHistoryChart(chart, animate);
        return;
    }

    const title = view.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    document.getElementById("historyTitle").textContent = title.charAt(0).toUpperCase() + title.slice(1);

    grid.innerHTML = "";

    const routine = findRoutine(state.activeRoutineId);
    if (historyMode === "workout" && !routine && !findRoutine(EXTRA_ROUTINE_ID)) {
        const msg = document.createElement("p");
        msg.className = "split-caption";
        msg.style.gridColumn = "1 / -1";
        msg.textContent = "Selecciona una rutina en la pestaña Rutinas";
        grid.appendChild(msg);
        if (animate) popIn(grid.children);
        return;
    }

    ["L", "M", "X", "J", "V", "S", "D"].forEach(letter => {
        const h = document.createElement("div");
        h.className = "history-weekday";
        h.textContent = letter;
        grid.appendChild(h);
    });

    const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // lunes primero
    for (let i = 0; i < firstOffset; i++) {
        const blank = document.createElement("div");
        blank.className = "history-cell blank";
        grid.appendChild(blank);
    }

    const todayKey = dateKey(now);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let d = 1; d <= daysInMonth; d++) {
        const key = dateKey(new Date(year, month, d));
        const status = historyMode === "workout" ? workoutDayStatus(key)
            : historyMode === "food" ? foodDayStatus(key)
            : (state.sports[key] ? "sport" : "empty");

        const cell = document.createElement("button");
        cell.className = "history-cell";
        cell.textContent = d;
        cell.dataset.key = key;

        if (status === "green") cell.classList.add("green");
        if (status === "red") cell.classList.add("red");
        if (status === "gold") cell.classList.add("gold");
        if (status === "sport") cell.classList.add("sport");
        if (historyMode !== "sport" && state.sports[key]) cell.classList.add("has-sport");   /* punto: ese día hubo deporte */
        if (key === todayKey) cell.classList.add("today");

        if (key > todayKey) {
            cell.classList.add("future");
        } else if (historyMode === "workout") {
            cell.onclick = () => navFade(() => openHistoryDay(key));
        } else if (historyMode === "sport") {
            cell.onclick = () => navFade(() => { setViewDate(key); showSection("week"); });
        } else {
            cell.onclick = () => navFade(() => { setViewDate(key); showSection("food"); });
        }
        if (key === viewDate()) cell.classList.add("viewing");   /* el día que se está viendo */
        cell.setAttribute("aria-label", dayAriaLabel(key, d, status));   /* el color también en palabras (lectores de pantalla) */

        grid.appendChild(cell);
    }

    if (animate) popIn(grid.children);
}

const DAY_STATUS_WORDS = {
    workout: { green: "entreno en meta", gold: "entreno superado", red: "faltaron repeticiones", empty: "sin entreno" },
    food: { green: "calorías en meta", gold: "calorías algo bajas", red: "calorías fuera de meta", empty: "sin comidas" },
    sport: { sport: "con deporte", empty: "sin deporte" }
};
function dayAriaLabel(key, d, status) {
    const month = parseKey(key).toLocaleDateString("es-ES", { month: "long" });
    const words = [`${d} de ${month}`, (DAY_STATUS_WORDS[historyMode] || {})[status] || ""];
    if (historyMode !== "sport" && state.sports[key]) words.push("con deporte");
    if (key === dateKey(new Date())) words.push("hoy");
    return words.filter(Boolean).join(", ");
}

/* Aparición del calendario al cambiar de uno a otro: cada elemento surge un poco más pequeño y transparente */
/* Calendario <-> gráfica: el contenido se desvanece y aparece el otro */
async function fadeHistoryView(next) {
    const parts = ["historyKind", "historyTitle", "historyGrid", "historyChart"].map(id => document.getElementById(id));
    await Promise.all(parts.map(p => p.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 110 * NAV_SPEED, easing: "ease-in", fill: "forwards" }).finished.catch(() => {})));
    historyView = next;
    renderHistory(false);
    parts.forEach(p => { p.getAnimations().forEach(a => a.cancel()); p.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 * NAV_SPEED, easing: "ease-out" }); });
}

/* ---------- Gráfica del historial: calorías o peso levantado (kg × reps) ---------- */

const CHART_PERIODS = {
    day:   { label: "Días",    unit: "día",    count: 14 },
    week:  { label: "Semanas", unit: "semana", count: 8 },
    month: { label: "Meses",   unit: "mes",    count: 6 }
};
const LB_TO_KG = 0.4536;

/* Grupos de fechas del periodo, del más antiguo al actual (sin días futuros) */
function chartBuckets(period) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = dateKey(today);
    const out = [];
    const daysFrom = (start, n) => Array.from({ length: n }, (_, i) => dateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))).filter(k => k <= todayKey);
    const short = d => d.toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "");

    for (let i = CHART_PERIODS[period].count - 1; i >= 0; i--) {
        if (period === "day") {
            const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
            out.push({ label: String(d.getDate()), title: d.toLocaleDateString("es-ES", { day: "numeric", month: "long" }), keys: [dateKey(d)] });
        } else if (period === "week") {
            const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7) - i * 7);
            out.push({ label: short(monday), title: `Semana del ${short(monday)}`, keys: daysFrom(monday, 7) });
        } else {
            const first = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
            const name = first.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
            out.push({ label: name, title: first.toLocaleDateString("es-ES", { month: "long", year: "numeric" }), keys: daysFrom(first, days) });
        }
    }
    return out;
}

/* Calorías de un día (sin el agua); null si no se registró comida */
function dayKcal(key) {
    const entries = foodEntries(key).filter(e => e.g !== "agua");
    return entries.length ? foodTotals(entries).kcal : null;
}

/* Variantes del color del destello para cada día de entreno (Push, Pull, Legs...):
   mismo tono base, corrido un poco y con otra luminosidad. Cada una va además con su forma
   de punto, para que se distingan aunque los colores se parezcan. */
function glowVariants(n) {
    const rgb = getComputedStyle(document.documentElement).getPropertyValue("--ui-rgb").split(",").map(Number);
    const [r, g, b] = rgb.map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    /* en tema claro, tonos más oscuros para que se lean sobre el fondo claro */
    const light = document.documentElement.dataset.theme === "light";
    const OFFS = [0, -34, 34, -68, 68, 102];
    const LIGHT = light ? [.45, .36, .55, .30, .50, .40] : [.55, .70, .45, .64, .52, .74];
    return Array.from({ length: n }, (_, i) => `hsl(${Math.round(h + OFFS[i % 6])} ${Math.round(Math.max(45, Math.min(85, sat * 100)))}% ${Math.round(LIGHT[i % 6] * 100)}%)`);
}

/* Forma de punto n.º i centrada en (x, y) con radio r */
function markerPath(i, x, y, r) {
    const pts = (n, rot, rr = r) => Array.from({ length: n }, (_, k) => {
        const a = rot + (k * 2 * Math.PI) / n;
        return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
    }).join(" L");
    switch (i % 6) {
        case 0: return `M${x - r},${y} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;   /* círculo */
        case 1: return `M${pts(4, Math.PI / 4, r * 1.25)} Z`;                                              /* cuadrado */
        case 2: return `M${pts(4, 0, r * 1.3)} Z`;                                                         /* rombo */
        case 3: return `M${pts(3, -Math.PI / 2, r * 1.35)} Z`;                                             /* triángulo */
        case 4: return `M${pts(3, Math.PI / 2, r * 1.35)} Z`;                                              /* triángulo invertido */
        default: return `M${pts(6, 0, r * 1.2)} Z`;                                                        /* hexágono */
    }
}

/* Sesiones de entreno de un día: [{ group, name, volume }]. group = rutina + día (Push, Pull...) */
function daySessions(key) {
    const out = [];
    for (const rid in state.logs) {
        const entry = state.logs[rid][key];
        if (!entry) continue;
        const routine = findRoutine(rid);
        let volume = 0;
        for (const id in entry.exercises) {
            const x = entry.exercises[id];
            const ex = routine && routine.days.flatMap(d => d.exercises).find(e => e.id === id);
            const kg = (x.kg || 0) * (ex && ex.unit === "lb" ? LB_TO_KG : 1);
            volume += kg * x.reps.reduce((a, r) => a + (r || 0), 0);     /* peso × repeticiones de cada serie */
        }
        if (volume <= 0) continue;
        const day = routine && findDay(routine, entry.dayId);
        out.push({ group: `${rid}/${entry.dayId}`, name: day ? day.name : "Día borrado", volume });
    }
    return out;
}

function renderHistoryChart(box, animate) {
    const buckets = chartBuckets(chartPeriod);
    const perDay = chartPeriod === "day";
    const fmt = v => fmtNum(Math.round(v), 0);
    box.innerHTML = "";

    if (historyMode === "food") {
        const points = [];
        buckets.forEach((b, i) => {
            const days = b.keys.map(dayKcal).filter(v => v !== null);
            if (days.length) points.push({ i, value: days.reduce((a, v) => a + v, 0) / days.length, group: "kcal", n: days.length });
        });
        const goal = planKcal();
        dotPanel(box, {
            buckets, points, goal, animate, aria: "Calorías",
            styleOf: () => ({ color: "var(--ui)", shape: 0 }),
            summary: () => `Promedio <b>${fmt(points.reduce((a, p) => a + p.value, 0) / points.length)} kcal</b>${perDay ? "" : " al día"} · meta ${fmt(goal)}`,
            detail: p => `${buckets[p.i].title} · <b>${fmt(p.value)} kcal</b>${perDay ? "" : ` al día (${p.n} ${p.n === 1 ? "día" : "días"})`}`,
            empty: "Aún no hay comidas registradas en este periodo."
        });
        return;
    }

    if (historyMode === "workout") {
        const points = [], groups = [];
        buckets.forEach((b, i) => {
            const byGroup = new Map();
            b.keys.forEach(k => daySessions(k).forEach(sx => {
                const g = byGroup.get(sx.group) || { name: sx.name, total: 0, n: 0 };
                g.total += sx.volume; g.n += 1;
                byGroup.set(sx.group, g);
            }));
            byGroup.forEach((g, group) => {
                if (!groups.some(x => x.group === group)) groups.push({ group, name: g.name });
                points.push({ i, value: g.total / g.n, group, name: g.name, n: g.n });   /* promedio por sesión */
            });
        });
        const colors = glowVariants(groups.length);
        const total = buckets.reduce((a, b) => a + b.keys.reduce((s2, k) => s2 + daySessions(k).reduce((t, x) => t + x.volume, 0), 0), 0);
        dotPanel(box, {
            buckets, points, groups, animate, aria: "Peso levantado",
            styleOf: group => { const k = Math.max(0, groups.findIndex(g => g.group === group)); return { color: colors[k], shape: k }; },
            summary: () => `Total <b>${fmt(total)} kg</b> levantados${perDay ? "" : " · puntos = promedio por sesión"}`,
            detail: p => `${p.name} · ${buckets[p.i].title} · <b>${fmt(p.value)} kg</b>${p.n > 1 ? ` (promedio de ${p.n} sesiones)` : ""}`,
            empty: "Aún no hay entrenos registrados en este periodo."
        });
        return;
    }

    /* Deportes: una sola gráfica con la carga (100 = 40 min de ejercicio moderado: ver deportes.js), cada deporte con su color y forma.
       La carga junta tiempo, distancia y desnivel (ver deportes.js), así que todos los deportes se comparan */
    const groups = [];
    const points = [];
    buckets.forEach((b, i) => {
        const sums = new Map();
        b.keys.forEach(k => (state.sports[k] || []).forEach(sp => {
            const group = normalizeText(sp.n);
            const g = sums.get(group) || { name: sp.n, load: 0, n: 0, min: 0, km: 0, up: 0 };
            g.load += sportLoad(sp); g.n += 1;
            g.min += sp.min || 0; g.km += sp.km || 0; g.up += sp.up || 0;
            sums.set(group, g);
        }));
        sums.forEach((g, group) => {
            if (!groups.some(x => x.group === group)) groups.push({ group, name: g.name });
            points.push({ i, value: Math.round(g.load), group, name: g.name, n: g.n, raw: g });
        });
    });
    if (!groups.length) {
        dotPanel(box, { buckets, points: [], empty: "Aún no hay deportes registrados en este periodo." });
        return;
    }
    const colors = glowVariants(groups.length);
    const total = points.reduce((a, p) => a + p.value, 0);
    const sessions = points.reduce((a, p) => a + p.n, 0);
    dotPanel(box, {
        buckets, points, groups, animate, aria: "Carga de deportes",
        heading: "Carga 100 = ejercicio moderado",
        goal: chartPeriod === "day" ? 100 : null, goalLabel: "Moderado",
        styleOf: group => { const k = Math.max(0, groups.findIndex(g => g.group === group)); return { color: colors[k], shape: k }; },
        summary: () => `Carga total <b>${fmtNum(total, 0)}</b> · ${sessions} ${sessions === 1 ? "salida" : "salidas"}${chartPeriod === "day" ? "" : " · cada punto suma las salidas"}`,
        detail: p => `${p.name} · ${buckets[p.i].title} · carga <b>${p.value}</b>${sportSummary(p.raw) ? " · " + sportSummary(p.raw) : ""}${p.n > 1 ? ` (${p.n} veces)` : ""}`
    });
}

/* Texto en un solo renglón con la letra más grande que quepa (por defecto 16 → 11 px) */
function fitText(el, max = 16, min = 11) {
    for (let size = max; size >= min; size -= 0.5) {
        el.style.fontSize = size + "px";
        if (el.scrollWidth <= el.clientWidth + 1) return;
    }
}
const fitCaption = el => fitText(el);

/* Un panel de puntos: resumen arriba, leyenda (si hay grupos), una sola escala, halo del color de cada punto,
   línea fina que une los puntos de un mismo grupo y detalle al tocar un punto */
function dotPanel(box, { buckets, points, groups = [], H, goal = null, goalLabel = "Meta", animate, aria = "", heading, styleOf, summary, detail, empty }) {
    if (heading) {
        const h = document.createElement("div");
        h.className = "chart-heading";
        h.textContent = heading;
        box.appendChild(h);
    }
    const caption = document.createElement("div");
    caption.className = "chart-caption";
    box.appendChild(caption);

    if (!points.length) {
        const p = document.createElement("p");
        p.className = "chart-empty";
        p.textContent = empty || "Sin datos en este periodo.";
        box.appendChild(p);
        return;
    }
    caption.innerHTML = summary();
    fitCaption(caption);

    if (groups.length) {
        const legend = document.createElement("div");
        legend.className = "chart-legend";
        groups.forEach(g => {
            const { color, shape } = styleOf(g.group);
            const item = document.createElement("span");
            item.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="${markerPath(shape, 8, 8, 5)}" fill="${color}"/></svg>`;
            item.append(g.name);
            legend.appendChild(item);
        });
        box.appendChild(legend);
    }

    const W = Math.max(260, box.clientWidth || 340);
    /* El alto de la gráfica es el que queda libre en su caja (la caja tiene alto fijo: todas las gráficas
       miden lo mismo y los botones de abajo no se mueven) */
    if (!H) {
        const used = [...box.children].reduce((a, c) => a + c.offsetHeight, 0);
        const gaps = Math.max(0, box.children.length) * (parseFloat(getComputedStyle(box).rowGap) || 0);
        H = Math.max(110, Math.floor((box.clientHeight || 375) - used - gaps));
    }
    const m = { l: 40, r: 10, t: 14, b: 22 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const top = Math.max(goal || 0, ...points.map(p => p.value)) * 1.12;
    const step = niceStep(top / (H > 250 ? 4 : 2));
    const max = Math.ceil(top / step) * step;
    const y = v => m.t + ph - (v / max) * ph;
    const slot = pw / buckets.length;
    const short = v => (v >= 1000 ? `${fmtNum(v / 1000, 1)} k` : fmtNum(v, v < 10 ? 1 : 0));

    points.forEach(p => {
        const same = points.filter(q => q.i === p.i);
        const k = same.indexOf(p), spread = Math.min(12, slot / (same.length + 1));
        p.x = m.l + slot * p.i + slot / 2 + (k - (same.length - 1) / 2) * spread;
        p.y = y(p.value);
    });

    let svg = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${aria}">`;
    for (let v = 0; v <= max + 1e-9; v += step) {
        svg += `<line class="chart-grid" x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text class="chart-tick" x="${m.l - 6}" y="${y(v) + 3}" text-anchor="end">${short(v)}</text>`;
    }
    const every = buckets.length > 7 ? 2 : 1;
    buckets.forEach((b, i) => {
        if ((buckets.length - 1 - i) % every === 0) svg += `<text class="chart-label" x="${m.l + slot * i + slot / 2}" y="${H - 6}" text-anchor="middle">${b.label}</text>`;
    });
    svg += `<line class="chart-base" x1="${m.l}" x2="${W - m.r}" y1="${m.t + ph}" y2="${m.t + ph}"/>`;
    if (goal) svg += `<line class="chart-goal" x1="${m.l}" x2="${W - m.r}" y1="${y(goal)}" y2="${y(goal)}"/><text class="chart-goal-label" x="${goalLabel === "Meta" ? W - m.r : m.l + 2}" y="${y(goal) - 5}" text-anchor="${goalLabel === "Meta" ? "end" : "start"}">${goalLabel}</text>`;

    [...new Set(points.map(p => p.group))].forEach(group => {
        const ps = points.filter(p => p.group === group).sort((a, b) => a.i - b.i);
        if (ps.length > 1) svg += `<polyline class="chart-line" points="${ps.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}" style="stroke:${styleOf(group).color}"/>`;
    });
    points.forEach((p, n) => {
        const { color, shape } = styleOf(p.group);
        svg += `<g class="chart-pt" data-n="${n}" style="--c:${color}">
            <circle class="chart-halo" cx="${p.x}" cy="${p.y}" r="13"/>
            <path class="chart-dot" d="${markerPath(shape, p.x, p.y, 5)}"/>
            <circle class="chart-hit" cx="${p.x}" cy="${p.y}" r="18"/>
        </g>`;
    });
    svg += `</svg>`;
    box.insertAdjacentHTML("beforeend", svg);

    /* tocar un punto muestra su detalle; tocarlo otra vez vuelve al resumen */
    let selected = -1;
    const svgEl = box.querySelector(".chart-svg");
    svgEl.addEventListener("click", e => {
        const hit = e.target.closest(".chart-pt");
        if (!hit) return;
        const n = Number(hit.dataset.n);
        selected = selected === n ? -1 : n;
        svgEl.classList.toggle("has-selection", selected >= 0);
        svgEl.querySelectorAll(".chart-pt").forEach(g => g.classList.toggle("selected", Number(g.dataset.n) === selected));
        caption.innerHTML = selected < 0 ? summary() : detail(points[selected]);
        fitCaption(caption);
    });

    if (animate) svgEl.querySelectorAll(".chart-pt").forEach((g, k) =>
        g.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "none" }], { duration: 300 * NAV_SPEED, delay: k * 14 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }));
}

/* Paso "bonito" para la cuadrícula: 1, 2 o 5 × 10ⁿ */
function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const p = 10 ** Math.floor(Math.log10(raw));
    const f = raw / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function popIn(elements) {
    [...elements].forEach((el, i) => {
        if (el.classList.contains("blank")) return;
        el.animate(
            [{ opacity: 0, transform: "scale(0.7) translateY(6px)" }, { transform: "none" }],
            { duration: 240 * NAV_SPEED, delay: Math.min(i, 40) * 8 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
        );
    });
}

/* Ventana con todos los meses (del primero con datos hasta el actual) para saltar a uno anterior */
function openMonthPicker() {
    const now = new Date();
    let firstYear = now.getFullYear();

    const note = key => { const y = parseInt(key.slice(0, 4), 10); if (y > 1990 && y < firstYear) firstYear = y; };
    Object.values(state.logs).forEach(byDate => Object.keys(byDate).forEach(note));
    Object.keys((state.food && state.food.log) || {}).forEach(note);

    const names = [];
    for (let m = 0; m < 12; m++) {
        const n = new Date(2000, m, 1).toLocaleDateString("es-ES", { month: "long" });
        names.push(n.charAt(0).toUpperCase() + n.slice(1));
    }

    const groups = [];
    for (let y = now.getFullYear(); y >= firstYear; y--) {
        const lastMonth = y === now.getFullYear() ? now.getMonth() : 11;
        const items = [];
        for (let m = lastMonth; m >= 0; m--) {
            const offset = (y - now.getFullYear()) * 12 + (m - now.getMonth());
            items.push({ label: names[m], sub: offset === historyOffset ? "viendo" : (offset === 0 ? "actual" : ""), value: offset });
        }
        groups.push({ title: String(y), items });
    }

    openPicker({
        title: `Calendario completo · ${HISTORY_KIND[historyMode]}`,
        groups,
        onPick: offset => { historyOffset = offset; renderHistory(); }
    });
}

/* Tocar un día: abre su entreno si ya existe, o el selector de días de la rutina */
/* Estado del día en el calendario: la rutina activa y el entreno extraordinario juntos (gana el peor) */
function workoutDayStatus(key) {
    const rank = { red: 3, gold: 2, green: 1 };
    let best = "empty";
    [findRoutine(state.activeRoutineId), findRoutine(EXTRA_ROUTINE_ID)].forEach(r => {
        if (!r) return;
        const st = dayStatus(r, key);
        if ((rank[st] || 0) > (rank[best] || 0)) best = st;
    });
    return best;
}

function openHistoryDay(key) {
    setViewDate(key);

    const entry = state.logs[state.activeRoutineId]?.[key];
    const routine = findRoutine(state.activeRoutineId);
    const extra = extraDayFor(key);

    if (entry && routine && findDay(routine, entry.dayId)) {
        activeWorkout = { routineId: routine.id, dayId: entry.dayId };
        workoutPage = 0;
        showSection("workout");
    } else if (extra && state.logs[EXTRA_ROUTINE_ID]?.[key]) {
        activeWorkout = { routineId: EXTRA_ROUTINE_ID, dayId: extra.id };
        workoutPage = 0;
        showSection("workout");
    } else {
        showSection("week");
    }
}
