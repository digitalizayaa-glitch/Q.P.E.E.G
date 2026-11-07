/* =========================================================
    COMIDA: contador de calorías por porciones del plan nutricional
    Cada alimento equivale a N porciones de un grupo (harina, proteína, grasa…)
    y cada porción tiene un valor promedio. Son aproximaciones: para afinarlas
    basta con cambiar los números de FOOD_GROUPS.
    c = carbohidratos (g), p = proteína (g), f = grasa (g) por porción.
    goal = porciones al día del plan (null = sin meta).
========================================================= */

const FOOD_GROUPS = [
    { k: "h",  name: "Harinas",     c: 15, p: 3, f: 1, goal: 21,   color: "#e08a4b" },
    { k: "bg", name: "Proteína BG", c: 0,  p: 7, f: 1, goal: 10,   color: "#d9544f" },
    { k: "mg", name: "Proteína MG", c: 0,  p: 7, f: 5, goal: 2,    color: "#ef7a6a" },
    { k: "g",  name: "Grasas",      c: 0,  p: 0, f: 5, goal: 6,    color: "#f2c14e" },
    { k: "v",  name: "Vegetales",   c: 5,  p: 2, f: 0, goal: 3,    color: "#4caf6d" },
    { k: "fr", name: "Frutas",      c: 15, p: 0, f: 0, goal: null, color: "#9ccc65" },
    { k: "l",  name: "Lácteos",     c: 12, p: 8, f: 3, goal: null, color: "#5aa9e6" }
];

const FOOD_GROUP = Object.fromEntries(FOOD_GROUPS.map(g => [g.k, g]));
const groupKcal = g => 4 * g.c + 4 * g.p + 9 * g.f;
const BASE_PLAN_KCAL = FOOD_GROUPS.reduce((sum, g) => sum + (g.goal || 0) * groupKcal(g), 0);
/* Meta de calorías: la del test TDEE + objetivo; si aún no hay test, el plan base */
const planKcal = () => (typeof nutritionPlan === "function" && nutritionPlan()?.kcal) || BASE_PLAN_KCAL;
const groupGoal = g => { const pl = typeof nutritionPlan === "function" ? nutritionPlan() : null; return pl ? (pl.goals[g.k] ?? null) : g.goal; };

/* Franjas del día (minutos desde las 0:00): mañana 5:00-9:00, mediodía 9:01-14:00, tarde 14:01-18:00, noche el resto */
const TIME_BANDS = [
    { k: "m", name: "Mañana",   hint: "5:00 – 9:00",   from: 300,  to: 540 },
    { k: "d", name: "Mediodía", hint: "9:01 – 14:00",  from: 541,  to: 840 },
    { k: "t", name: "Tarde",    hint: "14:01 – 18:00", from: 841,  to: 1080 },
    { k: "n", name: "Noche",    hint: "18:01 – 4:59",  from: 1081, to: 1799 }
];
const WATER_ML = 250;   /* 1 vaso */
function bandOf(ts) {
    if (!ts) return null;
    const d = new Date(ts);
    let min = d.getHours() * 60 + d.getMinutes();
    if (min < 300) min += 1440;                 /* madrugada cuenta como noche */
    return TIME_BANDS.find(b => min >= b.from && min <= b.to) || TIME_BANDS[3];
}
const fmtTime = ts => new Date(ts).toLocaleTimeString("es-ES", { hour: "numeric", minute: "2-digit", hour12: true });

