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
        ["Pan cuadrado blanco Bimbo", "2 rebanadas (62 g)"],
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
        ["Cocoa 0% azúcar", "4 cdtas (20 g)"],
        ["Torta de arroz", "1 torta (100 g)"],
        ["Chicharritos de harina o maíz (snack)", "15 g"]
    ],
    bg: [
        ["Pechuga de pollo", "30 g"],
        ["Salmón", "30 g"],
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
        ["Chicharritos Jacks de cerdo (chicharrón)", "15 g"],
        ["Atún Member Selection", "1 lata = 4 porciones", "latas", 4],
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
        ["Mayonesa Delga-C (ultra light)", "3 cdas (45 g)"],
        ["Mayonesa Light Helmans", "2 cdas (20 g)"],
        ["Queso crema Dos Pinos Light", "1 cda (20 g)"],
        ["Leche de almendra", "1 taza (300 ml)"],
        ["Leche de coco de cartón (sin azúcar)", "1 taza (240 ml)"],
        ["Leche de coco de cartón (con azúcar)", "1 taza (240 ml)"],
        ["Leche de coco de lata", "2 cdas (30 ml)"],
        ["Leche de coco de lata light", "1/4 taza (60 ml)"]
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
        ["Leche entera", "1 taza (250 ml)"],
        ["Leche semidescremada (2 %)", "1 taza (250 ml)"],
        ["Leche descremada", "1 taza (250 ml)"],
        ["Yogurt 0 % grasa natural", "1/2 taza (200 ml)"],
        ["Yogurt 0 % grasa de sabor (con edulcorante)", "1/2 taza (200 ml)"],
        ["Yogurt griego natural Member's Selection", "1/2 taza (175 ml)"],
        ["Yogurt griego de sabor", "1/2 taza (175 ml)"],
        ["Yogurt natural Dos Pinos", "1/2 taza (165 ml)"],
        ["Yogurt de sabor con azúcar (batido o bebible)", "1/2 taza (165 ml)"],
        ["Helado Prote DP (chocolate, coco y otros sabores)", "4 cdas (70 g)"],
        ["Leche condensada", "5 cdas (75 g)"]
    ]
};

