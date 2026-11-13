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
        ["Cereal Trijuelas", "1/3 taza (17,5 g)"],
        ["Pan cuadrado blanco Bimbo", "1 rebanada (31 g)", "rebanadas", 1],
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
        ["Azúcar (blanca o morena)", "4 cdtas (16 g)"],
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
        ["Costilla de cerdo al horno o a la parrilla", "25 g (sin hueso)"],
        ["Costilla de cerdo en salsa BBQ", "35 g (sin hueso)"],
        ["Costilla de cerdo frita o en olla", "25 g (sin hueso)"],
        ["Costilla de res en olla o en sopa", "25 g (sin hueso)"],
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
        ["Leche de coco de lata light", "1/4 taza (60 ml)"],
        ["Chimichurri argentino (con aceite)", "1/2 cda (8 g)"],
        ["Crema para café Coffee-mate en polvo", "6 cdtas (16 g)"],
        ["Crema para café Coffee-mate líquida", "4 cdas (60 ml)"],
        ["Media crema Nestlé", "1 1/2 cdas (22 g)"],
        ["Crema dulce (para batir)", "1 cda (15 g)"]
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

/* Alimentos de la tabla INISA/UCR 1984 que no tienen par en el catálogo de arriba (los repetidos se quitaron:
   p. ej. el huevo queda solo como "Huevo (completo)"). La porción es la de INISA en gramos, con su equivalencia
   aproximada en tazas, cucharadas o unidades (medidas rasas). */