/* [nombre, equivalencia de 1 porción, (opcional) unidad en plural, (opcional) porciones por unidad] */
const FOOD_CATALOG = {
    h: [
        ["Arroz blanco", "1/3 taza (60 g)"],
        ["Arroz integral / Lentejas", "1/3 taza (70 g)"],
        ["Frijol entero o molido", "1/4 taza (60 g)"],
        ["Gallo pinto / Yuca", "1/3 taza (50 g)"],
        ["Garbanzo cocido", "1/3 taza (50 g)"],
        ["Garbanzo enlatado", "1/3 taza (65 g)"],
        ["Pasta (varias)", "1/2 taza (50 g)"],
        ["Canelón", "2 unidades"],
        ["Papa / Camote hervido", "1/2 taza (100 g)"],
        ["Papa / Camote horneado", "1/3 taza (80 g)"],
        ["Ayote sazón / Calabaza", "1 taza (200 g)"],
        ["Tiquizque", "1/4 taza (50 g)"],
        ["Plátano maduro", "1/4 taza (45 g)"],
        ["Elote / Maíz dulce", "1 mediano (85 g)"],
        ["Quinoa", "1/2 taza (65 g)"],
        ["Avena / Nestum / Granola", "1/4 taza (20 g)"],
        ["Nochis (crudo)", "1/3 taza (21 g)"],
        ["Cereal Allinklusive ZERO", "1/4 taza (26 g)"],
        ["Cereal (Cheerios, Zucaritas…)", "1/4 taza (20 g)"],
        ["Cereal Trijuelas", "1/4 taza (17,5 g)"],
        ["Pan cuadrado", "2 rebanadas (según tu menú)"],
        ["Pan / Bollitos Ruiseñor", "1 unidad"],
        ["Pan Thins Bimbo", "1 pieza"],
        ["Pan baguette", "4 dedos"],
        ["Pan hamburguesa artesano", "3 H"],
        ["Rapiditas de Bimbo (Med)", "1 unidad"],
        ["Tortilla Misión casera", "3 H"],
        ["Tortilla chalupa / taco Imasa", "2 unidades"],
        ["Tortiricas o Fogón", "2 unidades"],
        ["Galleta-arroz Bioland / Bicentury", "2 unidades"],
        ["Galleta-arroz Sanissimo", "4 unidades"],
        ["Galleta soda / María / Rice crispy", "1 paquete"],
        ["Harina de maíz (Juana / Maseca)", "2 cdas (24 g)"],
        ["Mezcla pancakes Tosh", "2 cdas (23 g)"],
        ["Miel", "1 cda (25 ml)"],
        ["Mermelada con azúcar", "1 cda (25 g)"],
        ["Pasas", "1 cda (20 g)"],
        ["Cocoa 0% azúcar", "1 cdta (20 g)"]
    ],
    bg: [
        ["Pechuga de pollo / Salmón", "30 g"],
        ["Muslo deshuesado", "25 g"],
        ["Beef steak / Molida res 10%", "20 g"],
        ["Molida res premium 5%", "25 g"],
        ["Lomito / Solomillo", "27 g"],
        ["Chuleta ahumada", "30 g"],
        ["Pescado blanco (corvina, tilapia)", "35 g"],
        ["Trucha", "25 g"],
        ["Calamar", "40 g"],
        ["Camarón cocido", "50 g"],
        ["Clara de huevo", "2 unidades"],
        ["Clara pasteurizada", "85 ml"],
        ["Jamón de pavo o light", "2-3 rebanadas"],
        ["Queso cottage", "50 g"],
        ["Queso ricotta", "40 g"],
        ["String cheese light", "1 unidad"],
        ["Atún Sabemas aceite", "1 lata = 5 porciones", "latas", 5],
        ["Atún Sabemas / Member agua", "1 lata = 4 porciones", "latas", 4],
        ["Atún Pronto aceite", "1 lata = 4 porciones", "latas", 4],
        ["Sardimar Funcional", "1 lata = 3 porciones", "latas", 3],
        ["Sardina salsa-tomate", "1 lata = 3 porciones", "latas", 3],
        ["Sardina light / Tesoro / Calvo", "1 lata = 2,5 porciones", "latas", 2.5],
        ["Whey protein", "1 scoop = 3 porciones", "scoops", 3]
    ],
    mg: [
        ["Huevo (completo)", "1 unidad"],
        ["Carne de res (+15% grasa)", "28 g"],
        ["Cerdo (chuleta / beef steak)", "30 g"],
        ["Tocineta", "1,5 unidades"],
        ["Salchicha de pavo", "1 unidad"],
        ["Nuggets de pollo Pipasa", "40 g"],
        ["Queso (Turrialba, semiduro, fresco, mozzarella)", "28 g"],
        ["Mozzarella Great Value Low skin", "26 g"],
        ["Queso Delactomy rallado", "23 g"],
        ["Queso Turrialba del Prado", "25 g"],
        ["Queso Dos Pinos 50%+ proteína", "28 g"],
        ["String cheese (stick)", "1 unidad"],
        ["Chicharritos Jacks", "15 g"],
        ["Atún Member Selection", "1 lata = 4 porciones", "latas", 4],
        ["Torta de arroz estándar", "1 torta = 2 porciones", "tortas", 2],
        ["Torta Beef Angus MS", "1 torta = 5 porciones", "tortas", 5]
    ],
    g: [
        ["Aceite (oliva, coco, canola…)", "1 cdta (5 g)"],
        ["Aguacate / Aceitunas", "1/4 o 2 cdas (30 g)"],
        ["Maní natural o con sal", "10 u o 1 cdta (8 g)"],
        ["Mantequilla de maní / almendra", "1 cdta (8 g)"],
        ["Mantequilla normal", "1 cdta (6 g)"],
        ["Mantequilla Light Dos Pinos", "2 cdtas (11 g)"],
        ["Almendra / Marañón", "8 unidades"],
        ["Nuez / Pecana", "1 cdta (7 g)"],
        ["Pistacho / Coco rallado", "1 cdta (10 g)"],
        ["Semilla de calabaza / girasol", "1 cdta (8 g)"],
        ["Chía / Linaza", "2 cdas (10 g)"],
        ["Chocolate Dark 75% o más", "2 piezas (10 g)"],
        ["Chips de chocolate / Granola Keto", "2 cdtas (10 g)"],
        ["Natilla Light Dos Pinos", "2 cdas (40 g)"],
        ["Mayonesa Delga-C", "2 cdas (45 g)"],
        ["Mayonesa Light Helmans", "2 cdas (20 g)"],
        ["Queso crema Dos Pinos Light", "1 cda (20 g)"],
        ["Leche de almendra", "1 taza (300 ml)"],
        ["Leche de coco", "1/2 taza (150 ml)"]
    ],
    v: [
        ["Vegetales frescos (ensalada)", "1 taza"],
        ["Vegetales hervidos / cocidos", "1/2 taza"]
    ],
    fr: [
        ["Banano", "1 pequeño (70 g)"],
        ["Manzana / Durazno", "1 pequeño (110 g)"],
        ["Naranja", "1/2 unidad (140 g)"],
        ["Pera", "1/2 unidad (100 g)"],
        ["Ciruela", "1 mediana (130 g)"],
        ["Fresa / Carambola", "5 u / 1 u (190 g)"],
        ["Piña", "3/4 taza (120 g)"],
        ["Sandía", "1 3/4 taza (280 g)"],
        ["Melón", "1 1/3 taza (240 g)"],
        ["Uva / Guayaba", "8 u / 1/2 (90 g)"],
        ["Mango", "1/2 unidad (100-130 g)"],
        ["Papaya", "1 1/4 taza (180 g)"],
        ["Kiwi", "1/2 unidad (100 g)"],
        ["Arándanos", "3/4 taza (100 g)"],
        ["Frambuesa", "1 taza (110 g)"],
        ["Mora", "1/3 taza"],
        ["Granadilla", "1 unidad (65 g)"],
        ["Cas / Cereza", "2 medianas (120 g)"],
        ["Guanábana", "4 cdas (95 g)"],
        ["Dátil", "1 unidad (20 g)"],
        ["Mamón chino / Jocote", "5 unidades"],
        ["Mamoncillo", "5 unidades (100 g)"],
        ["Jugo 100% de naranja", "1/2 taza (200 ml)"],
        ["Jugo 100% de manzana", "1/3 taza (130 ml)"],
        ["Agua de pipa", "1 pipa (300 ml)"],
        ["Mermelada St-Dalfour", "1 cda (25 g)"]
    ],
    l: [
        ["Leche", "1 taza (250 ml)"],
        ["Yogurt 0% grasa", "1/2 taza (200 ml)"],
        ["Yogurt griego Member Selection", "1/2 taza (175 ml)"],
        ["Yogurt natural Dos Pinos", "1/2 taza (165 ml)"],
        ["Helado Prote DP (chocolate o coco)", "4 cdas (70 g)"],
        ["Leche condensada", "5 cdas (75 g)"]
    ]
};

