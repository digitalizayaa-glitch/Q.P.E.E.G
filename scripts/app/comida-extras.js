"use strict";

/* =====================================================================
   Fibra, azúcar añadido, sodio y edulcorantes
   Por unidad registrada (la porción del catálogo, el envase o la pieza de comida rápida):
   [fibra g, sodio mg, azúcar añadido g, edulcorante (porciones)].
   - Catálogo: valores por alimento (USDA FoodData Central / INCAP para lo natural; etiquetas de Costa Rica
     cuando se conocen: Coronado Nutritiva, Bimbo). Sodio de lo cocinado en casa con su sal habitual.
   - Lo que no está en la tabla usa el promedio de su grupo.
   - Comida rápida, supermercado y bebidas: estimado desde sus calorías y carbohidratos, por tipo de producto
     (pizza, hamburguesa, pollo frito, papas, postre, refresco…), con las tablas de las cadenas como referencia.
   Edulcorante: 1 = una porción de un producto endulzado con sucralosa, stevia, aspartame, acesulfame…
   ===================================================================== */

/* promedio por porción de cada grupo (lo que no está en la tabla) */
const EXTRA_GROUP = {
    h: [1, 100, 0, 0], bg: [0, 70, 0, 0], mg: [0, 90, 0, 0], g: [0, 30, 0, 0],
    v: [2, 25, 0, 0], fr: [2, 2, 0, 0], l: [0, 110, 0, 0]
};

