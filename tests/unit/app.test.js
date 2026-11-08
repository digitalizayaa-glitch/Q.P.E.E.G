/* Pruebas de la lógica pura de la app.  Ejecutar:  node --test tests/unit  */
const test = require("node:test");
const assert = require("node:assert/strict");
const QStore = require("../../scripts/core/almacenamiento.js");
const { loadApp } = require("./harness.js");

const app = loadApp();
/* Los objetos de la app vienen de otro "realm": se copian a JSON para compararlos con deepEqual */
const ev = expr => { const v = app(`JSON.stringify(${expr})`); return v === undefined ? undefined : JSON.parse(v); };
const call = (fn, ...args) => ev(`(${fn})(...${JSON.stringify(args)})`);

test("migración v1 → v2 añade metadatos sin tocar los datos", () => {
    const v1 = { routines: [{ id: "r1", name: "A", days: [] }], logs: {} };
    const out = QStore.migrate(v1);
    assert.equal(out.meta.schema, 2);
    assert.deepEqual(out.routines, v1.routines);
    assert.equal(v1.meta, undefined, "no modifica el objeto original");
});

test("datos de una versión más nueva no se rebajan", () => {
    const out = QStore.migrate({ meta: { schema: 9 }, routines: [] });
    assert.equal(out.meta.schema, 9);
});

test("cada migración registrada tiene número consecutivo hasta la versión actual", () => {
    const keys = Object.keys(QStore.MIGRATIONS).map(Number).sort((a, b) => a - b);
    assert.deepEqual(keys, Array.from({ length: QStore.SCHEMA_VERSION - 1 }, (_, i) => i + 2));
});

test("stateFrom repara datos dañados sin romper", () => {
    const s = call("stateFrom", {
        photo: "javascript:alert(1)",
        avatar: "desconocido",
        achievements: ["Correr 5 km", { t: "  " }, 42, { t: "Press 100", done: 1 }, "a", "b", "c", "d", "e"],
        routines: [{ id: "r1", name: "Rutina con un nombre larguísimo de más", days: [{ id: "d1", name: "Día", exercises: [
            { id: "e1", name: "Press", kg: -5, unit: "oz", series: [{ target: 8 }, { target: 12 }] }
        ] }] }, "basura", { sinId: true }],
        activeRoutineId: "no-existe",
        logs: { r1: { "2026-11-01": { dayId: "d1", exercises: { e1: { kg: 50, reps: [8, "x", -1], extra: 99 } } }, "fecha-mala": {} } },
        sports: { "2026-11-01": [{ n: "Correr", u: "km", v: 5 }, { n: "Mal", u: "millas", v: 1 }] }
    });
    assert.equal(s.photo, null);
    assert.equal(s.avatar, null);
    assert.equal(s.achievements.length, ev("ACH_MAX_TOTAL"));
    assert.deepEqual(s.achievements[0], { t: "Correr 5 km", done: false });
    assert.deepEqual(s.achievements[1], { t: "Press 100", done: true });
    assert.equal(s.routines.length, 1);
    assert.equal(s.routines[0].name.length, 24);
    const ex = s.routines[0].days[0].exercises[0];
    assert.equal(ex.kg, 0);
    assert.equal(ex.unit, "kg");
    assert.deepEqual(ex.series, [{ min: 8, max: 12 }, { min: 8, max: 12 }], "metas viejas → rango de la menor a la mayor");
    assert.equal(s.activeRoutineId, null);
    assert.deepEqual(Object.keys(s.logs.r1), ["2026-11-01"]);
    assert.deepEqual(s.logs.r1["2026-11-01"].exercises.e1.reps, [8, 0, 0]);
    assert.equal(s.logs.r1["2026-11-01"].exercises.e1.extra, ev("MAX_EXTRA_SERIES"));
    assert.ok(s.logs.r1["2026-11-01"].plan, "se congela el plan del día");
    assert.equal(s.sports["2026-11-01"].length, 1);
    assert.equal(s.meta.schema, 2);
    assert.ok(s.meta.device);
});