const FOOD_INISA = {"h":[["Arracache (INISA)","1/2 taza (72 g)"],["Ñame (INISA)","1/2 taza (62 g)"],["Ñampí (INISA)","1 unidad (67 g)"],["Raíz de chayote (INISA)","1/2 taza (76 g)"],["Arepa (INISA)","1/3 unidad (41 g)"],["Arroz crudo (INISA)","1 1/2 cdas (19 g)"],["Arroz frito (INISA)","1/3 taza (56 g)"],["Cebada (INISA)","1 1/2 cdas (20 g)"],["Galleta dulce (INISA)","3 unidades (20 g)"],["Harina de trigo (INISA)","2 1/2 cdas (19,5 g)"],["Maicena (INISA)","2 cdas (17,5 g)"],["Maíz pelado (INISA)","2 cdas (19,5 g)"],["Pan de rodaja integral (INISA)","1 rebanada (26 g)"],["Pan francés (INISA)","1 pedazo (30 g)"],["Pasta cruda (INISA)","3 cdas (20,5 g)"],["Tamal asado (INISA)","1/2 pedazo (30 g)"],["Tortilla de maíz (INISA)","1 1/2 unidades (35 g)"],["Plátano verde (INISA)","1/4 unidad (42 g)"],["Puré de papa (INISA)","1/2 taza (115 g)"],["Frijol crudo (INISA)","2 cdas (24,5 g)"],["Arvejas secas (INISA)","2 cdas (24,5 g)"],["Garbanzo crudo (INISA)","2 cdas (24,5 g)"],["Lenteja cruda (INISA)","2 cdas (24,5 g)"],["Gandul seco (INISA)","2 cdas (23,5 g)"]],"bg":[["Res, hígado (INISA)","1 trozo pequeño (35 g)"],["Res, corazón (INISA)","1 trozo pequeño (41 g)"],["Cerdo, hígado (INISA)","1 trozo pequeño (36 g)"],["Venado asado (INISA)","1 trozo pequeño (23,5 g)"],["Cangrejo / Langosta (INISA)","1/4 taza de carne (40 g)"],["Bacalao seco (INISA)","1 cda desmenuzado (8,5 g)"],["Queso oreado semidescremado (INISA)","1 rebanada (27,5 g)"],["Casilán (INISA)","1 cda (8 g)"]],"mg":[["Pollo, tierno (INISA)","1 trozo pequeño (38 g)"],["Res, lengua (INISA)","1 rebanada (44 g)"],["Ternera (INISA)","1 trozo pequeño (36 g)"],["Conejo (INISA)","1 trozo pequeño (34 g)"],["Yema de huevo (INISA)","2 1/2 unidades (44 g)"],["Chorizo (INISA)","1 pedazo (44 g)"],["Jamón de cerdo (INISA)","2 rebanadas (45 g)"],["Mortadela (INISA)","1 1/2 rodajas (47 g)"],["Salchicha de res (INISA)","1 1/2 unidades (51 g)"],["Queso Kraft (INISA)","1 rodaja (28 g)"],["Queso duro (leche íntegra) (INISA)","1 rebanada (25 g)"],["Cuajada (INISA)","2 1/2 cdas (37 g)"],["Requesón (INISA)","1/3 taza (74 g)"]],"g":[["Coco maduro (pulpa) (INISA)","1/4 taza rallado (18,5 g)"],["Manteca de cerdo (INISA)","1 cdta (5 g)"],["Manteca vegetal (INISA)","1 cdta (5 g)"],["Margarina (INISA)","1 cdta (6 g)"],["Mayonesa (INISA)","1 cda (13,5 g)"],["Tocino (INISA)","1 cda picado (7,5 g)"],["Chicharrones (INISA)","1 trozo pequeño (9 g)"],["Natilla espesa (INISA)","1 cda (13,5 g)"],["Queso crema (INISA)","1 cda (12 g)"]],"v":[["Apio (INISA)","1 taza picado (120 g)"],["Ayote tierno (INISA)","3/4 taza en cubos (91 g)"],["Berenjena (INISA)","1 taza en cubos (79 g)"],["Berro (INISA)","3 1/2 tazas (125 g)"],["Cebolla (INISA)","1/3 taza picada o 1 pequeña (52 g)"],["Chayote (INISA)","2/3 taza en cubos (83 g)"],["Chile dulce (INISA)","1/2 taza picado (63 g)"],["Coliflor (INISA)","3/4 taza (77 g)"],["Espinaca (INISA)","3 tazas cruda (100 g)"],["Lechuga (INISA)","3 1/2 tazas picada (170 g)"],["Palmito (INISA)","2/3 taza (96 g)"],["Pepino (INISA)","1 1/4 tazas en rodajas (145 g)"],["Rábano (INISA)","1 taza en rodajas (100 g)"],["Remolacha (INISA)","1/3 taza (53 g)"],["Repollo picado (INISA)","1 taza (82 g)"],["Tomate (INISA)","1 mediano (110 g)"],["Vainicas (INISA)","2/3 taza (76 g)"],["Zanahoria (INISA)","1/2 unidad o 1/2 taza rallada (53 g)"],["Hojas de mostaza / rábano (INISA)","2 tazas (105 g)"],["Quelite de ayote (INISA)","3 tazas crudo (145 g)"],["Jugo de tomate (INISA)","1/2 taza (115 ml)"]],"fr":[["Anona blanca (INISA)","1/4 taza de pulpa (60 g)"],["Grapefruit / Toronja (INISA)","1/2 unidad grande (155 g)"],["Higo (INISA)","8 unidades pequeñas (155 g)"],["Limón dulce (INISA)","2 1/2 unidades (215 g)"],["Mandarina (INISA)","2 1/2 unidades (140 g)"],["Manzana de agua (INISA)","3 1/2 unidades (190 g)"],["Manzana rosa (INISA)","2 unidades (91 g)"],["Marañón (fruta) (INISA)","2 unidades (130 g)"],["Melocotón / Durazno enlatado (INISA)","1/3 taza (82 g)"],["Nance (INISA)","3/4 taza (105 g)"],["Níspero (INISA)","1 unidad pequeña (140 g)"],["Tamarindo (INISA)","2 cdas de pulpa (21 g)"],["Zapote (INISA)","1/4 taza de pulpa (48 g)"],["Guineo maduro (INISA)","1 unidad (55 g)"],["Jugo de piña enlatado (INISA)","1/2 taza (130 ml)"]],"l":[["Leche descremada en polvo (INISA)","1/3 taza (24,5 g)"],["Leche entera en polvo (INISA)","1/4 taza (31 g)"],["Leche evaporada (INISA)","1/2 taza escasa (105 ml)"],["Leche chocolatada (INISA)","1/2 taza (110 ml)"],["Helado de leche (INISA)","1/2 taza (81 g)"]]};
for (const k in FOOD_INISA) FOOD_CATALOG[k].push(...FOOD_INISA[k]);

/* Calibración de alimentos del catálogo cuya porción no cuadra con su valor real
   (mezclan grupos o se alejan mucho del promedio del grupo). Por porción listada:
   k = kcal reales, c/p/f = carbohidratos/proteína/grasa (g), pt = equivalencia en porciones (de 0,5 en 0,5).
   Valores de referencia USDA para la cantidad indicada en el catálogo. */