const EXTRA_BY_NAME = {
    /* ---- Harinas ---- */
    "Arroz blanco": [0.3, 120, 0, 0], "Arroz integral / Lentejas": [2.5, 100, 0, 0],
    "Frijol entero o molido": [4.5, 200, 0, 0], "Gallo pinto / Yuca": [2.5, 150, 0, 0],
    "Garbanzo cocido": [3.8, 120, 0, 0], "Garbanzo enlatado": [4, 250, 0, 0],
    "Pasta (varias)": [0.9, 60, 0, 0], "Canelón": [0.9, 5, 0, 0],
    "Canelones de queso con salsa de tomate": [1.2, 320, 1.5, 0], "Canelones de atún y huevo": [1, 300, 1, 0],
    "Canelones de carne molida y huevo": [1.2, 300, 1, 0],
    "Papa / Camote hervido": [1.8, 60, 0, 0], "Papa / Camote horneado": [2, 60, 0, 0],
    "Picadillo de papa con carne molida": [1.8, 330, 0, 0], "Picadillo de papa con carne mechada": [1.8, 320, 0, 0],
    "Ensalada fría de caracolitos con atún y mayonesa": [1, 360, 1, 0],
    "Ayote sazón / Calabaza": [2.5, 5, 0, 0], "Tiquizque": [2, 10, 0, 0], "Plátano maduro": [1, 2, 0, 0],
    "Patacón casero (frito)": [1.2, 120, 0, 0], "Patacones de paquete (prefritos, al horno o air fryer)": [1, 60, 0, 0],
    "Patacones de paquete (prefritos, vueltos a freír)": [1, 70, 0, 0],
    "Patacones o tajadas de plátano de bolsa (snack)": [1.4, 150, 0.5, 0],
    "Elote / Maíz dulce": [2.3, 15, 0, 0], "Quinoa": [1.8, 5, 0, 0], "Avena / Nestum / Granola": [2, 10, 1.5, 0],
    "Nochis (crudo)": [1, 100, 0, 0],   /* sin datos propios: el promedio de las harinas */
    "Cereal Allinklusive ZERO": [2.5, 80, 0, 1], "Cereal (Cheerios, Zucaritas…)": [1.2, 110, 6, 0],
    "Cereal Trijuelas": [1, 90, 5, 0],
    "Pan cuadrado blanco Bimbo": [0.8, 140, 2, 0], "Pan / Bollitos Ruiseñor": [0.8, 160, 2, 0],
    "Pan Thins Bimbo": [2.5, 180, 2, 0], "Pan baguette": [0.8, 200, 0.5, 0], "Pan hamburguesa artesano": [0.8, 170, 2, 0],
    "Rapiditas de Bimbo (Med)": [1, 250, 0.5, 0], "Tortilla Misión casera": [0.8, 230, 0.5, 0],
    "Tortilla chalupa / taco Imasa": [1.6, 60, 0, 0], "Tortiricas o Fogón": [1.6, 80, 0, 0],
    "Galleta-arroz Bioland / Bicentury": [0.4, 20, 0, 0], "Galleta-arroz Sanissimo": [0.5, 30, 0, 0],
    "Galleta soda / María / Rice crispy": [0.5, 150, 2, 0], "Harina de maíz (Juana / Maseca)": [1.8, 2, 0, 0],
    "Mezcla pancakes Tosh": [1.2, 230, 1, 0],
    "Azúcar (blanca o morena)": [0, 0, 16, 0], "Miel": [0, 1, 17, 0], "Mermelada con azúcar": [0.3, 8, 15, 0],
    "Pasas": [0.8, 2, 0, 0],
    /* bebida de cacao "0 % azúcar": suelen endulzarse con sucralosa */
    "Cocoa 0% azúcar": [2, 40, 0, 1],
    "Johnny's Chocolate (polvo)": [1, 20, 17, 0],
    "Torta de arroz": [0.8, 200, 3, 0],
    "Tamal de cerdo": [4, 650, 0, 0], "Tamal de frijol": [7, 550, 0, 0], "Tamal asado": [1.5, 200, 12, 0], "Chicharritos de harina o maíz (snack)": [0.5, 180, 0.3, 0],
    "Palomitas simples (de aire, sin aceite)": [3.5, 2, 0, 0], "Palomitas de cine": [3.3, 300, 0, 0],
    "Palomitas con sal y mantequilla moderada": [3.4, 250, 0, 0],
    "Arracache (INISA)": [1.5, 20, 0, 0], "Ñame (INISA)": [2, 5, 0, 0], "Ñampí (INISA)": [1.5, 10, 0, 0],
    "Raíz de chayote (INISA)": [1.5, 5, 0, 0], "Arepa (INISA)": [1, 150, 4, 0], "Arroz crudo (INISA)": [0.3, 1, 0, 0],
    "Arroz frito (INISA)": [0.5, 250, 0, 0], "Cebada (INISA)": [3, 2, 0, 0], "Galleta dulce (INISA)": [0.4, 60, 6, 0],
    "Harina de trigo (INISA)": [0.5, 0, 0, 0], "Maicena (INISA)": [0.2, 2, 0, 0], "Maíz pelado (INISA)": [1.5, 5, 0, 0],
    "Pan de rodaja integral (INISA)": [2, 130, 2, 0], "Pan francés (INISA)": [0.8, 180, 0.5, 0],
    "Pasta cruda (INISA)": [0.6, 1, 0, 0], "Tortilla de maíz (INISA)": [2, 15, 0, 0],
    "Plátano verde (INISA)": [1, 2, 0, 0], "Puré de papa (INISA)": [1.5, 250, 0, 0], "Frijol crudo (INISA)": [4, 3, 0, 0],
    "Arvejas secas (INISA)": [5, 4, 0, 0], "Garbanzo crudo (INISA)": [4, 6, 0, 0], "Lenteja cruda (INISA)": [2.8, 2, 0, 0],
    "Gandul seco (INISA)": [3.5, 4, 0, 0],
    /* ---- Proteína baja en grasa ---- */
    "Pechuga de pollo": [0, 22, 0, 0], "Salmón": [0, 18, 0, 0], "Muslo deshuesado": [0, 25, 0, 0],
    "Beef steak / Molida res 10%": [0, 15, 0, 0], "Molida res premium 5%": [0, 18, 0, 0], "Lomito / Solomillo": [0, 15, 0, 0],
    "Chuleta ahumada": [0, 300, 0, 0], "Pescado blanco (corvina, tilapia)": [0, 25, 0, 0], "Trucha": [0, 15, 0, 0],
    "Calamar": [0, 18, 0, 0], "Camarón cocido": [0, 110, 0, 0], "Clara de huevo": [0, 110, 0, 0],
    "Clara pasteurizada": [0, 140, 0, 0], "Jamón de pavo o light": [0, 450, 0.5, 0], "Queso cottage": [0, 180, 0, 0],
    "Queso ricotta": [0, 35, 0, 0], "String cheese light": [0, 200, 0, 0],
    "Atún Sabemas aceite": [0, 100, 0, 0], "Atún Sabemas / Member agua": [0, 100, 0, 0], "Atún Pronto aceite": [0, 100, 0, 0],
    "Atún Suli en agua": [0, 110, 0, 0], "Atún Suli en aceite": [0, 100, 0, 0], "Sardimar Funcional": [0, 110, 0, 0],
    "Sardina salsa-tomate": [0.2, 150, 0.5, 0], "Sardina light / Tesoro / Calvo": [0, 120, 0, 0],
    /* whey: 1 scoop (3 porciones) = 1 porción con edulcorante */
    "Whey protein": [0, 45, 0, 1 / 3],
    "Res, hígado (INISA)": [0, 25, 0, 0], "Res, corazón (INISA)": [0, 25, 0, 0], "Cerdo, hígado (INISA)": [0, 30, 0, 0],
    "Venado asado (INISA)": [0, 15, 0, 0], "Cangrejo / Langosta (INISA)": [0, 150, 0, 0], "Bacalao seco (INISA)": [0, 300, 0, 0],
    "Queso oreado semidescremado (INISA)": [0, 250, 0, 0], "Casilán (INISA)": [0, 40, 0, 0],
    /* ---- Proteína media grasa ---- */
    "Huevo (completo)": [0, 70, 0, 0], "Carne de res (+15% grasa)": [0, 18, 0, 0], "Cerdo (chuleta / beef steak)": [0, 18, 0, 0],
    "Carne mechada (en salsa)": [0.2, 120, 0, 0], "Pollo en salsa de coco (presa de alita)": [0.2, 80, 0, 0], "Costilla de cerdo al horno o a la parrilla": [0, 25, 0, 0],
    "Costilla de cerdo en salsa BBQ": [0.1, 180, 3.5, 0], "Costilla de cerdo frita o en olla": [0, 40, 0, 0],
    "Costilla de res en olla o en sopa": [0, 90, 0, 0], "Tocineta": [0, 220, 0, 0], "Salchicha de pavo": [0, 450, 0.5, 0],
    "Nuggets de pollo Pipasa": [0.3, 230, 0, 0], "Queso (Turrialba, semiduro, fresco, mozzarella)": [0, 170, 0, 0],
    "Mozzarella Great Value Low skin": [0, 170, 0, 0], "Queso Delactomy rallado": [0, 180, 0, 0],
    "Queso palmito": [0, 190, 0, 0],
    "Queso Turrialba del Prado": [0, 150, 0, 0], "Queso Dos Pinos 50%+ proteína": [0, 200, 0, 0],
    "String cheese (stick)": [0, 200, 0, 0], "Chicharritos Jacks de cerdo (chicharrón)": [0, 170, 0, 0],
    "Atún Member Selection": [0, 100, 0, 0], "Torta Beef Angus MS": [0, 60, 0, 0],
    "Pollo, tierno (INISA)": [0, 25, 0, 0], "Res, lengua (INISA)": [0, 30, 0, 0], "Ternera (INISA)": [0, 30, 0, 0],
    "Conejo (INISA)": [0, 15, 0, 0], "Yema de huevo (INISA)": [0, 20, 0, 0], "Chorizo (INISA)": [0, 550, 0, 0],
    "Jamón de cerdo (INISA)": [0, 550, 0.5, 0], "Mortadela (INISA)": [0, 560, 0.5, 0], "Salchicha de res (INISA)": [0, 520, 0.5, 0],
    "Queso Kraft (INISA)": [0, 400, 0, 0], "Queso duro (leche íntegra) (INISA)": [0, 400, 0, 0], "Cuajada (INISA)": [0, 90, 0, 0],
    "Requesón (INISA)": [0, 240, 0, 0],
    /* ---- Grasas ---- */
    "Aceite (oliva, coco, canola…)": [0, 0, 0, 0], "Aguacate / Aceitunas": [1.5, 100, 0, 0],
    "Maní natural o con sal": [0.7, 30, 0, 0], "Mantequilla de maní Jif": [0.5, 35, 0.5, 0],
    "Mantequilla de maní Member's Selection": [0.5, 30, 0.3, 0], "Mantequilla de almendra": [0.8, 1, 0, 0],
    "Mantequilla normal": [0, 40, 0, 0], "Mantequilla Light Dos Pinos": [0, 60, 0, 0], "Almendra / Marañón": [0.8, 1, 0, 0],
    "Nuez / Pecana": [0.5, 0, 0, 0], "Pistacho / Coco rallado": [1, 1, 0, 0], "Semilla de calabaza / girasol": [0.5, 1, 0, 0],
    "Chía / Linaza": [3.4, 2, 0, 0], "Chocolate Dark 75% o más": [1, 2, 2, 0],
    "Chips de chocolate / Granola Keto": [1.5, 10, 0, 0.5], "Natilla Light Dos Pinos": [0, 40, 0, 0],
    "Mayonesa Delga-C (ultra light)": [0, 330, 0.5, 0], "Mayonesa Light Helmans": [0, 160, 0.5, 0],
    "Queso crema Dos Pinos Light": [0, 80, 0, 0], "Leche de almendra": [0.6, 180, 0, 0],
    "Leche de coco de cartón (sin azúcar)": [0, 45, 0, 0], "Leche de coco de cartón (con azúcar)": [0, 45, 6, 0],
    "Leche de coco de lata": [0, 5, 0, 0], "Leche de coco de lata light": [0, 10, 0, 0],
    "Chimichurri argentino (con aceite)": [0.1, 40, 0, 0], "Crema para café Coffee-mate en polvo": [0, 20, 5, 0],
    "Crema para café Coffee-mate líquida": [0, 40, 10, 0], "Media crema Nestlé": [0, 10, 0, 0], "Crema dulce (para batir)": [0, 5, 0, 0],
    "Coco maduro (pulpa) (INISA)": [1.7, 4, 0, 0], "Manteca de cerdo (INISA)": [0, 0, 0, 0], "Manteca vegetal (INISA)": [0, 0, 0, 0],
    "Margarina (INISA)": [0, 45, 0, 0], "Mayonesa (INISA)": [0, 85, 0, 0], "Tocino (INISA)": [0, 130, 0, 0],
    "Chicharrones (INISA)": [0, 100, 0, 0], "Natilla espesa (INISA)": [0, 8, 0, 0], "Queso crema (INISA)": [0, 40, 0, 0],
    /* ---- Vegetales ---- */
    "Vegetales frescos (ensalada)": [2, 20, 0, 0], "Vegetales hervidos / cocidos": [2.2, 30, 0, 0],
    "Chimichurri tico (tomate, cebolla, culantro, limón)": [1, 150, 0, 0],
    "Apio (INISA)": [1.9, 95, 0, 0], "Ayote tierno (INISA)": [1, 2, 0, 0], "Berenjena (INISA)": [2.4, 2, 0, 0],
    "Berro (INISA)": [0.6, 50, 0, 0], "Cebolla (INISA)": [0.9, 2, 0, 0], "Chayote (INISA)": [1.4, 2, 0, 0],
    "Chile dulce (INISA)": [1.3, 3, 0, 0], "Coliflor (INISA)": [1.5, 23, 0, 0], "Espinaca (INISA)": [2.2, 79, 0, 0],
    "Lechuga (INISA)": [2.2, 15, 0, 0], "Palmito (INISA)": [2.3, 400, 0, 0], "Pepino (INISA)": [0.7, 3, 0, 0],
    "Rábano (INISA)": [1.6, 39, 0, 0], "Remolacha (INISA)": [1.5, 41, 0, 0], "Repollo picado (INISA)": [2, 15, 0, 0],
    "Tomate (INISA)": [1.3, 5, 0, 0], "Vainicas (INISA)": [2, 5, 0, 0], "Zanahoria (INISA)": [1.5, 37, 0, 0],
    "Hojas de mostaza / rábano (INISA)": [3, 20, 0, 0], "Quelite de ayote (INISA)": [2, 5, 0, 0],
    "Jugo de tomate (INISA)": [0.5, 280, 0, 0],
    /* ---- Frutas ---- */
    "Banano": [1.8, 1, 0, 0], "Manzana / Durazno": [2.4, 1, 0, 0], "Naranja": [3, 0, 0, 0], "Pera": [3.1, 1, 0, 0],
    "Ciruela": [1.8, 0, 0, 0], "Fresa / Carambola": [3.8, 2, 0, 0], "Piña": [1.7, 1, 0, 0], "Sandía": [1.1, 3, 0, 0],
    "Melón": [2.2, 40, 0, 0], "Uva / Guayaba": [2.5, 2, 0, 0], "Mango": [1.8, 1, 0, 0], "Papaya": [3, 14, 0, 0],
    "Kiwi": [3, 3, 0, 0], "Arándanos": [2.4, 1, 0, 0], "Frambuesa": [7, 1, 0, 0], "Mora": [2.6, 0, 0, 0],
    "Granadilla": [4.4, 18, 0, 0], "Cas / Cereza": [2.5, 0, 0, 0], "Guanábana": [3.1, 13, 0, 0], "Dátil": [1.6, 0, 0, 0],
    "Mamón chino / Jocote": [1.5, 5, 0, 0], "Mamoncillo": [1, 4, 0, 0],
    "Jugo 100% de naranja": [0.4, 2, 0, 0], "Jugo 100% de manzana": [0.3, 5, 0, 0], "Agua de pipa": [0.3, 315, 0, 0],
    "Mermelada St-Dalfour": [0.4, 0, 0, 0],
    "Anona blanca (INISA)": [2.6, 5, 0, 0], "Grapefruit / Toronja (INISA)": [2.5, 0, 0, 0], "Higo (INISA)": [4.5, 2, 0, 0],
    "Limón dulce (INISA)": [3, 2, 0, 0], "Mandarina (INISA)": [2.5, 3, 0, 0], "Manzana de agua (INISA)": [1.5, 2, 0, 0],
    "Manzana rosa (INISA)": [1, 0, 0, 0], "Marañón (fruta) (INISA)": [1.5, 9, 0, 0],
    "Melocotón / Durazno enlatado (INISA)": [1, 5, 7, 0], "Nance (INISA)": [5, 3, 0, 0], "Níspero (INISA)": [7, 17, 0, 0],
    "Tamarindo (INISA)": [1.1, 6, 0, 0], "Zapote (INISA)": [2.6, 4, 0, 0], "Guineo maduro (INISA)": [1.4, 1, 0, 0],
    "Jugo de piña enlatado (INISA)": [0.3, 3, 0, 0],
    /* ---- Lácteos ---- */
    "Leche entera": [0, 105, 0, 0], "Leche semidescremada (2 %)": [0, 110, 0, 0],
    "Leche semidescremada 1,5 % (Coronado Nutritiva)": [0, 116, 0, 0], "Leche descremada": [0, 110, 0, 0],
    "Yogurt 0 % grasa natural": [0, 120, 0, 0], "Yogurt 0 % grasa de sabor (con edulcorante)": [0, 110, 0, 1],
    "Yogurt griego natural Member's Selection": [0, 60, 0, 0], "Yogurt griego de sabor": [0, 60, 10, 0],
    "Yogurt natural Dos Pinos": [0, 100, 0, 0], "Yogurt de sabor con azúcar (batido o bebible)": [0, 100, 20, 0],
    /* Helado Prote: sin azúcar añadida, endulzado (sucralosa) */
    "Helado Prote DP (chocolate, coco y otros sabores)": [1, 70, 0, 1], "Leche condensada": [0, 95, 30, 0],
    "Leche descremada en polvo (INISA)": [0, 130, 0, 0], "Leche entera en polvo (INISA)": [0, 115, 0, 0],
    "Leche evaporada (INISA)": [0, 110, 0, 0], "Leche chocolatada (INISA)": [0.5, 65, 5, 0], "Helado de leche (INISA)": [0.5, 65, 14, 0]
};

