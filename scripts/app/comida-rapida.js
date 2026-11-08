/* =========================================================
    CATÁLOGO DE COMIDA RÁPIDA
    Cada alimento: [nombre, unidad, unidad en plural, kcal, carbohidratos g, proteína g, grasa g]
    por UNA unidad (las pizzas, por slice = 1/8 de pizza).
    Valores aproximados según la información nutricional publicada por cada cadena
    (en su mayoría de EE. UU.); en Costa Rica las recetas y tamaños pueden variar algo.
    "(estimado)": la cadena no publica ese producto; se calculó con productos equivalentes
    (p. ej. pizza de jamón y queso = la de queso de esa cadena + la porción de jamón).
========================================================= */

const FAST_FOOD = [
    { chain: "Papa John's", items: [
        ["Pizza de queso grande (14\") original", "slice", "slices", 290, 38, 11, 10],
        ["Pizza de jamón y queso grande (estimado)", "slice", "slices", 315, 38, 15, 11],
        ["Pizza pepperoni grande original", "slice", "slices", 320, 38, 12, 13],
        ["Pizza pepperoni y salchicha grande", "slice", "slices", 360, 38, 13, 17],
        ["Pizza Ultimate Pepperoni grande", "slice", "slices", 360, 39, 14, 16],
        ["Pizza Zesty Italian Trio grande", "slice", "slices", 370, 38, 14, 17],
        ["Pizza hawaiana grande (estimado)", "slice", "slices", 320, 41, 14, 11],
        ["Pizza The Works grande (estimado)", "slice", "slices", 340, 39, 14, 14],
        ["Pizza Zesty Italian Trio mediana", "slice", "slices", 260, 27, 10, 12],
        ["Pizza de queso mediana original", "slice", "slices", 210, 27, 8, 8],
        ["Pizza de jamón y queso mediana (estimado)", "slice", "slices", 230, 27, 11, 9],
        ["Pizza de queso masa delgada", "slice", "slices", 210, 20, 8, 11],
        ["Pizza de queso Epic Stuffed Crust", "slice", "slices", 360, 40, 15, 14],
        ["Pizza pepperoni Epic Stuffed Crust", "slice", "slices", 360, 34, 16, 17],
        ["Breadstick", "unidad", "unidades", 140, 26, 4, 3],
        ["Salsa de ajo (vasito)", "vasito", "vasitos", 150, 0, 0, 17]
    ] },
    { chain: "Pizza Hut", items: [
        ["Pizza de queso mediana Hand Tossed", "slice", "slices", 210, 26, 10, 7],
        ["Pizza de jamón y queso mediana Hand Tossed (estimado)", "slice", "slices", 230, 26, 13, 8],
        ["Pizza pepperoni mediana Hand Tossed", "slice", "slices", 220, 25, 9, 9],
        ["Pizza hawaiana mediana Hand Tossed (estimado)", "slice", "slices", 230, 29, 11, 8],
        ["Pizza suprema mediana Hand Tossed", "slice", "slices", 240, 26, 10, 10],
        ["Pizza Pepperoni Lover's mediana Hand Tossed", "slice", "slices", 260, 26, 12, 12],
        ["Pizza Super Suprema mediana Hand Tossed", "slice", "slices", 270, 27, 12, 13],
        ["Pizza Meat Lover's mediana Hand Tossed (estimado)", "slice", "slices", 300, 26, 14, 16],
        ["Pizza de queso mediana Pan", "slice", "slices", 240, 25, 10, 10],
        ["Pizza de jamón y queso mediana Pan (estimado)", "slice", "slices", 260, 25, 13, 11],
        ["Pizza suprema mediana Pan", "slice", "slices", 260, 27, 11, 12],
        ["Pizza de queso grande Hand Tossed (estimado)", "slice", "slices", 290, 36, 13, 10],
        ["Pizza de jamón y queso grande Hand Tossed (estimado)", "slice", "slices", 315, 36, 16, 11],
        ["Pizza pepperoni grande Hand Tossed (estimado)", "slice", "slices", 300, 34, 13, 12],
        ["Pizza Super Suprema grande Hand Tossed", "slice", "slices", 320, 33, 15, 14],
        ["Pizza de queso mediana Thin 'N Crispy", "slice", "slices", 190, 22, 8, 8],
        ["Pizza suprema mediana Thin 'N Crispy", "slice", "slices", 220, 23, 10, 10],
        ["Breadstick", "unidad", "unidades", 140, 18, 4, 6]
    ] },
    { chain: "Domino's", items: [
        ["Pizza de queso grande Hand Tossed", "slice", "slices", 270, 36, 12, 9],
        ["Pizza de jamón y queso grande (estimado)", "slice", "slices", 295, 36, 15, 10],
        ["Pizza hawaiana (jamón y piña) grande", "slice", "slices", 270, 33, 11, 9],
        ["Pizza pepperoni grande Hand Tossed", "slice", "slices", 300, 34, 12, 13],
        ["Pizza pepperoni y salchicha grande", "slice", "slices", 335, 35, 13, 16],
        ["Pizza Ultimate Pepperoni grande", "slice", "slices", 360, 34, 15, 18],
        ["Pizza Deluxe grande Hand Tossed", "slice", "slices", 340, 36, 13, 16],
        ["Pizza ExtravaganZZa grande", "slice", "slices", 390, 37, 17, 19],
        ["Pizza de queso mediana Hand Tossed (estimado)", "slice", "slices", 200, 25, 8, 8],
        ["Pizza hawaiana mediana Hand Tossed", "slice", "slices", 200, 26, 8, 7]
    ] },
    { chain: "Little Caesars", items: [
        ["Pizza de queso grande Classic", "slice", "slices", 245, 31, 12, 8],
        ["Pizza de jamón y queso grande Classic (estimado)", "slice", "slices", 265, 31, 15, 9],
        ["Pizza pepperoni grande Classic", "slice", "slices", 290, 31, 14, 12],
        ["Pizza de queso ExtraMostBestest", "slice", "slices", 280, 32, 15, 11],
        ["Pizza pepperoni ExtraMostBestest", "slice", "slices", 320, 33, 15, 14],
        ["Crazy Bread", "palito", "palitos", 100, 16, 3, 3],
        ["Crazy Sauce (vasito)", "vasito", "vasitos", 30, 7, 1, 0]
    ] },
    { chain: "Rey Pizza (estimado)", items: [
        ["Pizza de queso grande", "slice", "slices", 290, 34, 12, 11],
        ["Pizza de jamón y queso grande", "slice", "slices", 310, 34, 15, 12],
        ["Pizza de jamón y hongos grande", "slice", "slices", 300, 34, 14, 11],
        ["Pizza pepperoni grande", "slice", "slices", 320, 33, 13, 15],
        ["Pizza hawaiana grande", "slice", "slices", 310, 37, 13, 12],
        ["Pizza suprema grande", "slice", "slices", 330, 34, 14, 15],
        ["Pizza de carnes grande", "slice", "slices", 370, 33, 16, 19],
        ["Pizza de pollo grande", "slice", "slices", 300, 34, 16, 11]
    ] },
    { chain: "McDonald's", items: [
        ["Big Mac", "unidad", "unidades", 590, 46, 25, 34],
        ["Cuarto de Libra con queso", "unidad", "unidades", 520, 42, 30, 26],
        ["Doble Cuarto de Libra con queso", "unidad", "unidades", 740, 43, 48, 42],
        ["McDouble / Doble hamburguesa con queso", "unidad", "unidades", 400, 33, 22, 20],
        ["Hamburguesa con queso", "unidad", "unidades", 300, 32, 15, 13],
        ["Hamburguesa sencilla", "unidad", "unidades", 250, 31, 12, 9],
        ["McPollo / McChicken", "unidad", "unidades", 400, 39, 14, 21],
        ["Filet-O-Fish", "unidad", "unidades", 390, 39, 16, 19],
        ["McNuggets (6 piezas)", "caja", "cajas", 250, 15, 14, 15],
        ["McNuggets (10 piezas)", "caja", "cajas", 410, 25, 23, 24],
        ["Papas pequeñas", "orden", "órdenes", 230, 31, 3, 11],
        ["Papas medianas", "orden", "órdenes", 320, 43, 5, 15],
        ["Papas grandes", "orden", "órdenes", 480, 65, 7, 23],
        ["McMuffin con huevo", "unidad", "unidades", 310, 30, 17, 13],
        ["Hotcakes (3, con mantequilla y miel)", "orden", "órdenes", 580, 101, 9, 15],
        ["Pie de manzana", "unidad", "unidades", 230, 33, 2, 11],
        ["Sundae de caramelo", "unidad", "unidades", 340, 60, 7, 9],
        ["McFlurry Oreo (regular)", "unidad", "unidades", 510, 80, 12, 16],
        ["Refresco mediano (con azúcar)", "vaso", "vasos", 210, 56, 0, 0]
    ] },
    { chain: "Burger King", items: [
        ["Whopper", "unidad", "unidades", 670, 51, 31, 40],
        ["Whopper con queso", "unidad", "unidades", 760, 52, 35, 47],
        ["Doble Whopper", "unidad", "unidades", 920, 51, 51, 58],
        ["Whopper Jr.", "unidad", "unidades", 340, 32, 14, 18],
        ["Hamburguesa con queso", "unidad", "unidades", 280, 27, 15, 13],
        ["Chicken Fries (9 piezas)", "orden", "órdenes", 280, 20, 13, 17],
        ["Papas medianas", "orden", "órdenes", 370, 51, 4, 16],
        ["Aros de cebolla medianos", "orden", "órdenes", 410, 50, 5, 21]
    ] },
    { chain: "Wendy's", items: [
        ["Dave's Single", "unidad", "unidades", 580, 35, 29, 36],
        ["Dave's Double", "unidad", "unidades", 850, 35, 49, 57],
        ["Baconator", "unidad", "unidades", 930, 34, 57, 63],
        ["Baconator Single", "unidad", "unidades", 660, 41, 36, 40],
        ["Jr. Bacon Cheeseburger", "unidad", "unidades", 360, 24, 17, 22],
        ["Jr. Cheeseburger", "unidad", "unidades", 280, 25, 14, 14],
        ["Double Stack", "unidad", "unidades", 400, 25, 23, 23],
        ["Sándwich de pollo clásico", "unidad", "unidades", 550, 55, 28, 25],
        ["Sándwich de pollo picante", "unidad", "unidades", 560, 55, 28, 26],
        ["Nuggets (10 piezas)", "orden", "órdenes", 430, 22, 23, 27],
        ["Papas medianas", "orden", "órdenes", 350, 47, 5, 16],
        ["Frosty de chocolate pequeño", "unidad", "unidades", 350, 56, 9, 9]
    ] },
    { chain: "Carl's Jr.", items: [
        ["Famous Star con queso", "unidad", "unidades", 670, 57, 28, 37],
        ["Super Star con queso", "unidad", "unidades", 850, 51, 46, 52],
        ["Western Bacon Cheeseburger", "unidad", "unidades", 780, 77, 38, 36],
        ["Doble Western Bacon Cheeseburger", "unidad", "unidades", 1040, 78, 58, 56],
        ["Hamburguesa con queso", "unidad", "unidades", 390, 42, 19, 15],
        ["Papas pequeñas", "orden", "órdenes", 300, 38, 4, 15]
    ] },
    { chain: "KFC", items: [
        ["Pechuga Receta Original", "pieza", "piezas", 390, 11, 39, 21],
        ["Muslo Receta Original", "pieza", "piezas", 280, 8, 19, 19],
        ["Pierna Receta Original", "pieza", "piezas", 130, 4, 12, 8],
        ["Ala Receta Original", "pieza", "piezas", 130, 4, 10, 8],
        ["Pechuga Extra Crispy", "pieza", "piezas", 530, 16, 34, 35],
        ["Muslo Extra Crispy", "pieza", "piezas", 330, 11, 17, 24],
        ["Pierna Extra Crispy", "pieza", "piezas", 170, 6, 12, 10],
        ["Ala Extra Crispy", "pieza", "piezas", 190, 10, 10, 12],
        ["Tender / Tira de pollo", "pieza", "piezas", 140, 8, 11, 7],
        ["Sándwich de pollo", "unidad", "unidades", 650, 49, 34, 35],
        ["Famous Bowl", "unidad", "unidades", 720, 77, 26, 35],
        ["Papas (individual)", "orden", "órdenes", 320, 41, 4, 15],
        ["Puré con gravy (individual)", "unidad", "unidades", 120, 18, 2, 5],
        ["Ensalada de repollo (individual)", "unidad", "unidades", 170, 14, 1, 12],
        ["Biscuit", "unidad", "unidades", 180, 22, 4, 8]
    ] },
    { chain: "Popeyes", items: [
        ["Pechuga clásica (mild)", "pieza", "piezas", 380, 16, 35, 20],
        ["Muslo clásico (mild)", "pieza", "piezas", 280, 8, 17, 20],
        ["Pierna clásica (mild)", "pieza", "piezas", 160, 5, 14, 9],
        ["Ala clásica (mild)", "pieza", "piezas", 150, 5, 10, 10],
        ["Sándwich de pollo clásico", "unidad", "unidades", 700, 50, 28, 42],
        ["Tenders Blackened (3 piezas)", "orden", "órdenes", 170, 3, 27, 2]
    ] },
    { chain: "Church's Texas Chicken", items: [
        ["Pechuga original", "pieza", "piezas", 250, 8, 22, 14],
        ["Muslo original", "pieza", "piezas", 360, 9, 21, 26],
        ["Pierna original", "pieza", "piezas", 160, 6, 13, 10],
        ["Ala original", "pieza", "piezas", 290, 9, 19, 20],
        ["Tira de pollo picante", "pieza", "piezas", 120, 6, 9, 7],
        ["Honey-Butter Biscuit", "unidad", "unidades", 230, 22, 3, 15],
        ["Papas (regular)", "orden", "órdenes", 210, 27, 3, 10]
    ] },
    { chain: "Rostipollos (estimado)", items: [
        ["1/4 de pollo (pechuga y ala, con piel)", "porción", "porciones", 330, 0, 40, 18],
        ["1/4 de pollo (muslo y pierna, con piel)", "porción", "porciones", 380, 0, 35, 26],
        ["1/2 pollo (con piel)", "porción", "porciones", 710, 0, 75, 44],
        ["Papas fritas (orden)", "orden", "órdenes", 360, 46, 5, 17]
    ] },
    { chain: "Subway (6 pulgadas)", items: [
        ["Italian B.M.T.", "sub", "subs", 450, 47, 23, 21],
        ["Pollo teriyaki", "sub", "subs", 380, 60, 26, 5],
        ["Pollo rostizado", "sub", "subs", 320, 47, 23, 5],
        ["Pavo", "sub", "subs", 280, 46, 18, 4],
        ["Jamón", "sub", "subs", 290, 46, 18, 5],
        ["Atún", "sub", "subs", 510, 36, 21, 30],
        ["Steak & Cheese", "sub", "subs", 380, 48, 24, 10],
        ["Veggie Delite", "sub", "subs", 230, 44, 9, 3],
        ["Pavo y jamón", "sub", "subs", 460, 41, 26, 22],
        ["Albóndigas (Meatball Marinara)", "sub", "subs", 480, 59, 21, 18],
        ["Pizza Sub", "sub", "subs", 480, 45, 21, 24],
        ["Galleta de chocolate", "unidad", "unidades", 210, 30, 2, 10]
    ] },
    { chain: "Taco Bell", items: [
        ["Taco crujiente", "unidad", "unidades", 170, 13, 8, 9],
        ["Taco crujiente Supreme", "unidad", "unidades", 190, 14, 8, 11],
        ["Taco suave", "unidad", "unidades", 180, 17, 9, 9],
        ["Crunchwrap Supreme", "unidad", "unidades", 530, 71, 16, 21],
        ["Burrito Supreme de res", "unidad", "unidades", 390, 43, 16, 16],
        ["Burrito de frijol", "unidad", "unidades", 380, 55, 13, 11],
        ["Quesadilla de pollo", "unidad", "unidades", 510, 37, 27, 27],
        ["Quesadilla de queso", "unidad", "unidades", 470, 37, 19, 26],
        ["Mexican Pizza", "unidad", "unidades", 540, 46, 20, 30],
        ["Cheesy Gordita Crunch", "unidad", "unidades", 500, 40, 20, 28],
        ["Chalupa Supreme de res", "unidad", "unidades", 350, 30, 12, 21],
        ["Nachos BellGrande", "orden", "órdenes", 740, 79, 16, 39]
    ] }
];

/* Búsqueda rápida por clave "Cadena · Nombre" (para Frecuentes y para volver a agregar) */
const FAST_FOOD_BY_KEY = new Map();
FAST_FOOD.forEach(({ chain, items }) => items.forEach(it => FAST_FOOD_BY_KEY.set(`${chain} · ${it[0]}`, { chain, item: it })));
