"use strict";

/* =====================================================================
   Historial de tests · gráfica (propuesta B): peso, grasa, masa magra, mantenimiento y entrenos por mes.
   Se cambia de gráfica deslizando a izquierda o derecha (o con las flechas ‹ ›), como los deslizables de la app.
   ===================================================================== */

/* Días entrenados por mes (entreno con alguna serie marcada o deporte registrado), del mes del primer test a hoy */
function trainingDaysByMonth(fromKey) {
    const days = new Set();
    for (const rid in state.logs || {}) for (const key in state.logs[rid]) {
        const entry = state.logs[rid][key];
        if (Object.values(entry.exercises || {}).some(l => (l.reps || []).some(r => r > 0))) days.add(key);
    }
    for (const key in state.sports || {}) if ((state.sports[key] || []).length) days.add(key);
    const now = new Date();
    let start = fromKey ? parseKey(fromKey) : new Date(now.getFullYear(), now.getMonth() - 4, 1);
    start = new Date(start.getFullYear(), start.getMonth(), 1);
    const months = [];
    for (let d = new Date(start); d <= now && months.length < 12; d.setMonth(d.getMonth() + 1)) {
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months.push({ ym, label: d.toLocaleDateString("es-ES", { month: "short" }).replace(".", ""), n: [...days].filter(k => k.startsWith(ym)).length });
    }
    return months.slice(-12);
}