const FOOD_CALIBRATION = {
    "Nuggets de pollo Pipasa":   { k: 100, c: 5.6,  p: 5.6, f: 6,   pt: { h: 0.5, mg: 0.5, g: 0.5 } },
    "Queso ricotta":             { k: 70,  c: 1.2,  p: 4.5, f: 5.2, pt: { mg: 1 } },
    "Chocolate Dark 75% o más":  { k: 60,  c: 4.6,  p: 0.8, f: 4.3, pt: { h: 0.5, g: 0.5 } },
    /* Azúcar: carbohidrato puro (15–16 g = 1 harina). 2 cdtas = 1/2 porción */
    "Azúcar (blanca o morena)":  { k: 62,  c: 16,   p: 0,   f: 0,   pt: { h: 1 } },
    "Miel":                      { k: 108, c: 29,   p: 0.1, f: 0,   pt: { h: 1.5 } },
    /* Cremas para café (etiquetas Nestlé). Las Coffee-mate traen azúcar del jarabe de maíz: grasa + 1/2 harina */
    "Crema para café Coffee-mate en polvo": { k: 87, c: 9.1, p: 0.3, f: 5.5, pt: { g: 1, h: 0.5 } },
    "Crema para café Coffee-mate líquida":  { k: 80, c: 10,  p: 0,   f: 4.4, pt: { g: 1, h: 0.5 } },
    "Media crema Nestlé":                   { k: 49, c: 0.8, p: 0.4, f: 5,   pt: { g: 1 } },
    "Crema dulce (para batir)":             { k: 50, c: 0.5, p: 0.2, f: 5.3, pt: { g: 1 } },
    "Mermelada con azúcar":      { k: 70,  c: 17,   p: 0.1, f: 0,   pt: { h: 1 } },
    "Pasas":                     { k: 60,  c: 15.9, p: 0.6, f: 0.1, pt: { h: 1 } },
    "Leche condensada":          { k: 241, c: 40.7, p: 5.9, f: 6.5, pt: { l: 0.5, h: 2, g: 0.5 } },

    /* Etiqueta Dos Pinos (sabor chocolate, ½ taza = 63 g: 82 kcal) llevada a 70 g; cubre los demás sabores */
    "Helado Prote DP (chocolate, coco y otros sabores)": { k: 91, c: 11.1, p: 6.9, f: 2.2, pt: { l: 0.5, h: 0.5 } },
    /* Tabla nutricional de referencia por 100 g */
    "Torta de arroz":            { k: 295, c: 44,   p: 8.2, f: 9.5, pt: { h: 2.5, l: 0.5, g: 1 } },

    /* Pan Bimbo blanco: 1 rebanada (31 g) = 73 kcal → 1 harina */
    "Pan cuadrado blanco Bimbo":       { k: 73,  c: 14.2, p: 2.6, f: 0.7, pt: { h: 1 } },
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

    /* Costillas (USDA, carne sin hueso, grasa incluida). La de res es la más grasosa. */
    "Costilla de cerdo al horno o a la parrilla": { k: 73,  c: 0,   p: 5.8, f: 5.4,  pt: { mg: 1 } },
    "Costilla de cerdo en salsa BBQ":             { k: 120, c: 4.5, p: 7.5, f: 7.8,  pt: { mg: 1, h: 0.5 } },
    "Costilla de cerdo frita o en olla":          { k: 99,  c: 0,   p: 7.3, f: 7.6,  pt: { mg: 1, g: 0.5 } },
    "Costilla de res en olla o en sopa":          { k: 118, c: 0,   p: 5.4, f: 10.5, pt: { mg: 1, g: 1 } },

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
    if (foodHistoryRedraw) foodHistoryRedraw();
}

/* ---------- historial (ventana emergente) ----------
   Sin grupo: todo el día. Con grupo (al tocar Harinas, Vegetales…): solo lo que suma porciones a ese grupo,
   con un botón para agregar más. Tocar una comida abre su cantidad para cambiarla (0 = quitarla). */

let foodHistoryRedraw = null;     /* el historial abierto se repinta cuando cambia la comida del día */