/* Alimentos de la tabla INISA/UCR 1984 (valores por 100 g de porción comestible). */
const FOOD_INISA = {"h":[["Arracache (INISA)","72 g"],["Camote (INISA)","52 g (≈1/3 unidad)"],["Ñame (INISA)","62 g"],["Ñampí (INISA)","67 g (≈1 unidad)"],["Papa (INISA)","84 g (≈1,5 unidades)"],["Raíz de chayote (INISA)","76 g"],["Yuca (INISA)","40 g"],["Arepa (INISA)","41 g (≈1/3 unidad)"],["Arroz crudo (INISA)","19 g (≈1,5 cdas)"],["Arroz frito (INISA)","56 g (≈2 cdas)"],["Avena (cruda) (INISA)","22,5 g (≈2 cdas)"],["Cebada (INISA)","20 g (≈1,5 cdas)"],["Corn flakes (INISA)","17,5 g"],["Galleta dulce (INISA)","20 g (≈3 unidades)"],["Galleta María (INISA)","22,5 g"],["Galleta soda (INISA)","21,5 g (≈6 unidades)"],["Harina de trigo (INISA)","19,5 g (≈1 cda)"],["Maicena (INISA)","17,5 g (≈1,5 cdas)"],["Maíz pelado (INISA)","19,5 g"],["Pan de rodaja blanco (INISA)","24,5 g (≈1 rebanada)"],["Pan de rodaja integral (INISA)","26 g (≈1 rebanada)"],["Pan francés (INISA)","30 g (≈1 pedazo)"],["Pasta cruda (INISA)","20,5 g (≈1 cda)"],["Tamal asado (INISA)","30 g (≈1/2 pedazo)"],["Tortilla de maíz (INISA)","35 g (≈1,5 unidades)"],["Plátano verde (INISA)","42 g"],["Puré de papa (INISA)","115 g (≈6 cdas)"],["Macarrones cocidos (INISA)","43 g (≈1 cda)"],["Gallo pinto (INISA)","60 g (≈1,5 cdas)"],["Frijol crudo (INISA)","24,5 g (≈3 cdas)"],["Arvejas secas (INISA)","24,5 g"],["Garbanzo crudo (INISA)","24,5 g"],["Lenteja cruda (INISA)","24,5 g"],["Gandul seco (INISA)","23,5 g"]],"bg":[["Pollo, muslo (INISA)","34 g"],["Pollo, pechuga (crudo) (INISA)","36 g"],["Res, carne magra (INISA)","33 g"],["Res, hígado (INISA)","35 g"],["Res, corazón (INISA)","41 g"],["Cerdo, hígado (INISA)","36 g"],["Venado asado (INISA)","23,5 g"],["Pescado fresco de mar (INISA)","35 g"],["Pescado de río (filete) (INISA)","38 g"],["Camarón fresco (INISA)","40 g (≈1 unidad)"],["Cangrejo / Langosta (INISA)","40 g"],["Calamares (INISA)","43 g"],["Bacalao seco (INISA)","8,5 g"],["Clara de huevo (INISA)","64 g (≈2 unidades)"],["Queso oreado semidescremado (INISA)","27,5 g"],["Casilán (INISA)","8 g"]],"mg":[["Pollo, tierno (INISA)","38 g"],["Res, molida / semigorda (INISA)","37 g"],["Res, lengua (INISA)","44 g"],["Ternera (INISA)","36 g"],["Cerdo, carne (INISA)","53 g"],["Conejo (INISA)","34 g"],["Atún en aceite (escurrido) (INISA)","29 g"],["Sardina en tomate (INISA)","37 g"],["Huevo de gallina (INISA)","62 g (≈1 unidad)"],["Yema de huevo (INISA)","44 g (≈2,5 unidades)"],["Chorizo (INISA)","44 g (≈1 pedazo)"],["Jamón de cerdo (INISA)","45 g"],["Mortadela (INISA)","47 g (≈1,5 rodajas)"],["Salchicha de res (INISA)","51 g (≈1,5 unidades)"],["Queso fresco (leche íntegra) (INISA)","40 g"],["Queso fresco semidescremado (INISA)","34 g"],["Queso duro (leche íntegra) (INISA)","25 g"],["Queso Kraft (INISA)","28 g (≈1 rodaja)"],["Requesón (INISA)","74 g (≈1,5 cdas)"],["Cuajada (INISA)","37 g"]],"g":[["Aguacate (INISA)","32 g (≈1/3 unidad)"],["Coco maduro (pulpa) (INISA)","18,5 g"],["Maní pelado (INISA)","10 g"],["Semilla de marañón (INISA)","12,5 g"],["Aceite vegetal / de palma (INISA)","5 g (≈1/2 cda)"],["Manteca de cerdo (INISA)","5 g (≈1/4 cda)"],["Manteca vegetal (INISA)","5 g (≈1/8 cda)"],["Mantequilla (INISA)","6 g (≈1/2 cda)"],["Margarina (INISA)","6 g (≈1/4 cda)"],["Mayonesa (INISA)","13,5 g (≈1/2 cda)"],["Tocino (INISA)","7,5 g"],["Chicharrones (INISA)","9 g"],["Natilla espesa (INISA)","13,5 g"],["Queso crema (INISA)","12 g"]],"v":[["Apio (INISA)","120 g"],["Ayote tierno (INISA)","91 g (≈1,5 pedazos)"],["Berenjena (INISA)","79 g"],["Berro (INISA)","125 g"],["Cebolla (INISA)","52 g (≈1 unidad)"],["Chayote (INISA)","83 g (≈1/3 unidad)"],["Chile dulce (INISA)","63 g (≈1,5 unidades)"],["Coliflor (INISA)","77 g"],["Espinaca (INISA)","100 g"],["Lechuga (INISA)","170 g (≈18,5 hojas)"],["Palmito (INISA)","96 g"],["Pepino (INISA)","145 g"],["Rábano (INISA)","100 g"],["Remolacha (INISA)","53 g"],["Repollo picado (INISA)","82 g (≈6 cdas)"],["Tomate (INISA)","110 g (≈1/2 unidad)"],["Vainicas (INISA)","76 g"],["Zanahoria (INISA)","53 g (≈1/2 unidad)"],["Hojas de mostaza / rábano (INISA)","105 g"],["Quelite de ayote (INISA)","145 g"],["Jugo de tomate (INISA)","115 g"]],"fr":[["Anona blanca (INISA)","60 g"],["Cereza (INISA)","100 g"],["Ciruela fresca (INISA)","125 g (≈2,5 unidades)"],["Durazno (INISA)","115 g (≈2,5 unidades)"],["Fresa (INISA)","175 g (≈16,5 unidades)"],["Grapefruit / Toronja (INISA)","155 g"],["Guayaba (INISA)","91 g (≈1,5 unidades)"],["Higo (INISA)","155 g (≈8,5 unidades)"],["Jocote maduro (INISA)","68 g (≈4,5 unidades)"],["Limón dulce (INISA)","215 g (≈2,5 unidades)"],["Mandarina (INISA)","140 g (≈2,5 unidades)"],["Mango maduro (INISA)","97 g (≈1,5 unidades)"],["Manzana de agua (INISA)","190 g (≈3,5 unidades)"],["Manzana rosa (INISA)","91 g"],["Marañón (fruta) (INISA)","130 g (≈2 unidades)"],["Melocotón / Durazno enlatado (INISA)","82 g"],["Nance (INISA)","105 g"],["Níspero (INISA)","140 g"],["Piña (INISA)","110 g (≈1,5 rodajas)"],["Tamarindo (INISA)","21 g"],["Uvas (INISA)","90 g (≈7,5 unidades)"],["Zapote (INISA)","48 g"],["Banano maduro (INISA)","59 g (≈1 unidad)"],["Guineo maduro (INISA)","55 g (≈1 unidad)"],["Plátano maduro (INISA)","46 g (≈1,5 rodajas)"],["Jugo de naranja (INISA)","150 g"],["Jugo de piña enlatado (INISA)","130 g"],["Jugo de manzana (INISA)","125 g"],["Agua de coco (INISA)","395 g"]],"l":[["Leche fluida de vaca (INISA)","230 g (≈1 vaso)"],["Leche descremada en polvo (INISA)","24,5 g (≈3 cdas)"],["Leche entera en polvo (INISA)","31 g (≈2 cdas)"],["Leche evaporada (INISA)","105 g (≈7,5 cdas)"],["Leche chocolatada (INISA)","110 g (≈1/2 caja)"],["Yogurt natural semidescremado (INISA)","230 g (≈12,5 cdas)"],["Leche condensada (INISA)","21,5 g (≈1 cda)"],["Helado de leche (INISA)","81 g"]]};
for (const k in FOOD_INISA) FOOD_CATALOG[k].push(...FOOD_INISA[k]);