function testChart(n) {
    const tests = n.tests;
    const goal = n.goal;
    const calc = tests.map(t => ({ t, c: calcTDEE(t.profile) }));
    const firstDated = tests.find(t => t.d);
    const metrics = [
        { k: "w", name: "Peso", unit: "kg", dec: 1, val: x => x.t.profile.weight, good: goal === "cut" ? -1 : goal === "bulk" ? 1 : 0,
          ref: calc.length ? calc.at(-1).c.ideal : null, refName: "Peso ideal" },
        { k: "bf", name: "Grasa corporal", unit: "%", dec: 1, val: x => x.c.bf, good: -1 },
        { k: "lean", name: "Masa magra", unit: "kg", dec: 1, val: x => x.c.lean, good: 1 },
        { k: "m", name: "Mantenimiento", unit: "kcal", dec: 0, val: x => x.c.tdee, good: 0 },
        { k: "train", name: "Entrenos por mes", unit: "días", dec: 0, bars: true }
    ];
    let idx = 0;

    const card = el("div", "tchart");
    const head = el("div", "tchart-head");
    const prev = el("button", "tchart-arrow", "‹");
    const next = el("button", "tchart-arrow", "›");
    prev.type = next.type = "button";
    prev.setAttribute("aria-label", "Gráfica anterior");
    next.setAttribute("aria-label", "Gráfica siguiente");
    const title = el("div", "tchart-title");
    head.append(prev, title, next);
    const body = el("div", "tchart-body");
    card.append(head, body);

    const f = (v, d) => fmtNum(v, d);
    const svgLine = (m) => {
        const pts = calc.map(m.val);
        const ref = m.ref || null;
        let lo = Math.min(...pts, ...(ref ? [ref] : [])), hi = Math.max(...pts, ...(ref ? [ref] : []));
        const pad = (hi - lo) * 0.15 || Math.max(1, hi * 0.02);
        lo -= pad; hi += pad;
        const W = 330, H = 170, L = 40;
        const y = v => 10 + (1 - (v - lo) / (hi - lo)) * (H - 20);
        const x = i => pts.length === 1 ? (L + W) / 2 : L + 8 + i * ((W - L - 16) / (pts.length - 1));
        let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="${esc(m.name)}: ${pts.map(v => f(v, m.dec)).join(", ")} ${m.unit}">`;
        for (let i = 0; i < 4; i++) {
            const v = hi - (hi - lo) * i / 3;
            s += `<line x1="${L}" y1="${y(v)}" x2="${W - 4}" y2="${y(v)}" class="tg-grid"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end" class="tg-axis">${f(v, m.dec)}</text>`;
        }
        if (ref) s += `<line x1="${L}" y1="${y(ref)}" x2="${W - 4}" y2="${y(ref)}" class="tg-ref"/><text x="${W - 6}" y="${y(ref) - 5}" text-anchor="end" class="tg-ref-t">${esc(m.refName)} ${f(ref, 1)} ${m.unit}</text>`;
        s += `<polyline points="${pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" class="tg-line"/>`;
        pts.forEach((v, i) => { s += `<circle cx="${x(i)}" cy="${y(v)}" r="${i === pts.length - 1 ? 6 : 4.5}" class="tg-dot${i === pts.length - 1 ? " last" : ""}"/>`; });
        return s + "</svg>";
    };
    const svgBars = months => {
        const W = 330, H = 170, L = 26, max = Math.max(4, ...months.map(m => m.n));
        const bw = (W - L - 8) / months.length;
        let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" role="img" aria-label="Días entrenados por mes: ${months.map(m => `${m.label} ${m.n}`).join(", ")}">`;
        [0, 0.5, 1].forEach(q => { const yy = 10 + (1 - q) * (H - 34); s += `<line x1="${L}" y1="${yy}" x2="${W - 4}" y2="${yy}" class="tg-grid"/><text x="${L - 5}" y="${yy + 3}" text-anchor="end" class="tg-axis">${Math.round(max * q)}</text>`; });
        months.forEach((m, i) => {
            const h = (H - 34) * m.n / max, x0 = L + 4 + i * bw;
            s += `<rect x="${x0 + bw * 0.18}" y="${10 + (H - 34) - h}" width="${bw * 0.64}" height="${Math.max(h, 1)}" rx="4" class="tg-bar${i === months.length - 1 ? " last" : ""}"/>`;
            if (m.n) s += `<text x="${x0 + bw / 2}" y="${10 + (H - 34) - h - 4}" text-anchor="middle" class="tg-val">${m.n}</text>`;
            s += `<text x="${x0 + bw / 2}" y="${H - 8}" text-anchor="middle" class="tg-axis">${esc(m.label)}</text>`;
        });
        return s + "</svg>";
    };

    const paint = () => {
        const m = metrics[idx];
        title.innerHTML = `<b>${esc(m.name)}</b><span class="tchart-dots">${metrics.map((_, i) => `<i class="${i === idx ? "on" : ""}"></i>`).join("")}</span>`;
        if (m.bars) {
            const months = trainingDaysByMonth(firstDated && firstDated.d);
            const total = months.reduce((s, x) => s + x.n, 0);
            body.innerHTML = `<div class="tchart-val"><b>${months.at(-1).n} días</b><span>este mes · ${total} desde ${firstDated ? "el primer test" : esc(months[0].label)}</span></div>${svgBars(months)}`;
            return;
        }
        const pts = calc.map(m.val);
        const last = pts.at(-1), d = last - pts[0];
        const cls = pts.length < 2 || Math.abs(d) < 1e-9 || !m.good ? "" : (d * m.good > 0 ? "good" : "bad");
        const delta = pts.length < 2 ? "Haz otro test para ver la tendencia" : `${d > 0 ? "+" : d < 0 ? "−" : ""}${f(Math.abs(d), m.dec)} ${m.unit} desde el primer test`;
        body.innerHTML = `<div class="tchart-val"><b>${f(last, m.dec)} ${m.unit}</b><span class="${cls}">${delta}</span></div>${svgLine(m)}
            <div class="tchart-x">${calc.map(x => `<span>${x.t.d ? esc(parseKey(x.t.d).toLocaleDateString("es-ES", { day: "numeric", month: "short" }).replace(".", "")) : "antes"}</span>`).join("")}</div>`;
    };
    const go = dir => {
        idx = (idx + dir + metrics.length) % metrics.length;
        paint();
        body.animate([{ opacity: 0, transform: `translateX(${dir * 28}px)` }, { opacity: 1, transform: "none" }], { duration: 220 * NAV_SPEED, easing: "cubic-bezier(.2,.8,.2,1)" });
    };
    prev.onclick = () => go(-1);
    next.onclick = () => go(1);

    /* deslizar a izquierda o derecha (sin quitarle el desplazamiento vertical a la ventana) */
    let sx = null, sy = 0;
    card.addEventListener("pointerdown", e => { if (!e.target.closest("button")) { sx = e.clientX; sy = e.clientY; } });
    card.addEventListener("pointerup", e => {
        if (sx === null) return;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        sx = null;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) go(dx < 0 ? 1 : -1);
    });
    card.addEventListener("pointercancel", () => { sx = null; });

    paint();
    return card;
}
