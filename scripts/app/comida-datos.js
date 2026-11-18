/* Datos de comida: grupos de porciones, catálogo (con su calibración en la misma línea) e INISA. */

/* =========================================================
    COMIDA: contador de calorías por porciones del plan nutricional
    Cada alimento equivale a N porciones de un grupo (harina, proteína, grasa…)
    y cada porción tiene un valor promedio. Son aproximaciones: para afinarlas
    basta con cambiar los números de FOOD_GROUPS.
    c = carbohidratos (g), p = proteína (g), f = grasa (g) por porción.
    goal = porciones al día del plan (null = sin meta).
========================================================= */

/* Plan base. Proteínas y grasas en 40 % BG · 30 % MG · 30 % Grasas (7 · 5 · 5 porciones);
   con el test TDEE todo se escala a las calorías de cada persona. */
const FOOD_GROUPS = [
    { k: "h",  name: "Harinas",     c: 15, p: 3, f: 1, goal: 21,   color: "#e08a4b" },
    { k: "bg", name: "Proteína BG", c: 0,  p: 7, f: 1, goal: 7,    color: "#d9544f" },
    { k: "mg", name: "Proteína MG", c: 0,  p: 7, f: 5, goal: 5,    color: "#ef7a6a" },
    { k: "g",  name: "Grasas",      c: 0,  p: 0, f: 5, goal: 5,    color: "#f2c14e" },
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
/* ml de agua de un registro: los vasos de agua y el agua que traen las bebidas */
const entryWaterMl = e => e.g === "agua" ? e.p * WATER_ML
    : e.g === FAST_GROUP ? drinkWaterMl(e.n) * (e.q ?? e.p ?? 0) : 0;
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
        /* Canelones rellenos y gratinados, 1 canelón ≈ 110 g (pasta cocida ~35 g, relleno ~45 g, salsa y queso
        encima ~30 g) */
        ["Canelones de queso con salsa de tomate", "1 canelón (110 g)", "canelones", 1, { k: 170, c: 14, p: 9.5, f: 8.5, pt: { h: 1, mg: 1, g: 0.5 } }],
        ["Canelones de atún y huevo", "1 canelón (110 g)", "canelones", 1, { k: 155, c: 14, p: 11, f: 6, pt: { h: 1, mg: 1 } }],
        ["Canelones de carne molida y huevo", "1 canelón (110 g)", "canelones", 1, { k: 175, c: 14, p: 11, f: 8.5, pt: { h: 1, mg: 1, g: 0.5 } }],
        ["Papa / Camote hervido", "1/2 taza (100 g)"],
        /* Costillas (USDA, carne sin hueso, grasa incluida). La de res es la más grasosa. */
        /* Picadillos de papa a la tica (papa, carne, sofrito y un poco de aceite), ≈ 140 kcal por 100 g;
        carne mechada de res en su salsa de tomate, cebolla y chile */
        ["Picadillo de papa con carne molida", "1/2 taza (100 g)", { k: 140, c: 12, p: 7,   f: 6.4, pt: { h: 1, mg: 0.5, g: 0.5 } }],
        ["Picadillo de papa con carne mechada", "1/2 taza (100 g)", { k: 128, c: 12, p: 8,   f: 5.2, pt: { h: 1, bg: 1 } }],
        /* Ensalada fría de caracolitos: caracolitos, atún y mayonesa juntos (por 100 g ≈ 60 g de pasta cocida,
        25 g de atún escurrido y 15 g de mayonesa) */
        ["Ensalada fría de caracolitos con atún y mayonesa", "1/2 taza (100 g)", { k: 225, c: 19, p: 10, f: 12, pt: { h: 1.5, mg: 0.5, g: 1.5 } }],
        ["Papa / Camote horneado", "1/3 taza (80 g)"],
        ["Ayote sazón / Calabaza", "1 taza (200 g)"],
        ["Tiquizque", "1/4 taza (50 g)"],
        ["Plátano maduro", "1/4 taza (45 g)"],
        /* Patacones: casero ≈ 1/4 de plátano verde aplastado y frito (≈ 3 g de aceite cada uno). De paquete del súper:
        prefritos congelados ≈ 180 kcal por 100 g; si se vuelven a freír absorben ≈ 1,5 g más de aceite cada uno.
        Snack de bolsa (tipo chips de plátano): ≈ 160 kcal por 30 g */
        ["Patacón casero (frito)", "1 patacón (35 g)", { k: 85,  c: 14,  p: 0.5, f: 3.2, pt: { h: 1 } }],
        ["Patacones de paquete (prefritos, al horno o air fryer)", "1 patacón (28 g)", { k: 50,  c: 9.2, p: 0.3, f: 1.4, pt: { h: 0.5 } }],
        ["Patacones de paquete (prefritos, vueltos a freír)", "1 patacón (32 g)", { k: 64,  c: 9.2, p: 0.3, f: 2.9, pt: { h: 0.5, g: 0.5 } }],
        ["Patacones o tajadas de plátano de bolsa (snack)", "1 bolsa pequeña (30 g)", { k: 160, c: 18,  p: 1,   f: 9,   pt: { h: 1, g: 1.5 } }],
        ["Elote / Maíz dulce", "1 mediano (85 g)"],
        ["Quinoa", "1/2 taza (65 g)"],
        ["Avena / Nestum / Granola", "1/4 taza (20 g)"],
        ["Nochis (crudo)", "1/3 taza (21 g)"],
        ["Cereal Allinklusive ZERO", "1/4 taza (26 g)"],
        ["Cereal (Cheerios, Zucaritas…)", "1/4 taza (20 g)"],
        ["Cereal Trijuelas", "1/3 taza (17,5 g)"],
        /* Pan Bimbo blanco: 1 rebanada (31 g) = 73 kcal → 1 harina */
        ["Pan cuadrado blanco Bimbo", "1 rebanada (31 g)", "rebanadas", 1, { k: 73,  c: 14.2, p: 2.6, f: 0.7, pt: { h: 1 } }],
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
        /* Azúcar: carbohidrato puro (15–16 g = 1 harina). 2 cdtas = 1/2 porción */
        ["Azúcar (blanca o morena)", "4 cdtas (16 g)", { k: 62,  c: 16,   p: 0,   f: 0,   pt: { h: 1 } }],
        /* Miel de abeja (USDA): 1 cda = 21 g = 64 kcal, 17 g de azúcares, sin grasa ni proteína apreciable → 1 harina */
        ["Miel", "1 cda (21 g)", { k: 64,  c: 17,   p: 0.1, f: 0,   pt: { h: 1 } }],
        ["Mermelada con azúcar", "1 cda (25 g)", { k: 70,  c: 17,   p: 0.1, f: 0,   pt: { h: 1 } }],
        ["Pasas", "1 cda (20 g)", { k: 60,  c: 15.9, p: 0.6, f: 0.1, pt: { h: 1 } }],
        ["Cocoa 0% azúcar", "4 cdtas (20 g)"],
        /* Tabla nutricional de referencia por 100 g */
        ["Torta de arroz", "1 torta (100 g)", { k: 295, c: 44,   p: 8.2, f: 9.5, pt: { h: 2.5, l: 0.5, g: 1 } }],
        ["Chicharritos de harina o maíz (snack)", "15 g", { k: 75, c: 9, p: 1,   f: 4,   pt: { h: 0.5, g: 1 } }]
    ],
    bg: [
        ["Pechuga de pollo", "30 g"],
        /* Salmón cocido (30 g): más grasa que la pechuga → mitad baja y mitad media en grasa */
        ["Salmón", "30 g", { k: 62,  c: 0,    p: 6.6, f: 3.7, pt: { bg: 0.5, mg: 0.5 } }],
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
        ["Queso ricotta", "40 g", { k: 70,  c: 1.2,  p: 4.5, f: 5.2, pt: { mg: 1 } }],
        ["String cheese light", "1 unidad"],
        ["Atún Sabemas aceite", "1 lata = 5 porciones", "latas", 5],
        ["Atún Sabemas / Member agua", "1 lata = 4 porciones", "latas", 4],
        ["Atún Pronto aceite", "1 lata = 4 porciones", "latas", 4],
        /* Suli (Walmart, Palí, Más x Menos, Maxi Palí): lata de 140 g, ≈ 100 g escurrido (≈ 25 g de proteína) */
        ["Atún Suli en agua", "1 lata = 3,5 porciones", "latas", 3.5],
        ["Atún Suli en aceite", "1 lata = 4,5 porciones", "latas", 4.5],
        ["Sardimar Funcional", "1 lata = 3 porciones", "latas", 3],
        ["Sardina salsa-tomate", "1 lata = 3 porciones", "latas", 3],
        ["Sardina light / Tesoro / Calvo", "1 lata = 2,5 porciones", "latas", 2.5],
        ["Whey protein", "1 scoop = 3 porciones", "scoops", 3]
    ],
    mg: [
        ["Huevo (completo)", "1 unidad"],
        ["Carne de res (+15% grasa)", "28 g"],
        ["Cerdo (chuleta / beef steak)", "30 g"],
        ["Carne mechada (en salsa)", "35 g", { k: 65,  c: 1,  p: 7.5, f: 3.4, pt: { mg: 1 } }],
        /* Pollo en salsa de coco (casero, con cebolla, chile y olores), por presa chica de alita (muslito con huesito):
           ~30 g de carne con piel + ~15 g de salsa (leche de coco) ≈ 80 kcal, 6 g proteína, 6 g grasa, 1 g carbohidrato */
        ["Pollo en salsa de coco (presa de alita)", "1 presa (muslito de alita)", "presas (muslitos de alita)", 1, { k: 80, c: 1, p: 6, f: 6, pt: { mg: 1 } }],
        ["Costilla de cerdo al horno o a la parrilla", "25 g (sin hueso)", { k: 73,  c: 0,   p: 5.8, f: 5.4,  pt: { mg: 1 } }],
        ["Costilla de cerdo en salsa BBQ", "35 g (sin hueso)", { k: 120, c: 4.5, p: 7.5, f: 7.8,  pt: { mg: 1, h: 0.5 } }],
        ["Costilla de cerdo frita o en olla", "25 g (sin hueso)", { k: 99,  c: 0,   p: 7.3, f: 7.6,  pt: { mg: 1, g: 0.5 } }],
        ["Costilla de res en olla o en sopa", "25 g (sin hueso)", { k: 118, c: 0,   p: 5.4, f: 10.5, pt: { mg: 1, g: 1 } }],
        ["Tocineta", "1,5 unidades"],
        ["Salchicha de pavo", "1 unidad"],
        ["Nuggets de pollo Pipasa", "40 g", { k: 100, c: 5.6,  p: 5.6, f: 6,   pt: { h: 0.5, mg: 0.5, g: 0.5 } }],
        ["Queso (Turrialba, semiduro, fresco, mozzarella)", "28 g"],
        ["Mozzarella Great Value Low skin", "26 g"],
        ["Queso Delactomy rallado", "23 g"],
        ["Queso Turrialba del Prado", "25 g"],
        ["Queso Dos Pinos 50%+ proteína", "28 g"],
        ["String cheese (stick)", "1 unidad"],
        /* Chicharritos: de cerdo (proteína y grasa) o de harina/maíz (harina y grasa) */
        ["Chicharritos Jacks de cerdo (chicharrón)", "15 g", { k: 82, c: 0, p: 9.2, f: 4.7, pt: { mg: 1 } }],
        ["Atún Member Selection", "1 lata = 4 porciones", "latas", 4],
        ["Torta Beef Angus MS", "1 torta = 5 porciones", "tortas", 5]
    ],
    g: [
        ["Aceite (oliva, coco, canola…)", "1 cdta (5 g)"],
        ["Aguacate / Aceitunas", "1/4 o 2 cdas (30 g)"],
        ["Maní natural o con sal", "10 u o 1 cdta (8 g)"],
        ["Mantequilla de maní Jif", "1/2 cda (8 g)"],
        ["Mantequilla de maní Member's Selection", "1/2 cda (8 g)"],
        ["Mantequilla de almendra", "1/2 cda (8 g)"],
        ["Mantequilla normal", "1 cdta (6 g)"],
        ["Mantequilla Light Dos Pinos", "2 cdtas (11 g)"],
        ["Almendra / Marañón", "8 unidades"],
        ["Nuez / Pecana", "1 cdta (7 g)"],
        ["Pistacho / Coco rallado", "1 cdta (10 g)"],
        ["Semilla de calabaza / girasol", "1 cdta (8 g)"],
        ["Chía / Linaza", "2 cdas (10 g)"],
        ["Chocolate Dark 75% o más", "2 piezas (10 g)", { k: 60,  c: 4.6,  p: 0.8, f: 4.3, pt: { h: 0.5, g: 0.5 } }],
        ["Chips de chocolate / Granola Keto", "2 cdtas (10 g)"],
        ["Natilla Light Dos Pinos", "2 cdas (40 g)"],
        /* Delga-C ultra light: ~15 kcal por cucharada (15 g) */
        ["Mayonesa Delga-C (ultra light)", "3 cdas (45 g)", { k: 50,  c: 3,    p: 0,   f: 4.5, pt: { g: 1 } }],
        ["Mayonesa Light Helmans", "2 cdas (20 g)"],
        ["Queso crema Dos Pinos Light", "1 cda (20 g)"],
        ["Leche de almendra", "1 taza (300 ml)"],
        /* Leche de coco: la de cartón es bebida (muy diluida); la de lata es para cocinar (muy grasosa) */
        ["Leche de coco de cartón (sin azúcar)", "1 taza (240 ml)", { k: 45, c: 1,   p: 0,   f: 4.5, pt: { g: 1 } }],
        ["Leche de coco de cartón (con azúcar)", "1 taza (240 ml)", { k: 80, c: 7,   p: 0,   f: 5,   pt: { g: 1, h: 0.5 } }],
        ["Leche de coco de lata", "2 cdas (30 ml)", { k: 59, c: 0.8, p: 0.6, f: 6.4, pt: { g: 1.5 } }],
        ["Leche de coco de lata light", "1/4 taza (60 ml)", { k: 50, c: 1,   p: 0.5, f: 5,   pt: { g: 1 } }],
        ["Chimichurri argentino (con aceite)", "1/2 cda (8 g)"],
        /* Cremas para café (etiquetas Nestlé). Las Coffee-mate traen azúcar del jarabe de maíz: grasa + 1/2 harina */
        ["Crema para café Coffee-mate en polvo", "6 cdtas (16 g)", { k: 87, c: 9.1, p: 0.3, f: 5.5, pt: { g: 1, h: 0.5 } }],
        ["Crema para café Coffee-mate líquida", "4 cdas (60 ml)", { k: 80, c: 10,  p: 0,   f: 4.4, pt: { g: 1, h: 0.5 } }],
        ["Media crema Nestlé", "1 1/2 cdas (22 g)", { k: 49, c: 0.8, p: 0.4, f: 5,   pt: { g: 1 } }],
        ["Crema dulce (para batir)", "1 cda (15 g)", { k: 50, c: 0.5, p: 0.2, f: 5.3, pt: { g: 1 } }]
    ],
    v: [
        ["Vegetales frescos (ensalada)", "1 taza"],
        ["Vegetales hervidos / cocidos", "1/2 taza"],
        ["Chimichurri tico (tomate, cebolla, culantro, limón)", "1/2 taza (80 g)"]
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
        /* Leches (250 ml) */
        ["Leche entera", "1 taza (250 ml)", { k: 157, c: 12.4, p: 8.1, f: 8.4, pt: { l: 1, g: 1 } }],
        ["Leche semidescremada (2 %)", "1 taza (250 ml)", { k: 128, c: 12.4, p: 8.2, f: 5,   pt: { l: 1, g: 0.5 } }],
        /* Coronado Nutritiva semidescremada 1,5 % (etiqueta, 250 ml): 116 kcal, 12 g carbohidratos (sin azúcar añadido),
           8 g proteína, 4 g grasa (2 g saturada); con vitaminas A y D, hierro y ácido fólico */
        ["Leche semidescremada 1,5 % (Coronado Nutritiva)", "1 taza (250 ml)", { k: 116, c: 12, p: 8, f: 4, pt: { l: 1, g: 0.5 } }],
        ["Leche descremada", "1 taza (250 ml)", { k: 87,  c: 12.5, p: 8.6, f: 0.2, pt: { l: 1 } }],
        /* Yogurts: natural (sin azúcar) y de sabor */
        ["Yogurt 0 % grasa natural", "1/2 taza (200 ml)", { k: 112, c: 15.4, p: 11.4, f: 0.4, pt: { l: 1 } }],
        ["Yogurt 0 % grasa de sabor (con edulcorante)", "1/2 taza (200 ml)", { k: 100, c: 14,   p: 10,   f: 0.4, pt: { l: 1 } }],
        ["Yogurt griego natural Member's Selection", "1/2 taza (175 ml)", { k: 100, c: 6.4,  p: 17.4, f: 0.7, pt: { l: 0.5, bg: 1.5 } }],
        ["Yogurt griego de sabor", "1/2 taza (175 ml)", { k: 150, c: 18,   p: 14,   f: 2,   pt: { l: 1, bg: 1 } }],
        ["Yogurt natural Dos Pinos", "1/2 taza (165 ml)", { k: 101, c: 7.8,  p: 5.8,  f: 5.4, pt: { l: 1 } }],
        ["Yogurt de sabor con azúcar (batido o bebible)", "1/2 taza (165 ml)", { k: 163, c: 30.7, p: 6.6,  f: 1.8, pt: { l: 0.5, h: 1.5 } }],
        /* Etiqueta Dos Pinos (sabor chocolate, ½ taza = 63 g: 82 kcal) llevada a 70 g; cubre los demás sabores */
        ["Helado Prote DP (chocolate, coco y otros sabores)", "4 cdas (70 g)", { k: 91, c: 11.1, p: 6.9, f: 2.2, pt: { l: 0.5, h: 0.5 } }],
        ["Leche condensada", "5 cdas (75 g)", { k: 241, c: 40.7, p: 5.9, f: 6.5, pt: { l: 0.5, h: 2, g: 0.5 } }]
    ]
};