/* Alimentos de la tabla INISA/UCR 1984 (valores por 100 g de porción comestible). */
const FOOD_INISA = {"h":[["Arracache (INISA)","72 g"],["Camote (INISA)","52 g (≈1/3 unidad)"],["Ñame (INISA)","62 g"],["Ñampí (INISA)","67 g (≈1 unidad)"],["Papa (INISA)","84 g (≈1,5 unidades)"],["Raíz de chayote (INISA)","76 g"],["Yuca (INISA)","40 g"],["Arepa (INISA)","41 g (≈1/3 unidad)"],["Arroz crudo (INISA)","19 g (≈1,5 cdas)"],["Arroz frito (INISA)","56 g (≈2 cdas)"],["Avena (cruda) (INISA)","22,5 g (≈2 cdas)"],["Cebada (INISA)","20 g (≈1,5 cdas)"],["Corn flakes (INISA)","17,5 g"],["Galleta dulce (INISA)","20 g (≈3 unidades)"],["Galleta María (INISA)","22,5 g"],["Galleta soda (INISA)","21,5 g (≈6 unidades)"],["Harina de trigo (INISA)","19,5 g (≈1 cda)"],["Maicena (INISA)","17,5 g (≈1,5 cdas)"],["Maíz pelado (INISA)","19,5 g"],["Pan de rodaja blanco (INISA)","24,5 g (≈1 rebanada)"],["Pan de rodaja integral (INISA)","26 g (≈1 rebanada)"],["Pan francés (INISA)","30 g (≈1 pedazo)"],["Pasta cruda (INISA)","20,5 g (≈1 cda)"],["Tamal asado (INISA)","30 g (≈1/2 pedazo)"],["Tortilla de maíz (INISA)","35 g (≈1,5 unidades)"],["Plátano verde (INISA)","42 g"],["Puré de papa (INISA)","115 g (≈6 cdas)"],["Macarrones cocidos (INISA)","43 g (≈1 cda)"],["Gallo pinto (INISA)","60 g (≈1,5 cdas)"],["Frijol crudo (INISA)","24,5 g (≈3 cdas)"],["Arvejas secas (INISA)","24,5 g"],["Garbanzo crudo (INISA)","24,5 g"],["Lenteja cruda (INISA)","24,5 g"],["Gandul seco (INISA)","23,5 g"]],"bg":[["Pollo, muslo (INISA)","34 g"],["Pollo, pechuga (crudo) (INISA)","36 g"],["Res, carne magra (INISA)","33 g"],["Res, hígado (INISA)","35 g"],["Res, corazón (INISA)","41 g"],["Cerdo, hígado (INISA)","36 g"],["Venado asado (INISA)","23,5 g"],["Pescado fresco de mar (INISA)","35 g"],["Pescado de río (filete) (INISA)","38 g"],["Camarón fresco (INISA)","40 g (≈1 unidad)"],["Cangrejo / Langosta (INISA)","40 g"],["Calamares (INISA)","43 g"],["Bacalao seco (INISA)","8,5 g"],["Clara de huevo (INISA)","64 g (≈2 unidades)"],["Queso oreado semidescremado (INISA)","27,5 g"],["Casilán (INISA)","8 g"]],"mg":[["Pollo, tierno (INISA)","38 g"],["Res, molida / semigorda (INISA)","37 g"],["Res, lengua (INISA)","44 g"],["Ternera (INISA)","36 g"],["Cerdo, carne (INISA)","53 g"],["Conejo (INISA)","34 g"],["Atún en aceite (escurrido) (INISA)","29 g"],["Sardina en tomate (INISA)","37 g"],["Huevo de gallina (INISA)","62 g (≈1 unidad)"],["Yema de huevo (INISA)","44 g (≈2,5 unidades)"],["Chorizo (INISA)","44 g (≈1 pedazo)"],["Jamón de cerdo (INISA)","45 g"],["Mortadela (INISA)","47 g (≈1,5 rodajas)"],["Salchicha de res (INISA)","51 g (≈1,5 unidades)"],["Queso fresco (leche íntegra) (INISA)","40 g"],["Queso fresco semidescremado (INISA)","34 g"],["Queso duro (leche íntegra) (INISA)","25 g"],["Queso Kraft (INISA)","28 g (≈1 rodaja)"],["Requesón (INISA)","74 g (≈1,5 cdas)"],["Cuajada (INISA)","37 g"]],"g":[["Aguacate (INISA)","32 g (≈1/3 unidad)"],["Coco maduro (pulpa) (INISA)","18,5 g"],["Maní pelado (INISA)","10 g"],["Semilla de marañón (INISA)","12,5 g"],["Aceite vegetal / de palma (INISA)","5 g (≈1/2 cda)"],["Manteca de cerdo (INISA)","5 g (≈1/4 cda)"],["Manteca vegetal (INISA)","5 g (≈1/8 cda)"],["Mantequilla (INISA)","6 g (≈1/2 cda)"],["Margarina (INISA)","6 g (≈1/4 cda)"],["Mayonesa (INISA)","13,5 g (≈1/2 cda)"],["Tocino (INISA)","7,5 g"],["Chicharrones (INISA)","9 g"],["Natilla espesa (INISA)","13,5 g"],["Queso crema (INISA)","12 g"]],"v":[["Apio (INISA)","120 g"],["Ayote tierno (INISA)","91 g (≈1,5 pedazos)"],["Berenjena (INISA)","79 g"],["Berro (INISA)","125 g"],["Cebolla (INISA)","52 g (≈1 unidad)"],["Chayote (INISA)","83 g (≈1/3 unidad)"],["Chile dulce (INISA)","63 g (≈1,5 unidades)"],["Coliflor (INISA)","77 g"],["Espinaca (INISA)","100 g"],["Lechuga (INISA)","170 g (≈18,5 hojas)"],["Palmito (INISA)","96 g"],["Pepino (INISA)","145 g"],["Rábano (INISA)","100 g"],["Remolacha (INISA)","53 g"],["Repollo picado (INISA)","82 g (≈6 cdas)"],["Tomate (INISA)","110 g (≈1/2 unidad)"],["Vainicas (INISA)","76 g"],["Zanahoria (INISA)","53 g (≈1/2 unidad)"],["Hojas de mostaza / rábano (INISA)","105 g"],["Quelite de ayote (INISA)","145 g"],["Jugo de tomate (INISA)","115 g"]],"fr":[["Anona blanca (INISA)","60 g"],["Cereza (INISA)","100 g"],["Ciruela fresca (INISA)","125 g (≈2,5 unidades)"],["Durazno (INISA)","115 g (≈2,5 unidades)"],["Fresa (INISA)","175 g (≈16,5 unidades)"],["Grapefruit / Toronja (INISA)","155 g"],["Guayaba (INISA)","91 g (≈1,5 unidades)"],["Higo (INISA)","155 g (≈8,5 unidades)"],["Jocote maduro (INISA)","68 g (≈4,5 unidades)"],["Limón dulce (INISA)","215 g (≈2,5 unidades)"],["Mandarina (INISA)","140 g (≈2,5 unidades)"],["Mango maduro (INISA)","97 g (≈1,5 unidades)"],["Manzana de agua (INISA)","190 g (≈3,5 unidades)"],["Manzana rosa (INISA)","91 g"],["Marañón (fruta) (INISA)","130 g (≈2 unidades)"],["Melocotón / Durazno enlatado (INISA)","82 g"],["Nance (INISA)","105 g"],["Níspero (INISA)","140 g"],["Piña (INISA)","110 g (≈1,5 rodajas)"],["Tamarindo (INISA)","21 g"],["Uvas (INISA)","90 g (≈7,5 unidades)"],["Zapote (INISA)","48 g"],["Banano maduro (INISA)","59 g (≈1 unidad)"],["Guineo maduro (INISA)","55 g (≈1 unidad)"],["Plátano maduro (INISA)","46 g (≈1,5 rodajas)"],["Jugo de naranja (INISA)","150 g"],["Jugo de piña enlatado (INISA)","130 g"],["Jugo de manzana (INISA)","125 g"],["Agua de coco (INISA)","395 g"]],"l":[["Leche fluida de vaca (INISA)","230 g (≈1 vaso)"],["Leche descremada en polvo (INISA)","24,5 g (≈3 cdas)"],["Leche entera en polvo (INISA)","31 g (≈2 cdas)"],["Leche evaporada (INISA)","105 g (≈7,5 cdas)"],["Leche chocolatada (INISA)","110 g (≈1/2 caja)"],["Yogurt natural semidescremado (INISA)","230 g (≈12,5 cdas)"],["Leche condensada (INISA)","21,5 g (≈1 cda)"],["Helado de leche (INISA)","81 g"]]};
for (const k in FOOD_INISA) FOOD_CATALOG[k].push(...FOOD_INISA[k]);