function openFoodHistory(groupKey = null) {
    let mode = "time";          /* "time" = por hora, "kcal" = por calorías */
    let desc = true;
    const group = groupKey ? FOOD_GROUP[groupKey] : null;
    const inGroup = e => !group || e.g === groupKey || (entryPortions(e)[groupKey] || 0) > 0;

    const { sheet } = openSheet("fh-sheet", `${group ? group.name : "Historial"}${foodDate ? "" : " de hoy"}`);
    const body = document.createElement("div");
    body.className = "fh-body";
    sheet.appendChild(body);

    const kcalOf = entryKcal;
    const rowHtml = e => {
        const color = entryColor(e);
        const isWater = e.g === "agua";
        const editable = e.g !== FREE_GROUP;
        return `<div class="food-row${editable ? " editable" : ""}" style="--c:${color}"${editable ? ` data-edit="${esc(e.id)}" role="button" tabindex="0" aria-label="Cambiar ${esc(e.n)}"` : ""}>
            <span class="fr-dot"></span>
            <span class="fr-name">${esc(e.n)}<small>${e.ts ? fmtTime(e.ts) + " · " : ""}${esc(e.t)}${e.pt || e.g === FAST_GROUP ? " = " + esc(portionsText(entryPortions(e))) : ""}</small></span>
            <span class="fr-kcal">${isWater ? fmtNum(e.p * WATER_ML, 0) + " ml" : fmtNum(kcalOf(e), 0) + " kcal"}</span>
            <button class="fr-del" data-id="${esc(e.id)}" aria-label="Quitar">✕</button>
        </div>`;
    };

    /* Por hora: todas las franjas del día, cada una con su total */
    const draw = () => {
        const all = foodEntries().filter(inGroup);
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
            <div class="picker-list fh-list">${list || `<p class="picker-empty">${group ? `Aún no hay ${group.name.toLowerCase()}.` : "Aún no hay comidas."}</p>`}</div>
            ${group ? `<button class="square-card add-square add-wide food-add fh-add" data-add-group="1"><span class="add-square-plus">+</span><small>${esc(group.name)}</small></button>` : ""}`;
    };
    foodHistoryRedraw = () => { if (body.isConnected) draw(); else foodHistoryRedraw = null; };

    const editRow = row => {
        const entry = foodEntries().find(x => x.id === row.dataset.edit);
        if (entry) editFoodEntry(entry);
    };
    body.addEventListener("click", e => {
        const t = e.target.closest("button");
        if (!t) {
            const row = e.target.closest(".food-row[data-edit]");
            if (row) editRow(row);
            return;
        }
        if (t.dataset.mode) { mode = t.dataset.mode; draw(); }
        else if (t.dataset.order) { desc = !desc; draw(); }
        else if (t.dataset.addGroup) openFoodPicker(groupKey);
        else if (t.dataset.id) { removeFoodEntry(t.dataset.id); renderFood(); }
    });
    body.addEventListener("keydown", e => {
        const row = e.target.closest && e.target.closest(".food-row[data-edit]");
        if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); editRow(row); }
    });

    draw();
}

/* Abre la cantidad de una comida ya registrada para cambiarla */
function editFoodEntry(e) {
    if (e.g === "agua") { askWater({ id: e.id, qty: e.p }); return; }
    if (e.g === FAST_GROUP) {
        if (FAST_FOOD_BY_KEY.has(e.n)) askFastFood(e.n, null, { id: e.id, qty: e.q ?? e.p });
        return;
    }
    if (!FOOD_GROUP[e.g]) return;
    const item = (FOOD_CATALOG[e.g] || []).find(i => i[0] === e.n) || [e.n, "1 porción"];
    askFoodAmount(e.g, item, null, { id: e.id, qty: e.q ?? Math.round(e.p / (item[3] || 1) * 100) / 100 });
}

/* existing ({ id, qty }): cambiar un agua ya registrada (0 = quitarla) */
function askWater(existing) {
    let qty = existing ? existing.qty : 1;
    openStepper({
        title: "Agua",
        subtitle: `1 vaso = ${WATER_ML} ml`,
        unit: "vasos",
        doneLabel: existing ? "Guardar" : "Agregar",
        cancelLabel: "Cancelar",
        read: () => fmtNum(qty, 2),
        step: dir => { qty = existing ? stepByOne(qty, dir, true) : Math.max(1, Math.round((qty + dir) * 100) / 100); },
        onEdit: text => {
            const v = parseAmount(text, { max: 40 });
            if (v === null || v < 0 || (v === 0 && !existing)) return "x";
            qty = v;
            return "";
        },
        onClose: confirmed => {
            if (!confirmed) return;
            const t = `${fmtNum(qty, 2)} ${qty === 1 ? "vaso" : "vasos"} (${fmtNum(qty * WATER_ML, 0)} ml)`;
            if (existing && qty === 0) removeFoodEntry(existing.id);
            else if (existing) updateFoodEntry(existing.id, { p: qty, t });
            else addFoodEntry({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), n: "Agua", g: "agua", p: qty, t });
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
    else if (chip.dataset.add) openFoodPicker(null);
    else openFoodHistory(chip.dataset.g);      /* un grupo: lo que llevas de ese grupo, para cambiarlo o agregar más */
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
/* unitOne: la unidad en singular, para 1 o menos ("1 rebanada", "2 rebanadas") */
function amountStepper({ title, subtitle, unit, unitOne, existing, makeEntry, done }) {
    let qty = existing ? existing.qty : 1;
    const allowZero = !!existing;
    openStepper({
        title,
        subtitle,
        unit: () => (unitOne && qty > 0 && qty <= 1 ? unitOne : unit),
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
        unitOne: unit ? unit.replace(/s$/, "") : "porción",   /* latas, scoops, rebanadas */
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
        unitOne: unit,
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