/* Comida rápida, supermercado y bebidas por tipo: fibra por g de carbohidrato, sodio por kcal (mg),
   fracción de los carbohidratos que es azúcar añadido. El primer tipo cuyo patrón calce gana. */
const EXTRA_FAST_TYPES = [
    /* bebidas sin azúcar o con menos azúcar (endulzadas) */
    { re: /zero|sin azúcar|sugarfree|cero azúcar|pepsi black|light \(con endulzante\)|arnold palmer lite|^sprite$|^fresca|té negro melocotón|fresh cítricos|hawaiian punch/i,
      fb: 0, na: 0, az: 1, ed: 1 },
    { re: /natural \(sin azúcar añadida\)/i, fb: 0.04, na: 0.15, az: 0, ed: 0 },
    /* fresco natural de restaurante: fruta con agua y algo de azúcar */
    { re: /bebida natural/i, fb: 0.01, na: 0.1, az: 0.5, ed: 0 },
    { re: /ponche de leche/i, fb: 0, na: 0.8, az: 0.7, ed: 0 },
    { re: /gatorade|powerade/i, fb: 0, na: 1.9, az: 1, ed: 0 },
    { re: /red bull|monster/i, fb: 0, na: 1.3, az: 1, ed: 0 },
    { re: /néctar/i, fb: 0.01, na: 0.25, az: 0.75, ed: 0 },
    { drink: true, fb: 0, na: 0.3, az: 1, ed: 0 },
    /* postres y dulces */
    { re: /^shake/i, fb: 0.01, na: 0.5, az: 0.7, ed: 0 },
    { re: /breadsticks|cheesesticks|jalapeñosticks|pepperonisticks|pan de ajo/i, fb: 0.04, na: 1.8, az: 0.03, ed: 0 },
    { re: /^alitas$/i, fb: 0, na: 3, az: 0, ed: 0 },
    { re: /spaghetti|calzone/i, fb: 0.06, na: 1.8, az: 0.06, ed: 0 },
    { re: /sundae|mcflurry|frosty|pie de manzana|galleta de chocolate|cupcake|honey-butter/i, fb: 0.02, na: 0.6, az: 0.65, ed: 0 },
    { re: /hotcakes/i, fb: 0.03, na: 0.9, az: 0.45, ed: 0 },
    { chain: /^Chocolates$/, fb: 0.035, na: 0.35, az: 0.88, ed: 0 },
    { re: /integral|ajonjolí/i, chain: /^Galletas$/, fb: 0.12, na: 1.4, az: 0.12, ed: 0 },
    { re: /soda|ritz|club/i, chain: /^Galletas$/, fb: 0.04, na: 2, az: 0.08, ed: 0 },
    { re: /maría/i, chain: /^Galletas$/, fb: 0.03, na: 0.9, az: 0.3, ed: 0 },
    { chain: /^Galletas$/, fb: 0.025, na: 0.8, az: 0.5, ed: 0 },
    /* snacks */
    { re: /maní/i, fb: 0.67, na: 1, az: 0, ed: 0 },
    { re: /cheetos|bolitas|quesitos|palitos de queso/i, fb: 0.03, na: 1.4, az: 0.03, ed: 0 },
    { re: /pringles/i, fb: 0.05, na: 1, az: 0.02, ed: 0 },
    { chain: /^Snacks/, fb: 0.08, na: 1.1, az: 0.03, ed: 0 },
    /* acompañamientos */
    { re: /papas|aros de cebolla/i, fb: 0.09, na: 0.8, az: 0, ed: 0 },
    { re: /puré con gravy/i, fb: 0.06, na: 4.4, az: 0.05, ed: 0 },
    { re: /ensalada de repollo/i, fb: 0.2, na: 1, az: 0.6, ed: 0 },
    { re: /biscuit/i, fb: 0.03, na: 3, az: 0.1, ed: 0 },
    { re: /breadstick|crazy bread/i, fb: 0.05, na: 1.8, az: 0.05, ed: 0 },
    { re: /crazy sauce/i, fb: 0.1, na: 8, az: 0.6, ed: 0 },
    { re: /salsa de ajo/i, fb: 0, na: 2, az: 0, ed: 0 },
    /* platos */
    { re: /pizza/i, fb: 0.06, na: 2.2, az: 0.07, ed: 0 },
    { re: /nuggets|chicken fries|tender|tira de pollo/i, fb: 0.05, na: 2, az: 0, ed: 0 },
    { chain: /^(KFC|Popeyes|Church's|Rostipollos)/, re: /pechuga|muslo|pierna|ala|pollo/i, fb: 0.05, na: 2.6, az: 0.02, ed: 0 },
    { chain: /^Taco Bell$/, fb: 0.15, na: 2, az: 0.05, ed: 0 },
    { re: /teriyaki/i, fb: 0.08, na: 2.4, az: 0.3, ed: 0 },
    { chain: /^Subway/, fb: 0.1, na: 2.4, az: 0.12, ed: 0 },
    { fb: 0.06, na: 1.6, az: 0.15, ed: 0 }   /* hamburguesas, sándwiches, bowls y lo demás */
];

/* Etiquetas conocidas (por unidad), por encima de las reglas */
const EXTRA_FAST_LABELS = {
    "Pastelitos · Cupcake Bimbo chocolate (Bimboletes)": [1.3, 252, 24.6, 0],
    "Pastelitos · Cupcake Bimbo vainilla": [1, 252, 24.6, 0],
    "Pastelitos · Cupcake Bimbo vainilla (suelto, paquete de 8)": [0.5, 126, 12.3, 0],
    /* de los 17,5 g de azúcares, ~3 g son del banano */
    "Pastelitos · Pan dulce Bimbo Artesano banano con nuez": [0.5, 340, 14.5, 0],
    "Refrescos · Coca-Cola (lata 355 ml)": [0, 45, 38, 0], "Refrescos · Coca-Cola (botella 600 ml)": [0, 75, 64, 0],
    "Refrescos · Coca-Cola Sin Azúcar": [0, 40, 0, 1], "Bebidas energéticas · Monster Zero Ultra": [0, 200, 0, 1],
    "Bebidas energéticas · Red Bull Sugarfree": [0, 100, 0, 1], "Bebidas deportivas · Gatorade Zero": [0, 230, 0, 1],
    "Bebidas deportivas · Powerade Zero": [0, 250, 0, 1]
};

const extraArr = a => ({ fb: a[0], na: a[1], az: a[2], ed: a[3] });

/* Por unidad de una pieza de comida rápida / supermercado / bebida */
function fastExtras(key, chain, item, drink) {
    if (EXTRA_FAST_LABELS[key]) return extraArr(EXTRA_FAST_LABELS[key]);
    const name = item[0], k = item[3] || 0, c = item[4] || 0;
    const t = EXTRA_FAST_TYPES.find(r => (!r.re || r.re.test(name)) && (!r.chain || r.chain.test(chain)) && (r.drink === undefined || r.drink === drink));
    const fixedNa = t.ed && drink ? 40 : 0;   /* sin azúcar: casi sin calorías, el sodio va por envase */
    return { fb: Math.round(c * t.fb * 10) / 10, na: Math.round(fixedNa || k * t.na), az: Math.round(c * t.az * 10) / 10, ed: t.ed };
}

/* Por unidad registrada de una entrada de comida */
function entryUnitExtras(e) {
    if (e.g === FREE_GROUP || e.g === "agua") return null;   /* volumen sucio: no se sabe */
    if (EXTRA_BY_NAME[e.n]) return extraArr(EXTRA_BY_NAME[e.n]);
    if (e.g === FAST_GROUP) {
        const hit = FAST_FOOD_BY_KEY.get(e.n);
        if (hit) return fastExtras(e.n, hit.chain, hit.item, hit.drink);
        /* ya no está en la lista: como un plato cualquiera */
        return { fb: Math.round((e.mc || 0) * 0.06 * 10) / 10, na: Math.round((e.k || 0) * 1.6), az: Math.round((e.mc || 0) * 0.15 * 10) / 10, ed: 0 };
    }
    /* el promedio de su grupo (o de sus porciones, si son de varios grupos) */
    const pt = hasOwnKcal(e) && e.pt && typeof e.pt === "object" ? e.pt : { [e.g]: 1 };
    const out = { fb: 0, na: 0, az: 0, ed: 0 };
    for (const [g, v] of Object.entries(pt)) {
        const d = EXTRA_GROUP[g];
        if (!d) continue;
        out.fb += d[0] * v; out.na += d[1] * v; out.az += d[2] * v;
    }
    return out;
}

/* Sodio extra según el entreno del test TDEE: lo que se pierde en el sudor, en promedio por día
   (≈ 1 L de sudor por hora de entreno con ≈ 0,9 g de sodio por litro, repartido en la semana) */
const SODIUM_BY_ACTIVITY = { 1.2: 0, 1.375: 300, 1.55: 500, 1.725: 800, 1.9: 1200 };

/* Metas del día: fibra 14 g por cada 1000 kcal (mínimo); azúcar añadido < 10 % de las calorías;
   sodio < 2000 mg (OMS) + lo que se suda entrenando; edulcorantes: ~20 % de la IDA del aspartame (40 mg/kg)
   contando ~180 mg por porción (una lata de refresco sin azúcar) → ≈ 1 porción por cada 22 kg de peso */
function extraGoals(kcal, weight, activity) {
    return {
        fb: Math.round(kcal / 1000 * 14),
        az: Math.round(kcal * 0.10 / 4),
        na: 2000 + (SODIUM_BY_ACTIVITY[activity] || 0),
        ed: Math.max(1, Math.floor((weight || 70) * 40 * 0.2 / 180))
    };
}