/* Calibración de alimentos del catálogo cuya porción no cuadra con su valor real
   (mezclan grupos o se alejan mucho del promedio del grupo). Por porción listada:
   k = kcal reales, c/p/f = carbohidratos/proteína/grasa (g), pt = equivalencia en porciones (de 0,5 en 0,5).
   Valores de referencia USDA para la cantidad indicada en el catálogo. */
const FOOD_CALIBRATION = {
    "Nuggets de pollo Pipasa":   { k: 100, c: 5.6,  p: 5.6, f: 6,   pt: { h: 0.5, mg: 0.5, g: 0.5 } },
    "Queso ricotta":             { k: 70,  c: 1.2,  p: 4.5, f: 5.2, pt: { mg: 1 } },
    "Chocolate Dark 75% o más":  { k: 60,  c: 4.6,  p: 0.8, f: 4.3, pt: { h: 0.5, g: 0.5 } },
    "Miel":                      { k: 108, c: 29,   p: 0.1, f: 0,   pt: { h: 1.5 } },
    "Mermelada con azúcar":      { k: 70,  c: 17,   p: 0.1, f: 0,   pt: { h: 1 } },
    "Pasas":                     { k: 60,  c: 15.9, p: 0.6, f: 0.1, pt: { h: 1 } },
    "Leche condensada":          { k: 241, c: 40.7, p: 5.9, f: 6.5, pt: { l: 0.5, h: 2, g: 0.5 } },
    "Leche condensada (INISA)":  { k: 69,  c: 11.7, p: 1.7, f: 1.9, pt: { h: 0.5, g: 0.5 } },

    /* Etiqueta Dos Pinos (sabor chocolate, ½ taza = 63 g: 82 kcal) llevada a 70 g; cubre los demás sabores */
    "Helado Prote DP (chocolate, coco y otros sabores)": { k: 91, c: 11.1, p: 6.9, f: 2.2, pt: { l: 0.5, h: 0.5 } },
    /* Tabla nutricional de referencia por 100 g */
    "Torta de arroz":            { k: 295, c: 44,   p: 8.2, f: 9.5, pt: { h: 2.5, l: 0.5, g: 1 } },

    /* Pan Bimbo blanco: 2 rebanadas (62 g) = 146 kcal → 2 harinas */
    "Pan cuadrado blanco Bimbo":       { k: 146, c: 28.3, p: 5.1, f: 1.4, pt: { h: 2 } },
    /* Salmón cocido (30 g): más grasa que la pechuga → mitad baja y mitad media en grasa */
    "Salmón":                          { k: 62,  c: 0,    p: 6.6, f: 3.7, pt: { bg: 0.5, mg: 0.5 } },
    /* Delga-C ultra light: ~15 kcal por cucharada (15 g) */
    "Mayonesa Delga-C (ultra light)":  { k: 50,  c: 3,    p: 0,   f: 4.5, pt: { g: 1 } },

    /* Leches (250 ml) */
    "Leche entera":              { k: 157, c: 12.4, p: 8.1, f: 8.4, pt: { l: 1, g: 1 } },
    "Leche semidescremada (2 %)": { k: 128, c: 12.4, p: 8.2, f: 5,   pt: { l: 1, g: 0.5 } },
    "Leche descremada":          { k: 87,  c: 12.5, p: 8.6, f: 0.2, pt: { l: 1 } },

    /* Leche de coco: la de cartón es bebida (muy diluida); la de lata es para cocinar (muy grasosa) */
    "Leche de coco de cartón (sin azúcar)": { k: 45, c: 1,   p: 0,   f: 4.5, pt: { g: 1 } },
    "Leche de coco de cartón (con azúcar)": { k: 80, c: 7,   p: 0,   f: 5,   pt: { g: 1, h: 0.5 } },
    "Leche de coco de lata":                { k: 59, c: 0.8, p: 0.6, f: 6.4, pt: { g: 1.5 } },
    "Leche de coco de lata light":          { k: 50, c: 1,   p: 0.5, f: 5,   pt: { g: 1 } },

    /* Yogurts: natural (sin azúcar) y de sabor */
    "Yogurt 0 % grasa natural":                       { k: 112, c: 15.4, p: 11.4, f: 0.4, pt: { l: 1 } },
    "Yogurt 0 % grasa de sabor (con edulcorante)":    { k: 100, c: 14,   p: 10,   f: 0.4, pt: { l: 1 } },
    "Yogurt griego natural Member's Selection":       { k: 100, c: 6.4,  p: 17.4, f: 0.7, pt: { l: 0.5, bg: 1.5 } },
    "Yogurt griego de sabor":                         { k: 150, c: 18,   p: 14,   f: 2,   pt: { l: 1, bg: 1 } },
    "Yogurt natural Dos Pinos":                       { k: 101, c: 7.8,  p: 5.8,  f: 5.4, pt: { l: 1 } },
    "Yogurt de sabor con azúcar (batido o bebible)":  { k: 163, c: 30.7, p: 6.6,  f: 1.8, pt: { l: 0.5, h: 1.5 } },

    /* Chicharritos: de cerdo (proteína y grasa) o de harina/maíz (harina y grasa) */
    "Chicharritos Jacks de cerdo (chicharrón)":  { k: 82, c: 0, p: 9.2, f: 4.7, pt: { mg: 1 } },
    "Chicharritos de harina o maíz (snack)":     { k: 75, c: 9, p: 1,   f: 4,   pt: { h: 0.5, g: 1 } }
};

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

