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
            cell.onclick = () => navFade(() => { selectedDate = key === dateKey() ? null : key; showSection("week"); });
        } else {
            cell.onclick = () => navFade(() => { foodDate = key === dateKey() ? null : key; showSection("food"); });
        }

        grid.appendChild(cell);
    }

    if (animate) popIn(grid.children);
}

/* Aparición del calendario al cambiar de uno a otro: cada elemento surge un poco más pequeño y transparente */
/* Calendario <-> gráfica: el contenido se desvanece y aparece el otro */
async function fadeHistoryView(next) {
    const parts = ["historyTitle", "historyGrid", "historyChart"].map(id => document.getElementById(id));
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
            out.push({ label: String(d.getDate()), title: d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }), keys: [dateKey(d)] });
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
            buckets, points, H: 375, goal, animate, aria: "Calorías",
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
            buckets, points, groups, H: 375, animate, aria: "Peso levantado",
            styleOf: group => { const k = Math.max(0, groups.findIndex(g => g.group === group)); return { color: colors[k], shape: k }; },
            summary: () => `Total <b>${fmt(total)} kg</b> levantados${perDay ? "" : " · puntos = promedio por sesión"}`,
            detail: p => `${p.name} · ${buckets[p.i].title} · <b>${fmt(p.value)} kg</b>${p.n > 1 ? ` (promedio de ${p.n} sesiones)` : ""}`,
            empty: "Aún no hay entrenos registrados en este periodo."
        });
        return;
    }

    /* Deportes: un panel por distancia (km) y otro por tiempo (min); cada deporte con su color y forma */
    const groups = [];
    const byUnit = { km: [], min: [] };
    buckets.forEach((b, i) => {
        const sums = new Map();
        b.keys.forEach(k => (state.sports[k] || []).forEach(sp => {
            const group = `${sp.u}/${normalizeText(sp.n)}`;
            const g = sums.get(group) || { name: sp.n, u: sp.u, total: 0, n: 0 };
            g.total += sp.v; g.n += 1;
            sums.set(group, g);
        }));
        sums.forEach((g, group) => {
            if (!groups.some(x => x.group === group)) groups.push({ group, name: g.name });
            byUnit[g.u].push({ i, value: g.total, group, name: g.name, n: g.n });
        });
    });
    if (!groups.length) {
        dotPanel(box, { buckets, points: [], empty: "Aún no hay deportes registrados en este periodo." });
        return;
    }
    const colors = glowVariants(groups.length);
    const styleOf = group => { const k = Math.max(0, groups.findIndex(g => g.group === group)); return { color: colors[k], shape: k }; };
    const both = byUnit.km.length && byUnit.min.length;
    [["km", "Distancia", "km"], ["min", "Tiempo", "min"]].forEach(([u, title, unit]) => {
        const points = byUnit[u];
        if (!points.length) return;
        const used = groups.filter(g => points.some(p => p.group === g.group));
        const total = points.reduce((a, p) => a + p.value, 0);
        const wrap = document.createElement("div");
        wrap.className = "chart-panel";
        box.appendChild(wrap);
        dotPanel(wrap, {
            buckets, points, groups: used, H: both ? 128 : 340, animate, aria: `${title} en deportes`, heading: `${title} (${unit})`,
            styleOf,
            summary: () => `Total <b>${fmtNum(total, 1)} ${unit}</b>`,
            detail: p => `${p.name} · ${buckets[p.i].title} · <b>${fmtNum(p.value, 1)} ${unit}</b>${p.n > 1 ? ` (${p.n} veces)` : ""}`
        });
    });
}

/* Un panel de puntos: resumen arriba, leyenda (si hay grupos), una sola escala, halo del color de cada punto,
   línea fina que une los puntos de un mismo grupo y detalle al tocar un punto */
function dotPanel(box, { buckets, points, groups = [], H = 375, goal = null, animate, aria = "", heading, styleOf, summary, detail, empty }) {
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
    if (goal) svg += `<line class="chart-goal" x1="${m.l}" x2="${W - m.r}" y1="${y(goal)}" y2="${y(goal)}"/><text class="chart-goal-label" x="${W - m.r}" y="${y(goal) - 5}" text-anchor="end">Meta</text>`;

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
        title: "Calendario completo",
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
    selectedDate = (key === dateKey()) ? null : key;

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