test("un ejercicio no pasa de MAX_SERIES_PER_EXERCISE series", () => {
    const many = Array.from({ length: 20 }, () => ({ min: 8, max: 10 }));
    const s = call("stateFrom", { routines: [{ id: "r", name: "R", days: [{ id: "d", name: "D", exercises: [{ id: "e", name: "X", series: many }] }] }] });
    assert.equal(s.routines[0].days[0].exercises[0].series.length, ev("MAX_SERIES_PER_EXERCISE"));
});

test("respaldo: exportar e importar deja los datos iguales", () => {
    app(`state = stateFrom({ routines: [{ id: "r1", name: "Push", days: [{ id: "d1", name: "Pecho", exercises: [{ id: "e1", name: "Press banca", kg: 60, unit: "kg", series: [{ min: 8, max: 12 }] }] }] }],
        logs: { r1: { "2026-11-02": { dayId: "d1", exercises: { e1: { kg: 60, reps: [10], extra: 0 } } } } } })`);
    const before = ev("state");
    const after = call("stateFrom", before);
    assert.deepEqual(after, before);
});

test("TDEE: fórmula de Mifflin-St Jeor sin % de grasa", () => {
    const t = call("calcTDEE", { sex: "m", age: 30, height: 180, weight: 80, activity: 1.55, bf: null });
    assert.equal(Math.round(t.bmr), 1780);
    assert.equal(Math.round(t.tdee), 2759);
    const f = call("calcTDEE", { sex: "f", age: 30, height: 165, weight: 60, activity: 1.2, bf: null });
    assert.equal(Math.round(f.bmr), Math.round(10 * 60 + 6.25 * 165 - 150 - 161));
});

test("TDEE: fórmula de Katch-McArdle con % de grasa", () => {
    const t = call("calcTDEE", { sex: "m", age: 30, height: 180, weight: 80, activity: 1.55, bf: 15 });
    assert.equal(Math.round(t.lean), 68);
    assert.equal(Math.round(t.bmr), Math.round(370 + 21.6 * 68));
});

test("plan de nutrición: objetivo aplica el factor y redondea a 10 kcal", () => {
    const profile = { sex: "m", age: 30, height: 180, weight: 80, activity: 1.55, bf: null };
    for (const [goal, factor] of [["maintain", 1], ["bulk", 1.1], ["cut", 0.8]]) {
        app(`state.nutrition = ${JSON.stringify({ profile, goal, diet: "mod" })}`);
        const plan = ev("nutritionPlan()");
        assert.equal(plan.kcal % 10, 0);
        assert.ok(Math.abs(plan.kcal - 2759 * factor) <= 5, goal);
        assert.equal(plan.water, 2750);
        for (const k in plan.goals) assert.ok(plan.goals[k] >= 1);
    }
});

test("números romanos y rangos", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map(n => call("toRoman", n)), ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"]);
    assert.equal(call("fmtRange", [8, 12]), "8–12");
    assert.equal(call("fmtRange", [10, 10]), "10");
});

test("fechas: clave AAAA-MM-DD ida y vuelta", () => {
    assert.match(ev("dateKey()"), /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(ev(`dateKey(parseKey("2026-02-28"))`), "2026-02-28");
});

test("figuras: cada regla apunta a una pose que existe", () => {
    const missing = ev("FIGURE_RULES.map(r => r[1]).filter(k => !FIGURE_POSES[k])");
    assert.deepEqual([...missing], []);
    assert.equal(call("figureMoveFor", "Press banca"), "bench");
    assert.equal(call("figureMoveFor", "Ejercicio inventado"), "curl", "sin coincidencia usa la figura por defecto");
});

test("figuras: todas las poses generan un SVG", () => {
    const keys = [...ev("Object.keys(FIGURE_POSES)")];
    assert.ok(keys.length > 40);
    app("globalThis.__move = figureMoveFor");
    try {
        for (const k of keys) {
            const svg = app(`figureMoveFor = () => ${JSON.stringify(k)}; exerciseFigure("x")`);
            assert.match(svg, /^<svg[\s\S]*<\/svg>$/, k);
            assert.ok(!/NaN|undefined/.test(svg), "coordenadas inválidas en " + k);
        }
    } finally { app("figureMoveFor = globalThis.__move"); }
    assert.match(call("exerciseFigure", "Sentadilla"), /^<svg/);
});
