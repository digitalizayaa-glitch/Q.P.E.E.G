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

test("TDEE: peso con el máximo muscular a 10, 13 y 16 % de grasa (mujeres 18, 21, 24)", () => {
    const m = call("calcTDEE", { sex: "m", age: 30, height: 180, weight: 80, activity: 1.55, bf: null });
    assert.deepEqual(m.weightsAtMax.map(x => x.bf), [10, 13, 16]);
    m.weightsAtMax.forEach(x => assert.ok(Math.abs(x.weight - m.leanMax / (1 - x.bf / 100)) < 1e-9));
    assert.ok(m.weightsAtMax[0].weight < m.weightsAtMax[1].weight && m.weightsAtMax[1].weight < m.weightsAtMax[2].weight);
    const f = call("calcTDEE", { sex: "f", age: 30, height: 165, weight: 60, activity: 1.2, bf: null });
    assert.deepEqual(f.weightsAtMax.map(x => x.bf), [18, 21, 24]);
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
        const macroKcal = 4 * plan.macros.c + 4 * plan.macros.p + 9 * plan.macros.f;
        assert.ok(Math.abs(macroKcal - plan.kcal) / plan.kcal < 0.05, "los gramos de macros suman las calorías de la meta");
    }
});

test("macros: la dieta baja en carbos da menos carbohidratos y más proteína", () => {
    const profile = { sex: "m", age: 30, height: 180, weight: 80, activity: 1.55, bf: null };
    app(`state.nutrition = ${JSON.stringify({ profile, goal: "maintain", diet: "mod" })}`);
    const mod = ev("nutritionPlan().macros");
    app(`state.nutrition.diet = "low"`);
    const low = ev("nutritionPlan().macros");
    assert.ok(low.c < mod.c && low.p > mod.p && low.f > mod.f);
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

test("figuras: los ejercicios de la rutina de 5 días tienen su dibujo", () => {
    const expected = {"Jalón agarre cerrado": "pulldown", "Remo agarre neutro": "cablerow", "Pullover acostado": "dbpullover", "Press militar máq.": "ohpseated", "Curl polea baja": "cablecurl", "Bíceps martillo": "curl", "Face pull": "facepull", "Sentadilla goblet": "goblet", "Desplantes caminando": "lunge", "Prensa vertical": "legpress", "Extensión rodillas": "legext", "Femoral acostado": "legcurl", "Aducción": "hipadd", "Pantorrillas prensa": "calfpress", "Press plano unilat.": "chestmachine", "Press inclin. manc.": "incline", "Extensión tríceps V": "pushdown", "Copa con mancuerna": "overhead", "Laterales mancuernas": "lateral", "Remo alto posterior": "facepull", "Hip thrust máquina": "hipthrust", "Desplante búlgaro": "bulgarian", "Sentadilla sumo": "sumo", "Patada glúteo polea": "cablekick", "Femoral sentado": "seatedlegcurl", "Abducción": "hipabd", "Pantorrillas máquina": "calf", "Jalón agarre medio": "pulldown", "Remo agarre cerrado": "cablerow", "Pullover en polea": "pullover", "Remo con barra Z": "uprightrow", "Frontales mancuernas": "frontraise", "Elevación laterales": "lateral", "Posterior en máquina": "revpecdeck"};
    for (const [name, pose] of Object.entries(expected)) {
        assert.ok(name.length <= 20, `${name}: máx. 20 caracteres`);
        assert.equal(call("figureMoveFor", name), pose, name);
    }
    /* los de siempre no cambian */
    for (const [name, pose] of [["Sentadilla búlgara", "bulgarian"], ["Elev. laterales", "lateral"], ["Abductores", "abduct"], ["Pullover polea", "pullover"], ["Press banca", "bench"], ["Sentadilla frontal", "frontsquat"], ["Curl femoral", "legcurl"], ["Gemelos", "calf"], ["Prensa", "legpress"]])
        assert.equal(call("figureMoveFor", name), pose, name);
    const svg = Object.keys(ev("FIGURE_POSES")).map(k => call("exerciseFigure", "x", k)).join("");
    assert.ok(!/NaN|undefined/.test(svg));
    for (const list of Object.values(ev("EXERCISE_CATALOG"))) for (const n of list) assert.ok(n.length <= 20, n);
    const catalog = Object.values(ev("EXERCISE_CATALOG")).flat();
    for (const name of Object.keys(expected)) assert.ok(catalog.includes(name), `${name} está en el catálogo`);
    assert.equal(new Set(catalog).size, catalog.length, "sin repetidos");
});

test("figuras: la imagen elegida en la galería manda sobre el nombre", () => {
    const eq = [...ev("Object.keys(EQUIPMENT_FIGURES)")];
    assert.deepEqual(eq, ["eq-mancuerna", "eq-barra", "eq-dominadas"]);
    for (const k of eq) {
        const svg = call("exerciseFigure", "Press banca", k);
        assert.match(svg, /^<svg[\s\S]*<\/svg>$/, k);
        assert.ok(!/NaN|undefined/.test(svg), k);
    }
    const norm = s => s.replace(/fg\d+/g, "fg");
    const pose = call("figureMoveFor", "Sentadilla");
    assert.equal(norm(call("exerciseFigure", "Press banca", pose)), norm(call("exerciseFigure", "Sentadilla")));
    assert.equal(norm(call("exerciseFigure", "Press banca", "no-existe")), norm(call("exerciseFigure", "Press banca")), "una imagen desconocida usa la automática");
});

test("ejercicio: la imagen elegida se guarda y se limpia si no es válida", () => {
    const mk = fig => call("stateFrom", { routines: [{ id: "r", name: "R", days: [{ id: "d", name: "D", exercises: [{ id: "e", name: "X", series: [], fig }] }] }] }).routines[0].days[0].exercises[0].fig;
    assert.equal(mk("eq-barra"), "eq-barra");
    assert.equal(mk("<b>x</b>"), undefined);
    assert.equal(mk(42), undefined);
});

test("deportes: una salida normal da 100 con 1, 2 o 3 datos, y escala con el mantenimiento", () => {
    app("state.nutrition = null");
    const ref = ev("sportReference('bike')");
    assert.deepEqual(ref, { min: 90, km: 35, up: 400 }, "sin plan: referencia de 2400 kcal");
    const load = sp => Math.round(call("sportLoad", sp) * 1000) / 1000;
    for (const sp of [{ k: "bike", min: 90 }, { k: "bike", km: 35 }, { k: "bike", up: 400 }, { k: "bike", min: 90, km: 35 }, { k: "bike", km: 35, up: 400 }, { k: "bike", min: 90, km: 35, up: 400 }])
        assert.equal(load(sp), 100, JSON.stringify(sp));
    assert.equal(load({ k: "bike", min: 135, km: 56, up: 600 }), Math.round((150 + 160 + 150) / 3 * 1000) / 1000, "promedio de los puntajes");
    assert.equal(load({ k: "volley", min: 60, up: 500 }), 100, "un dato que no aplica al deporte no cuenta");
    /* más mantenimiento → salida normal más larga */
    app("state.nutrition = { profile: { sex: 'm', age: 30, height: 180, weight: 80, activity: 1.55, bf: null }, goal: 'bulk', diet: 'high' }");
    const f = ev("calcTDEE(state.nutrition.profile).tdee") / 2400;
    const ref2 = ev("sportReference('run')");
    assert.ok(Math.abs(ref2.min - 45 * f) < 1e-9 && Math.abs(ref2.km - 7 * f) < 1e-9);
    assert.equal(load({ k: "run", min: 45 * f, km: 7 * f }), 100, "su salida normal sigue dando 100");
    assert.ok(load({ k: "run", min: 45, km: 7 }) < 100, "lo normal de 2400 kcal es menos para alguien con más mantenimiento");
    app("state.nutrition = null");
});

test("deportes: los registros viejos { u, v } se convierten y guardan u/v para teléfonos sin actualizar", () => {
    const s = call("stateFrom", { sports: { "2026-11-01": [
        { id: "a", k: "run", n: "Correr", u: "km", v: 5 },
        { id: "b", k: "bike", n: "Ciclismo", min: 90, km: 40, up: 450 },
        { id: "c", k: "bike", n: "Ciclismo", up: 300 },
        { id: "d", n: "Nada" }
    ] } }).sports["2026-11-01"];
    assert.deepEqual(s.map(x => x.id), ["a", "b", "c"]);
    assert.deepEqual([s[0].km, s[0].u, s[0].v], [5, "km", 5]);
    assert.deepEqual([s[1].min, s[1].km, s[1].up, s[1].u, s[1].v], [90, 40, 450, "km", 40]);
    assert.equal(s[2].up, 300);
    assert.equal(call("sportSummary", s[1]), "1 h 30 min · 40 km · +450 m");
});

test("versión: package.json y la app dicen lo mismo, y hay novedades de la versión actual", () => {
    const pkg = require("../../package.json");
    const { APP_VERSION, CHANGELOG } = require("../../scripts/core/version.js");
    assert.equal(pkg.version, APP_VERSION);
    const cur = CHANGELOG.find(e => e.v === APP_VERSION);
    assert.ok(cur && cur.items.length > 0);
    assert.equal(call("compareVersions", "1.10.0", "1.9.2"), 1);
    assert.equal(call("compareVersions", "1.3", "1.3.0"), 0);
});

test("comida frecuente: más de 3 veces y usada en los últimos 3 días", () => {
    const day = d => { const x = new Date(2026, 10, d, 12); return { key: app(`dateKey(new Date(${x.getTime()}))`), ts: x.getTime() }; };
    const log = {};
    const add = (d, n, g = "h") => { const { key, ts } = day(d); (log[key] ??= []).push({ id: n + d + Math.random(), n, g, p: 1, t: "1 porción", ts }); };
    for (const d of [1, 2, 3, 4]) add(d, "Arroz blanco");      /* 4 veces, la última el día 4 */
    for (const d of [2, 3, 4]) add(d, "Banano", "fr");        /* solo 3 veces */
    for (const d of [1, 2, 3, 5, 6]) add(d, "Huevo (completo)", "mg");
    add(6, "Agua", "agua"); add(6, "Agua", "agua"); add(6, "Agua", "agua"); add(6, "Agua", "agua");
    app(`state.food = { log: ${JSON.stringify(log)} }`);
    const at = d => new Date(2026, 10, d, 12).getTime();
    const names = d => ev(`frequentFoods(${at(d)}).map(f => f.item[0])`);
    assert.deepEqual(names(6), ["Huevo (completo)", "Arroz blanco"], "más usada primero; banano (3) y agua no cuentan");
    assert.deepEqual(names(8), ["Huevo (completo)"], "arroz lleva 4 días sin agregarse: desaparece");
    assert.deepEqual(names(10), [], "a los 4 días de la última vez ya no hay frecuentes");
    assert.equal(ev(`frequentFoods(${at(6)})[0].item[1]`), "1 unidad", "usa la porción del catálogo");
});

test("comida rápida: catálogo coherente (calorías ≈ macros) y pizzas por slice", () => {
    const chains = ev("FAST_FOOD");
    assert.ok(chains.length >= 8);
    for (const { chain, items } of chains) for (const [name, unit, plural, kcal, c, p, f] of items) {
        const fromMacros = 4 * c + 4 * p + 9 * f;
        /* hasta 20 %: las cadenas redondean y la fibra/alcoholes de azúcar no suman igual */
        assert.ok(Math.abs(fromMacros - kcal) / kcal < 0.2, `${chain} · ${name}: ${kcal} kcal vs ${fromMacros}`);
        if (/^Pizza /.test(name) && !/^Subway/.test(chain)) assert.equal(unit, "slice", `${chain} · ${name} va por slice`);
        assert.ok(plural && plural !== unit);
    }
});

test("catálogo: INISA sin repetidos y con su medida en tazas, cucharadas o unidades", () => {
    const all = Object.values(ev("FOOD_CATALOG")).flat().map(i => i[0]);
    const inisa = Object.values(ev("FOOD_INISA")).flat();
    assert.ok(inisa.length >= 80, "quedan los de INISA sin par");
    for (const gone of ["Huevo de gallina (INISA)", "Pan de rodaja blanco (INISA)", "Aguacate (INISA)", "Leche fluida de vaca (INISA)", "Leche condensada (INISA)"])
        assert.ok(!all.includes(gone), gone);
    for (const [name, eq] of inisa)
        assert.match(eq, /^(\d|1\/).*(taza|cda|cdta|unidad|rebanada|rodaja|pedazo|trozo|mediano|pequeñ).*\(\d+(,\d+)? (g|ml)\)$/, `${name}: ${eq}`);
    assert.equal(new Set(all).size, all.length, "nombres sin repetir");
    for (const k of Object.keys(ev("FOOD_CALIBRATION"))) assert.ok(all.includes(k), `calibración sin alimento: ${k}`);
});

test("pan cuadrado: se cuenta por rebanada (1 rebanada = 1 harina)", () => {
    const item = ev("FOOD_CATALOG.h.find(i => i[0] === 'Pan cuadrado blanco Bimbo')");
    assert.deepEqual(item, ["Pan cuadrado blanco Bimbo", "1 rebanada (31 g)", "rebanadas", 1]);
    assert.deepEqual(ev("FOOD_CALIBRATION['Pan cuadrado blanco Bimbo'].pt"), { h: 1 });
});

test("supermercado: galletas y snacks pedidos están en el catálogo", () => {
    const names = [...ev("FAST_FOOD.filter(c => c.super).flatMap(c => c.items.map(i => i[0]))")].join(" | ");
    for (const want of ["Chiky", "Yipy", "Oreo", "Sponch", "Ranchitas", "Picaritas", "Papiolas", "Pringles"]) assert.match(names, new RegExp(want), want);
    assert.ok(ev("FAST_FOOD.filter(c => !c.super).length") >= 8, "la comida rápida sigue aparte");
});

test("comida rápida: cada pizzería tiene pizza de jamón y queso", () => {
    const pizzerias = ev("FAST_FOOD").filter(c => c.items.some(i => /^Pizza /.test(i[0]) && i[1] === "slice"));
    assert.ok(pizzerias.length >= 5);
    for (const { chain, items } of pizzerias) {
        assert.ok(items.some(i => /jamón y queso/i.test(i[0])), `${chain} no tiene pizza de jamón y queso`);
    }
    const keys = ev("[...FAST_FOOD_BY_KEY.keys()]");
    assert.equal(new Set(keys).size, keys.length, "sin productos repetidos");
});

test("totales: comida rápida suma calorías y macros; volumen sucio solo calorías", () => {
    const t = ev(`foodTotals([
        { g: "rapida", p: 2, k: 300, mc: 34, mp: 12, mf: 13 },
        { g: "libre", p: 1, k: 900 },
        { g: "h", p: 1 }
    ])`);
    const h = ev("groupKcal(FOOD_GROUP.h)");
    assert.equal(Math.round(t.kcal), Math.round(600 + 900 + h));
    assert.equal(Math.round(t.p), Math.round(24 + ev("FOOD_GROUP.h.p")));
    assert.equal(t.portions.h, 1 + 2 * call("fastPortions", 34, 12, 13).h, "la comida rápida reparte porciones en los grupos");
    assert.equal(t.portions.rapida, undefined);
    assert.equal(t.portions.libre, undefined, "el volumen sucio no suma porciones");
});

test("stateFrom conserva y limpia las calorías propias de las entradas", () => {
    const s = call("stateFrom", { food: { log: { "2026-11-08": [
        { id: "a", n: "Pizza Hut · Pizza", g: "rapida", p: 2, k: 220, mc: 25, mp: 9, mf: 9, t: "2 slices" },
        { id: "b", n: "Volumen sucio", g: "libre", p: 1, k: -50, t: "x" },
        { id: "c", n: "Raro", g: "rapida", p: 1, k: "mucho", t: "x" }
    ] } } });
    const [a, b, c] = s.food.log["2026-11-08"];
    assert.equal(a.k, 220); assert.equal(a.mc, 25);
    assert.equal(b.k, 0, "no hay calorías negativas");
    assert.equal(c.k, 0);
});

test("frecuentes incluye comida rápida usada más de 3 veces", () => {
    const log = {};
    const key = ev(`FAST_FOOD[1].chain + " · " + FAST_FOOD[1].items[0][0]`);
    for (const d of [5, 6, 7, 8]) {
        const ts = new Date(2026, 10, d, 20).getTime();
        log[app(`dateKey(new Date(${ts}))`)] = [{ id: "x" + d, n: key, g: "rapida", p: 2, k: 210, ts }];
    }
    app(`state.food = { log: ${JSON.stringify(log)} }`);
    const out = ev(`frequentFoods(${new Date(2026, 10, 8, 21).getTime()})`);
    assert.deepEqual(out, [{ g: "rapida", fk: key }]);
});

test("comida rápida → porciones calibradas: cada producto cuadra con sus calorías", () => {
    const G = ev("Object.fromEntries(FOOD_GROUPS.map(g => [g.k, groupKcal(g)]))");
    const errs = [];
    for (const { chain, items } of ev("FAST_FOOD")) for (const [name, , , kcal, , , , pt] of items) {
        assert.ok(pt && Object.keys(pt).length, `${chain} · ${name} sin calibrar (node tools/calibrar-porciones.mjs)`);
        for (const v of Object.values(pt)) assert.equal(v * 2, Math.round(v * 2), `${name}: porciones de 0,5 en 0,5`);
        const fromPortions = Object.entries(pt).reduce((s, [k, v]) => s + v * G[k], 0);
        const diff = Math.abs(fromPortions - kcal);
        if (kcal >= 60) errs.push(diff / kcal);   /* una galleta suelta (< 60 kcal) está por debajo de la resolución de media porción */
        /* el límite es media porción del grupo más pequeño (~20 kcal) o el 6 %, lo que sea mayor */
        assert.ok(diff <= Math.max(0.06 * kcal, 21), `${chain} · ${name}: ${kcal} kcal vs porciones ${fromPortions}`);
    }
    assert.ok(errs.reduce((a, b) => a + b, 0) / errs.length < 0.02, "error medio menor al 2 %");
    assert.deepEqual(ev(`FAST_FOOD_BY_KEY.get("Papa John's · Pizza de queso grande (14\\") original").item[7]`), { h: 2.5, mg: 0.5, g: 1 });
});

test("catálogo normal calibrado: existe en el catálogo y sus porciones cuadran", () => {
    const G = ev("Object.fromEntries(FOOD_GROUPS.map(g => [g.k, groupKcal(g)]))");
    const names = ev("Object.values(FOOD_CATALOG).flat().map(i => i[0])");
    for (const [name, cal] of Object.entries(ev("FOOD_CALIBRATION"))) {
        assert.ok(names.includes(name), `${name} no está en el catálogo`);
        assert.ok(Math.abs(4 * cal.c + 4 * cal.p + 9 * cal.f - cal.k) / cal.k < 0.15, `${name}: kcal ≈ macros (la fibra no aporta igual)`);
        const fromPortions = Object.entries(cal.pt).reduce((s, [k, v]) => s + v * G[k], 0);
        assert.ok(Math.abs(fromPortions - cal.k) <= Math.max(0.15 * cal.k, 21), `${name}: ${cal.k} vs ${fromPortions}`);
    }
});

test("flechas de 1 en 1; las medias se escriben y se respetan", () => {
    assert.equal(call("stepByOne", 1, 1), 2);
    assert.equal(call("stepByOne", 1, -1), 1, "no baja de 1 con las flechas");
    assert.equal(call("stepByOne", 2.5, -1), 1.5);
    assert.equal(call("stepByOne", 1.5, -1), 0.5);
    assert.equal(call("stepByOne", 0.5, 1), 1.5);
    assert.equal(call("stepByOne", 0.5, -1), 0.5);
    assert.equal(call("stepByOne", 1, -1, true), 0, "al corregir algo ya agregado se puede bajar a 0");
    assert.equal(call("stepByOne", 0, 1, true), 1);
});

test("alimento calibrado registrado: calorías reales y porciones en varios grupos", () => {
    const t = ev(`foodTotals([{ g: "mg", n: "Nuggets de pollo Pipasa", p: 2, k: 100, mc: 5.6, mp: 5.6, mf: 6, pt: { h: 0.5, mg: 0.5, g: 0.5 } }])`);
    assert.equal(Math.round(t.kcal), 200);
    assert.deepEqual(t.portions, { h: 1, mg: 1, g: 1 });
});

test("las porciones de la comida rápida suman en los grupos (también lo ya registrado)", () => {
    const t = ev(`foodTotals([
        { g: "rapida", n: "Papa John's · Pizza de queso grande (14\\") original", p: 2, k: 290, mc: 38, mp: 11, mf: 10 },
        { g: "libre", p: 1, k: 500 },
        { g: "h", p: 0.5 }
    ])`);
    assert.deepEqual(t.portions, { h: 5.5, mg: 1, g: 2 });
});

test("el texto de equivalencias nombra todos los grupos (y todo lo calibrado se puede mostrar)", () => {
    for (const k of ev("FOOD_GROUPS.map(g => g.k)")) assert.ok(!call("portionsText", { [k]: 1 }).includes("undefined"), k);
    for (const [name, cal] of Object.entries(ev("FOOD_CALIBRATION"))) {
        assert.ok(!call("portionsText", cal.pt).includes("undefined"), name);
    }
});