function updateFoodEntry(id, patch) {
    const entry = foodEntries().find(e => e.id === id);
    if (!entry) return;
    Object.assign(entry, patch);
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

/* Entradas con calorías propias: comida rápida ("rapida") y el día dado como volumen sucio ("libre") */
const FAST_GROUP = "rapida", FREE_GROUP = "libre";
const ENTRY_COLORS = { [FAST_GROUP]: "#e08a3c", [FREE_GROUP]: "#9b7fd4" };
const hasOwnKcal = e => typeof e.k === "number";
function entryKcal(e) {
    if (hasOwnKcal(e)) return e.p * e.k;
    const g = FOOD_GROUP[e.g];
    return g ? e.p * groupKcal(g) : 0;
}
const entryColor = e => (FOOD_GROUP[e.g] ? FOOD_GROUP[e.g].color : ENTRY_COLORS[e.g] || "#4aa8d8");

/* Equivalencia en porciones (de 0,5 en 0,5) de UNA unidad de comida rápida, a partir de sus macros:
   1) los carbohidratos van a Harinas;
   2) la proteína que queda, a Proteína: Media Grasa mientras la grasa alcance (queso, carne, pollo frito)
      y el resto a Baja Grasa;
   3) la grasa que sobra, a Grasas.
   Así una pizza, una hamburguesa o un sub reparten sus porciones en varios grupos. */
const half = x => Math.round(x * 2) / 2;
function fastPortions(c, p, f) {
    const h = half(c / 15);
    const prot = half(Math.max(0, p - 3 * h) / 7);
    const mg = Math.min(prot, half(Math.max(0, (f - h - prot) / 4)));
    const bg = prot - mg;
    const g = half(Math.max(0, f - h - mg * 5 - bg) / 5);
    const out = {};
    for (const [k, v] of [["h", h], ["bg", bg], ["mg", mg], ["g", g]]) if (v > 0) out[k] = v;
    return out;
}
/* Porciones de una entrada con calorías propias, por la cantidad registrada:
   la equivalencia guardada al registrar; si no tiene (registros anteriores), la del catálogo;
   y si el producto ya no está, el reparto aproximado. El "volumen sucio" no tiene porciones. */
function unitPortions(e) {
    if (e.pt && typeof e.pt === "object") return e.pt;
    if (e.g === FAST_GROUP) {
        const hit = FAST_FOOD_BY_KEY.get(e.n);
        if (hit && hit.item[7]) return hit.item[7];
        if (typeof e.mc === "number") return fastPortions(e.mc, e.mp || 0, e.mf || 0);
    }
    return {};
}
const entryPortions = e => Object.fromEntries(Object.entries(unitPortions(e)).map(([k, v]) => [k, v * e.p]));
/* Flechas de 1 en 1; las medias porciones se escriben (0,5 · 1,5 · 2,5…) */
const stepByOne = (q, dir, allowZero = false) => {
    const n = Math.round((q + dir) * 100) / 100;
    if (n >= 0.5) return n;
    return allowZero ? 0 : q;      /* al corregir algo ya agregado se puede bajar a 0 para quitarlo */
};
/* "2,5 harinas · 1 prot. MG · 1 grasa" */
const PORTION_SHORT = {
    h: ["harina", "harinas"], bg: ["prot. BG", "prot. BG"], mg: ["prot. MG", "prot. MG"], g: ["grasa", "grasas"],
    v: ["vegetal", "vegetales"], fr: ["fruta", "frutas"], l: ["lácteo", "lácteos"]
};
const portionsText = pt => Object.entries(pt).map(([k, v]) => `${fmtNum(v, 1)} ${PORTION_SHORT[k][v <= 1 ? 0 : 1]}`).join(" · ");

function foodTotals(entries) {
    const portions = {};
    let kcal = 0, c = 0, p = 0, f = 0;
    entries.forEach(e => {
        if (hasOwnKcal(e)) {
            kcal += e.p * e.k;
            c += e.p * (e.mc || 0);
            p += e.p * (e.mp || 0);
            f += e.p * (e.mf || 0);
            for (const [k, v] of Object.entries(entryPortions(e))) portions[k] = (portions[k] || 0) + v;
            return;
        }
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
    const dayGiven = entries.some(e => e.g === FREE_GROUP);

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
            <div class="food-bar-row">
                <div class="food-bar"><i class="${hasFood ? kcalStatus(t.kcal) : ""}" style="width:${pct}%"></i></div>
                <button class="food-done${dayGiven ? " on" : ""}" data-act="done" aria-label="${dayGiven ? "Quitar el día dado (volumen sucio)" : "Dar el día: completar las calorías que faltan como volumen sucio"}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>
                </button>
            </div>
            <div class="food-macros">
                <span>Carbohidratos <b>${fmtNum(t.c, 0)} / ${fmtNum(plan.macros.c, 0)} g</b></span>
                <span>Proteína <b>${fmtNum(t.p, 0)} / ${fmtNum(plan.macros.p, 0)} g</b></span>
                <span>Grasa <b>${fmtNum(t.f, 0)} / ${fmtNum(plan.macros.f, 0)} g</b></span>
            </div>
            <div class="food-plan-row">
                <button class="food-plan" data-act="goal" aria-label="Cambiar objetivo: ${GOALS[n.goal].short}">
                    <span><small>Objetivo</small><b>${GOALS[n.goal].short}</b></span><i aria-hidden="true">›</i>
                </button>
                <button class="food-plan" data-act="diet" aria-label="Cambiar dieta: ${DIETS[n.diet].short}">
                    <span><small>Dieta</small><b>${DIETS[n.diet].short}</b></span><i aria-hidden="true">›</i>
                </button>
            </div>
            <button class="food-plan" data-act="calib" aria-label="Calibración: ver, repetir o reiniciar el test TDEE">
                <span><small>Calibración</small><b>TDEE ${fmtNum(calcTDEE(n.profile).tdee, 0)} kcal</b></span><i aria-hidden="true">⚙</i>
            </button>
        </div>
        <div class="food-groups">${top}</div>
        <div class="food-groups">${chip(last)}${waterChip}</div>
        <button class="square-card add-square add-wide food-add" data-add="1"><span class="add-square-plus">+</span><small>Comida</small></button>
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

    const kcalOf = entryKcal;
    const rowHtml = e => {
        const color = entryColor(e);
        const isWater = e.g === "agua";
        return `<div class="food-row" style="--c:${color}">
            <span class="fr-dot"></span>
            <span class="fr-name">${esc(e.n)}<small>${e.ts ? fmtTime(e.ts) + " · " : ""}${esc(e.t)}${e.pt || e.g === FAST_GROUP ? " = " + esc(portionsText(entryPortions(e))) : ""}</small></span>
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
            /* La franja más reciente arriba (al mediodía: mediodía y luego mañana), y dentro, lo último primero */
            list = TIME_BANDS.slice().reverse().map(b => {
                const items = all.filter(e => bandOf(e.ts)?.k === b.k).sort((x, y) => y.ts - x.ts);
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
        else if (act.dataset.act === "goal") choosePlanOption("goal");
        else if (act.dataset.act === "diet") choosePlanOption("diet");
        else if (act.dataset.act === "calib") showTdeeResult({ calibrate: true });
        else if (act.dataset.act === "hist") openFoodHistory();
        else if (act.dataset.act === "done") giveTheDay();
        return;
    }

    const chip = e.target.closest(".food-chip, .food-add");
    if (!chip) return;
    if (chip.dataset.water) askWater();
    else openFoodPicker(chip.dataset.add ? null : chip.dataset.g);
});

/* ---------- agregar ---------- */

const FREQUENT_MIN = 4;                       /* "más de 3 veces" */
const FREQUENT_WINDOW = 3 * 24 * 3600 * 1000; /* 3 días sin agregarla → deja de ser frecuente */

/* Comidas agregadas más de 3 veces y usadas en los últimos 3 días, de la más usada a la menos */
function frequentFoods(now = Date.now()) {
    const stats = new Map();
    const log = (state.food && state.food.log) || {};
    for (const day in log) {
        const dayTs = parseKey(day).getTime() + 12 * 3600 * 1000;
        for (const e of log[day]) {
            if (!e.n || !(FOOD_GROUP[e.g] || (e.g === FAST_GROUP && FAST_FOOD_BY_KEY.has(e.n)))) continue;
            const key = e.g + "|" + e.n;
            const s = stats.get(key) || { g: e.g, n: e.n, count: 0, last: 0 };
            s.count++;
            s.last = Math.max(s.last, e.ts || dayTs);
            stats.set(key, s);
        }
    }
    return [...stats.values()]
        .filter(s => s.count >= FREQUENT_MIN && now - s.last <= FREQUENT_WINDOW)
        .sort((a, b) => b.count - a.count || b.last - a.last)
        .slice(0, 8)
        .map(s => s.g === FAST_GROUP
            ? { g: FAST_GROUP, fk: s.n }
            : { g: s.g, item: (FOOD_CATALOG[s.g] || []).find(i => i[0] === s.n) || [s.n, "1 porción"] });
}

function openFoodPicker(groupKey) {
    const keys = groupKey ? [groupKey] : FOOD_GROUPS.map(g => g.k);
    const picked = new Map();                 /* lo agregado en este menú (clave → { id, qty }): se pinta con el color de la app */
    const keyOf = v => v.g + "|" + (v.fk || v.item[0]);
    const asItem = (g, item) => ({ label: item[0], sub: item[1], value: { g, item } });
    const fastItem = key => {
        const { item } = FAST_FOOD_BY_KEY.get(key);
        return { label: key, sub: `1 ${item[1]} · ${fmtNum(item[3], 0)} kcal`, value: { g: FAST_GROUP, fk: key } };
    };

    const frequent = frequentFoods().filter(f => f.g === FAST_GROUP ? !groupKey : keys.includes(f.g));
    const groups = keys.map(k => ({
        title: groupKey ? null : FOOD_GROUP[k].name,
        items: FOOD_CATALOG[k].map(item => asItem(k, item))
    }));
    if (!groupKey) {
        FAST_FOOD.forEach(({ chain, items, super: market }) => groups.push({
            title: `${market ? "Supermercado" : "Comida rápida"} · ${chain}`,
            items: items.map(it => fastItem(`${chain} · ${it[0]}`))
        }));
    }
    if (frequent.length) groups.unshift({ title: "Frecuentes", items: frequent.map(f => f.g === FAST_GROUP ? fastItem(f.fk) : asItem(f.g, f.item)) });

    openPicker({
        title: groupKey ? FOOD_GROUP[groupKey].name : "Agregar comida",
        searchable: true,
        keepOpen: true,
        itemClass: v => picked.has(keyOf(v)) ? "picked" : "",
        groups,
        filters: [
            { label: "Todos" },
            ...(frequent.length ? [{ label: "Frecuentes", match: t => t === "Frecuentes" }] : []),
            ...(groupKey ? [] : FOOD_GROUPS.map(g => ({ label: g.name, match: t => t === g.name }))),
            ...(groupKey ? [] : [
                { label: "Comida rápida", match: t => t.startsWith("Comida rápida") },
                { label: "Supermercado", match: t => t.startsWith("Supermercado") }
            ])
        ],
        createLabel: "Porciones sueltas",
        onPick: (v, refresh) => {
            const key = keyOf(v);
            /* Si ya se agregó en este menú (y sigue registrado), se abre en esa cantidad para corregirla */
            let existing = picked.get(key) || null;
            if (existing && !foodEntries().some(e => e.id === existing.id)) { picked.delete(key); existing = null; }
            const done = res => {
                if (res) picked.set(key, res); else picked.delete(key);
                refresh();
            };
            if (v.g === FAST_GROUP) askFastFood(v.fk, done, existing);
            else askFoodAmount(v.g, v.item, done, existing);
        },
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

/* Cuadro de cantidad común. Con "existing" ({ id, qty }) abre en la cantidad ya agregada en este menú:
   se puede subir, bajar o dejar en 0 para quitarla. done({ id, qty }) al guardar, done(null) al quitar. */
function amountStepper({ title, subtitle, unit, existing, makeEntry, done }) {
    let qty = existing ? existing.qty : 1;
    const allowZero = !!existing;
    openStepper({
        title,
        subtitle,
        unit,
        doneLabel: existing ? "Guardar" : "Agregar",
        cancelLabel: "Cancelar",
        read: () => fmtNum(qty, 2),
        step: dir => { qty = stepByOne(qty, dir, allowZero); },
        onEdit: text => {
            const n = parseAmount(text, { max: 99 });
            if (n === null || n < 0 || (n === 0 && !allowZero)) return "x";
            qty = n;
            return "";
        },
        onClose: confirmed => {
            if (!confirmed) return;
            if (existing && qty === 0) {
                removeFoodEntry(existing.id);
                renderFood();
                if (done) done(null);
                return;
            }
            const entry = makeEntry(qty);
            if (existing) updateFoodEntry(existing.id, entry);
            else addFoodEntry(Object.assign({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, entry));
            renderFood();
            if (done) done({ id: existing ? existing.id : foodEntries().at(-1).id, qty });
        }
    });
}

function askFoodAmount(groupKey, item, done, existing) {
    const [name, equiv, unit, per] = item;
    const perUnit = per || 1;
    const unitName = unit || "porciones";
    const cal = FOOD_CALIBRATION[name] || null;    /* alimentos calibrados: calorías reales y porciones en varios grupos */
    amountStepper({
        title: name,
        subtitle: (unit ? equiv : `1 porción = ${equiv}`) + (cal ? `\n= ${fmtNum(cal.k, 0)} kcal · ${portionsText(cal.pt)}` : ""),
        unit: unitName,
        existing,
        done,
        makeEntry: qty => ({
            n: name,
            g: groupKey,
            p: qty * perUnit,
            q: qty,
            t: `${fmtNum(qty, 2)} ${qty === 1 ? unitName.replace(/(ciones|s)$/, m => m === "ciones" ? "ción" : "") : unitName}`,
            ...(cal ? { k: cal.k, mc: cal.c, mp: cal.p, mf: cal.f, pt: cal.pt } : {})
        })
    });
}

/* ---------- comida rápida ---------- */

function askFastFood(key, done, existing) {
    const { item } = FAST_FOOD_BY_KEY.get(key);
    const [name, unit, plural, kcal, c, p, f] = item;
    const pt = item[7] || fastPortions(c, p, f);
    amountStepper({
        title: name,
        subtitle: `1 ${unit} = ${fmtNum(kcal, 0)} kcal\n= ${portionsText(pt)}`,
        unit: plural,
        existing,
        done,
        makeEntry: qty => ({
            n: key, g: FAST_GROUP, p: qty, q: qty, k: kcal, mc: c, mp: p, mf: f, pt,
            t: `${fmtNum(qty, 2)} ${qty === 1 ? unit : plural}`
        })
    });
}

/* ---------- dar el día ----------
   Para días en que se come fuera de lo común y no se puede contar: completa las calorías
   que faltan para la meta con una entrada "Volumen sucio" (sin macros: no se conocen).
   Si ya se dio el día, el mismo botón permite quitarlo. */
async function giveTheDay() {
    const entries = foodEntries();
    const given = entries.find(e => e.g === FREE_GROUP);
    if (given) {
        const ok = await askConfirm({
            title: "Quitar el día dado",
            message: `Se quitarán las ${fmtNum(entryKcal(given), 0)} kcal de volumen sucio de este día.`,
            confirmLabel: "Quitar"
        });
        if (!ok) return;
        removeFoodEntry(given.id);
        renderFood();
        return;
    }
    const goal = nutritionPlan().kcal;
    const missing = Math.round(goal - foodTotals(entries).kcal);
    if (missing <= 0) {
        await showMessage({ title: "Meta alcanzada", message: "Ya llegaste a tu meta de calorías de este día." });
        return;
    }
    const ok = await askConfirm({
        title: "Dar el día",
        message: `Se sumarán ${fmtNum(missing, 0)} kcal como volumen sucio para completar tu meta de ${fmtNum(goal, 0)} kcal.\n\nÚsalo los días en que comes fuera de lo común y no puedes contar.`,
        confirmLabel: "Dar el día"
    });
    if (!ok) return;
    addFoodEntry({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        n: "Volumen sucio", g: FREE_GROUP, p: 1, k: missing,
        t: "Calorías que faltaban"
    });
    renderFood();
}