/* Alimentos de la tabla INISA/UCR 1984 que no tienen par en el catálogo de arriba (los repetidos se quitaron:
   p. ej. el huevo queda solo como "Huevo (completo)"). La porción es la de INISA en gramos, con su equivalencia
   aproximada en tazas, cucharadas o unidades (medidas rasas). */
const FOOD_INISA = {"h":[["Arracache (INISA)","1/2 taza (72 g)"],["Ñame (INISA)","1/2 taza (62 g)"],["Ñampí (INISA)","1 unidad (67 g)"],["Raíz de chayote (INISA)","1/2 taza (76 g)"],["Arepa (INISA)","1/3 unidad (41 g)"],["Arroz crudo (INISA)","1 1/2 cdas (19 g)"],["Arroz frito (INISA)","1/3 taza (56 g)"],["Cebada (INISA)","1 1/2 cdas (20 g)"],["Galleta dulce (INISA)","3 unidades (20 g)"],["Harina de trigo (INISA)","2 1/2 cdas (19,5 g)"],["Maicena (INISA)","2 cdas (17,5 g)"],["Maíz pelado (INISA)","2 cdas (19,5 g)"],["Pan de rodaja integral (INISA)","1 rebanada (26 g)"],["Pan francés (INISA)","1 pedazo (30 g)"],["Pasta cruda (INISA)","3 cdas (20,5 g)"],["Tamal asado (INISA)","1/2 pedazo (30 g)"],["Tortilla de maíz (INISA)","1 1/2 unidades (35 g)"],["Plátano verde (INISA)","1/4 unidad (42 g)"],["Puré de papa (INISA)","1/2 taza (115 g)"],["Frijol crudo (INISA)","2 cdas (24,5 g)"],["Arvejas secas (INISA)","2 cdas (24,5 g)"],["Garbanzo crudo (INISA)","2 cdas (24,5 g)"],["Lenteja cruda (INISA)","2 cdas (24,5 g)"],["Gandul seco (INISA)","2 cdas (23,5 g)"]],"bg":[["Res, hígado (INISA)","1 trozo pequeño (35 g)"],["Res, corazón (INISA)","1 trozo pequeño (41 g)"],["Cerdo, hígado (INISA)","1 trozo pequeño (36 g)"],["Venado asado (INISA)","1 trozo pequeño (23,5 g)"],["Cangrejo / Langosta (INISA)","1/4 taza de carne (40 g)"],["Bacalao seco (INISA)","1 cda desmenuzado (8,5 g)"],["Queso oreado semidescremado (INISA)","1 rebanada (27,5 g)"],["Casilán (INISA)","1 cda (8 g)"]],"mg":[["Pollo, tierno (INISA)","1 trozo pequeño (38 g)"],["Res, lengua (INISA)","1 rebanada (44 g)"],["Ternera (INISA)","1 trozo pequeño (36 g)"],["Conejo (INISA)","1 trozo pequeño (34 g)"],["Yema de huevo (INISA)","2 1/2 unidades (44 g)"],["Chorizo (INISA)","1 pedazo (44 g)"],["Jamón de cerdo (INISA)","2 rebanadas (45 g)"],["Mortadela (INISA)","1 1/2 rodajas (47 g)"],["Salchicha de res (INISA)","1 1/2 unidades (51 g)"],["Queso Kraft (INISA)","1 rodaja (28 g)"],["Queso duro (leche íntegra) (INISA)","1 rebanada (25 g)"],["Cuajada (INISA)","2 1/2 cdas (37 g)"],["Requesón (INISA)","1/3 taza (74 g)"]],"g":[["Coco maduro (pulpa) (INISA)","1/4 taza rallado (18,5 g)"],["Manteca de cerdo (INISA)","1 cdta (5 g)"],["Manteca vegetal (INISA)","1 cdta (5 g)"],["Margarina (INISA)","1 cdta (6 g)"],["Mayonesa (INISA)","1 cda (13,5 g)"],["Tocino (INISA)","1 cda picado (7,5 g)"],["Chicharrones (INISA)","1 trozo pequeño (9 g)"],["Natilla espesa (INISA)","1 cda (13,5 g)"],["Queso crema (INISA)","1 cda (12 g)"]],"v":[["Apio (INISA)","1 taza picado (120 g)"],["Ayote tierno (INISA)","3/4 taza en cubos (91 g)"],["Berenjena (INISA)","1 taza en cubos (79 g)"],["Berro (INISA)","3 1/2 tazas (125 g)"],["Cebolla (INISA)","1/3 taza picada o 1 pequeña (52 g)"],["Chayote (INISA)","2/3 taza en cubos (83 g)"],["Chile dulce (INISA)","1/2 taza picado (63 g)"],["Coliflor (INISA)","3/4 taza (77 g)"],["Espinaca (INISA)","3 tazas cruda (100 g)"],["Lechuga (INISA)","3 1/2 tazas picada (170 g)"],["Palmito (INISA)","2/3 taza (96 g)"],["Pepino (INISA)","1 1/4 tazas en rodajas (145 g)"],["Rábano (INISA)","1 taza en rodajas (100 g)"],["Remolacha (INISA)","1/3 taza (53 g)"],["Repollo picado (INISA)","1 taza (82 g)"],["Tomate (INISA)","1 mediano (110 g)"],["Vainicas (INISA)","2/3 taza (76 g)"],["Zanahoria (INISA)","1/2 unidad o 1/2 taza rallada (53 g)"],["Hojas de mostaza / rábano (INISA)","2 tazas (105 g)"],["Quelite de ayote (INISA)","3 tazas crudo (145 g)"],["Jugo de tomate (INISA)","1/2 taza (115 ml)"]],"fr":[["Anona blanca (INISA)","1/4 taza de pulpa (60 g)"],["Grapefruit / Toronja (INISA)","1/2 unidad grande (155 g)"],["Higo (INISA)","8 unidades pequeñas (155 g)"],["Limón dulce (INISA)","2 1/2 unidades (215 g)"],["Mandarina (INISA)","2 1/2 unidades (140 g)"],["Manzana de agua (INISA)","3 1/2 unidades (190 g)"],["Manzana rosa (INISA)","2 unidades (91 g)"],["Marañón (fruta) (INISA)","2 unidades (130 g)"],["Melocotón / Durazno enlatado (INISA)","1/3 taza (82 g)"],["Nance (INISA)","3/4 taza (105 g)"],["Níspero (INISA)","1 unidad pequeña (140 g)"],["Tamarindo (INISA)","2 cdas de pulpa (21 g)"],["Zapote (INISA)","1/4 taza de pulpa (48 g)"],["Guineo maduro (INISA)","1 unidad (55 g)"],["Jugo de piña enlatado (INISA)","1/2 taza (130 ml)"]],"l":[["Leche descremada en polvo (INISA)","1/3 taza (24,5 g)"],["Leche entera en polvo (INISA)","1/4 taza (31 g)"],["Leche evaporada (INISA)","1/2 taza escasa (105 ml)"],["Leche chocolatada (INISA)","1/2 taza (110 ml)"],["Helado de leche (INISA)","1/2 taza (81 g)"]]};
for (const k in FOOD_INISA) FOOD_CATALOG[k].push(...FOOD_INISA[k]);

/* Calibración: los alimentos del catálogo que terminan en { k, c, p, f, pt } tienen su valor real por la porción
   listada (mezclan grupos o se alejan del promedio del grupo): k = kcal, c/p/f = carbohidratos/proteína/grasa (g),
   pt = equivalencia en porciones (de 0,5 en 0,5). Las fuentes van anotadas junto a cada alimento. */
const FOOD_CALIBRATION = Object.fromEntries(Object.values(FOOD_CATALOG).flat()
    .map(i => [i[0], i[i.length - 1]]).filter(([, c]) => c && typeof c === "object"));