/* ---------- datos ---------- */

const esc = t => String(t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtNum = (n, d = 1) => Number(n).toLocaleString("es-ES", { maximumFractionDigits: d });

/* Día que se está viendo en Comida (null = hoy); se cambia desde el calendario de calorías */
let foodDate = null;
const foodKey = () => foodDate || dateKey();

function foodEntries(key = foodKey()) {
    return (state.food && state.food.log && state.food.log[key]) || [];
}

function addFoodEntry(entry) {
    state.food ??= { log: {} };
    state.food.log ??= {};
    if (!entry.ts) {
        const now = new Date(), day = foodDate ? parseKey(foodDate) : new Date(now);
        day.setHours(now.getHours(), now.getMinutes(), 0, 0);
        entry.ts = day.getTime();
    }
    (state.food.log[foodKey()] ??= []).push(entry);
    saveState();
}

function removeFoodEntry(id) {
    const key = foodKey();
    if (!state.food?.log?.[key]) return;
    state.food.log[key] = state.food.log[key].filter(e => e.id !== id);
    if (!state.food.log[key].length) delete state.food.log[key];
    saveState();
}

/* Calorías del día frente a la meta del plan: ≤60 % rojo, 61-75 % amarillo, 76-120 % verde, ≥121 % rojo.
   Se usa igual en la barra de Comida y en el calendario de calorías. */
function kcalStatus(kcal) {
    const pct = kcal / planKcal() * 100;
    if (pct <= 60) return "red";
    if (pct < 76) return "gold";
    if (pct <= 120) return "green";
    return "red";
}

function foodTotals(entries) {
    const portions = {};
    let kcal = 0, c = 0, p = 0, f = 0;
    entries.forEach(e => {
        const g = FOOD_GROUP[e.g];
        if (!g) return;
        portions[e.g] = (portions[e.g] || 0) + e.p;
        kcal += e.p * groupKcal(g);
        c += e.p * g.c;
        p += e.p * g.p;
        f += e.p * g.f;
    });
    return { portions, kcal, c, p, f };
}

/* ---------- pantalla ---------- */

function renderFood() {
    const root = document.getElementById("foodContent");
    if (!root) return;

    if (!nutrition()) {
        root.innerHTML = `
            <div class="food-summary food-setup">
                <h3>Antes de empezar</h3>
                <p>Responde unas preguntas (edad, género, altura, peso, ejercicio y grasa corporal) para calcular tus calorías de mantenimiento, tu peso ideal y tu potencial muscular. Luego eliges tu objetivo y tu tipo de dieta.</p>
                <button class="food-start" data-act="test">Empezar test TDEE</button>
            </div>`;
        return;
    }

    const plan = nutritionPlan();
    const n = nutrition();
    const kcalGoal = plan.kcal;
    const entries = foodEntries();
    const t = foodTotals(entries);
    const pct = Math.min(100, (t.kcal / kcalGoal) * 100);
    const water = entries.filter(e => e.g === "agua").reduce((s, e) => s + e.p, 0);
    const hasFood = entries.some(e => e.g !== "agua");

    const chip = g => {
        const have = t.portions[g.k] || 0;
        const goal = groupGoal(g);
        const ratio = goal ? Math.min(100, (have / goal) * 100) : (have > 0 ? 100 : 0);
        const over = goal && have > goal;
        return `<button class="food-chip${over ? " over" : ""}" data-g="${g.k}" style="--c:${g.color}">
            <span class="fc-name">${g.name}</span>
            <span class="fc-val"><b>${fmtNum(have)}</b>${goal ? ` / ${fmtNum(goal)}` : ""}</span>
            <i style="width:${ratio}%"></i>
        </button>`;
    };
    const mlHave = water * WATER_ML;
    const waterChip = `<button class="food-chip" data-water="1" style="--c:#4aa8d8">
            <span class="fc-name">Agua</span>
            <span class="fc-val"><b>${fmtNum(mlHave / 1000, 2)}</b> / ${fmtNum(plan.water / 1000, 2)} L</span>
            <i style="width:${Math.min(100, mlHave / plan.water * 100)}%"></i>
        </button>`;
    const top = FOOD_GROUPS.slice(0, -1).map(chip).join("");
    const last = FOOD_GROUPS[FOOD_GROUPS.length - 1];

    root.innerHTML = `
        <div class="food-summary">
            <div class="food-kcal"><b>${fmtNum(t.kcal, 0)}</b><span>/ ${fmtNum(kcalGoal, 0)} kcal</span></div>
            <div class="food-bar"><i class="${hasFood ? kcalStatus(t.kcal) : ""}" style="width:${pct}%"></i></div>
            <div class="food-macros">
                <span>Carbohidratos <b>${fmtNum(t.c, 0)} g</b></span>
                <span>Proteína <b>${fmtNum(t.p, 0)} g</b></span>
                <span>Grasa <b>${fmtNum(t.f, 0)} g</b></span>
            </div>
            <button class="food-plan" data-act="plan" aria-label="Cambiar objetivo y dieta: ${GOALS[n.goal].short}, ${DIETS[n.diet].short}">
                <span><small>Objetivo y dieta</small><b>${GOALS[n.goal].short} · ${DIETS[n.diet].short}</b></span><i aria-hidden="true">⚙</i>
            </button>
        </div>
        <div class="food-groups">${top}</div>
        <div class="food-groups">${chip(last)}${waterChip}</div>
        <button class="food-chip food-add" data-add="1">+ Comida</button>
        <button class="food-hist-btn" data-act="hist">Ver historial${foodDate ? "" : " de hoy"} <small>${entries.length ? `(${entries.length})` : ""}</small></button>`;
}

/* ---------- historial (ventana emergente) ---------- */

function openFoodHistory() {
    let mode = "time";          /* "time" = por hora, "kcal" = por calorías */
    let desc = true;

    const { sheet } = openSheet("fh-sheet", `Historial${foodDate ? "" : " de hoy"}`);
    const body = document.createElement("div");
    body.className = "fh-body";
    sheet.appendChild(body);

    const kcalOf = e => { const g = FOOD_GROUP[e.g]; return g ? e.p * groupKcal(g) : 0; };
    const rowHtml = e => {
        const g = FOOD_GROUP[e.g];
        const color = g ? g.color : "#4aa8d8";
        const isWater = e.g === "agua";
        return `<div class="food-row" style="--c:${color}">
            <span class="fr-dot"></span>
            <span class="fr-name">${esc(e.n)}<small>${e.ts ? fmtTime(e.ts) + " · " : ""}${esc(e.t)}</small></span>
            <span class="fr-kcal">${isWater ? fmtNum(e.p * WATER_ML, 0) + " ml" : fmtNum(kcalOf(e), 0) + " kcal"}</span>
            <button class="fr-del" data-id="${esc(e.id)}" aria-label="Quitar">✕</button>
        </div>`;
    };

    /* Por hora: todas las franjas del día, cada una con su total */
    const draw = () => {
        const all = foodEntries();
        let list;
        if (mode === "kcal") {
            const sorted = all.slice().sort((a, b) => desc ? kcalOf(b) - kcalOf(a) : kcalOf(a) - kcalOf(b));
            list = sorted.map(rowHtml).join("");
        } else {
            list = TIME_BANDS.map(b => {
                const items = all.filter(e => bandOf(e.ts)?.k === b.k).sort((x, y) => x.ts - y.ts);
                if (!items.length) return "";
                const kc = items.reduce((s, e) => s + kcalOf(e), 0);
                return `<div class="picker-group">${b.name} · ${b.hint} <span>${fmtNum(kc, 0)} kcal</span></div>${items.map(rowHtml).join("")}`;
            }).join("");
            const old = all.filter(e => !e.ts);
            if (old.length) list += `<div class="picker-group">Sin hora registrada</div>${old.map(rowHtml).join("")}`;
        }

        body.innerHTML = `
            <div class="seg fh-seg">
                <button class="seg-btn${mode === "time" ? " active" : ""}" data-mode="time">Hora</button>
                <button class="seg-btn${mode === "kcal" ? " active" : ""}" data-mode="kcal">Calorías</button>
            </div>
            ${mode === "kcal" && all.length > 1 ? `<button class="fh-order" data-order="1">${desc ? "Más calorías primero ▼" : "Menos calorías primero ▲"}</button>` : ""}
            <div class="picker-list fh-list">${list || '<p class="picker-empty">Aún no hay comidas.</p>'}</div>`;
    };

    body.addEventListener("click", e => {
        const t = e.target.closest("button");
        if (!t) return;
        if (t.dataset.mode) { mode = t.dataset.mode; draw(); }
        else if (t.dataset.order) { desc = !desc; draw(); }
        else if (t.dataset.id) { removeFoodEntry(t.dataset.id); renderFood(); draw(); }
    });

    draw();
}

function askWater() {
    let qty = 1;
    openStepper({
        title: "Agua",
        subtitle: `1 vaso = ${WATER_ML} ml`,
        unit: "vasos",
        doneLabel: "Agregar",
        cancelLabel: "Cancelar",
        read: () => fmtNum(qty, 2),
        step: dir => { qty = Math.max(1, Math.round((qty + dir) * 100) / 100); },
        onEdit: text => {
            const v = parseAmount(text, { max: 40 });
            if (v === null || v <= 0) return "x";
            qty = v;
            return "";
        },
        onClose: confirmed => {
            if (!confirmed) return;
            addFoodEntry({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                n: "Agua", g: "agua", p: qty,
                t: `${fmtNum(qty, 2)} ${qty === 1 ? "vaso" : "vasos"} (${fmtNum(qty * WATER_ML, 0)} ml)`
            });
            renderFood();
        }
    });
}

document.addEventListener("click", e => {
    const root = document.getElementById("foodContent");
    if (!root || !root.contains(e.target) || SWIPE.justDragged) return;

    const act = e.target.closest("[data-act]");
    if (act) {
        if (act.dataset.act === "test") runTdeeTest();
        else if (act.dataset.act === "plan") openPlanMenu();
        else if (act.dataset.act === "hist") openFoodHistory();
        return;
    }

    const chip = e.target.closest(".food-chip");
    if (!chip) return;
    if (chip.dataset.water) askWater();
    else openFoodPicker(chip.dataset.add ? null : chip.dataset.g);
});

/* ---------- agregar ---------- */

function openFoodPicker(groupKey) {
    const keys = groupKey ? [groupKey] : FOOD_GROUPS.map(g => g.k);

    openPicker({
        title: groupKey ? FOOD_GROUP[groupKey].name : "Agregar comida",
        searchable: true,
        groups: keys.map(k => ({
            title: groupKey ? null : FOOD_GROUP[k].name,
            items: FOOD_CATALOG[k].map(item => ({ label: item[0], sub: item[1], value: { g: k, item } }))
        })),
        createLabel: "Porciones sueltas",
        onPick: ({ g, item }) => askFoodAmount(g, item),
        onCreate: query => {
            const loose = g => askFoodAmount(g, [query || FOOD_GROUP[g].name, "1 porción"]);
            if (groupKey) { loose(groupKey); return; }
            openPicker({
                title: "¿De qué grupo?",
                groups: [{ items: FOOD_GROUPS.map(g => ({ label: g.name, sub: `≈ ${fmtNum(groupKcal(g), 0)} kcal`, value: g.k })) }],
                onPick: loose
            });
        },
        emptyText: "Sin alimentos"
    });
}

function askFoodAmount(groupKey, item) {
    const [name, equiv, unit, per] = item;
    const perUnit = per || 1;
    const unitName = unit || "porciones";
    let qty = 1;

    openStepper({
        title: name,
        subtitle: unit ? equiv : `1 porción = ${equiv}`,
        unit: unitName,
        doneLabel: "Agregar",
        cancelLabel: "Cancelar",
        read: () => fmtNum(qty, 2),
        step: dir => { qty = Math.max(1, Math.round((qty + dir) * 100) / 100); },
        onEdit: text => {
            const n = parseAmount(text, { max: 99 });
            if (n === null || n <= 0) return "x";
            qty = n;
            return "";
        },
        onClose: confirmed => {
            if (!confirmed) return;
            addFoodEntry({
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                n: name,
                g: groupKey,
                p: qty * perUnit,
                t: `${fmtNum(qty, 2)} ${qty === 1 ? unitName.replace(/(ciones|s)$/, m => m === "ciones" ? "ción" : "") : unitName}`
            });
            renderFood();
        }
    });
}
