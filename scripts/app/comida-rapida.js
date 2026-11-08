/* =========================================================
    CATÁLOGO DE COMIDA RÁPIDA
    Cada alimento: [nombre, unidad, unidad en plural, kcal, carbohidratos g, proteína g, grasa g]
    por UNA unidad (las pizzas, por slice = 1/8 de pizza).
    Valores aproximados según la información nutricional publicada por cada cadena
    (en su mayoría de EE. UU.); en Costa Rica las recetas y tamaños pueden variar algo.
    Rey Pizza no publica su información: sus valores son ESTIMADOS a partir de pizzas
    equivalentes de otras cadenas.
========================================================= */

const FAST_FOOD = [
    { chain: "Papa John's", items: [
        ["Pizza de queso grande (14\") original", "slice", "slices", 290, 38, 11, 10],
        ["Pizza pepperoni grande original", "slice", "slices", 320, 38, 12, 13],
        ["Pizza pepperoni y salchicha grande", "slice", "slices", 360, 38, 13, 17],
        ["Pizza Ultimate Pepperoni grande", "slice", "slices", 360, 39, 14, 16],
        ["Pizza Zesty Italian Trio grande", "slice", "slices", 370, 38, 14, 17],
        ["Pizza Zesty Italian Trio mediana", "slice", "slices", 260, 27, 10, 12],
        ["Pizza de queso mediana original", "slice", "slices", 210, 27, 8, 8],
        ["Pizza de queso masa delgada", "slice", "slices", 210, 20, 8, 11],
        ["Pizza de queso Epic Stuffed Crust", "slice", "slices", 360, 40, 15, 14],
        ["Pizza pepperoni Epic Stuffed Crust", "slice", "slices", 360, 34, 16, 17]
    ] },
    { chain: "Pizza Hut", items: [
        ["Pizza de queso mediana Hand Tossed", "slice", "slices", 210, 26, 10, 7],
        ["Pizza pepperoni mediana Hand Tossed", "slice", "slices", 220, 25, 9, 9],
        ["Pizza suprema mediana Hand Tossed", "slice", "slices", 240, 26, 10, 10],
        ["Pizza Pepperoni Lover's mediana Hand Tossed", "slice", "slices", 260, 26, 12, 12],
        ["Pizza Super Suprema mediana Hand Tossed", "slice", "slices", 270, 27, 12, 13],
        ["Pizza de queso mediana Pan", "slice", "slices", 240, 25, 10, 10],
        ["Pizza suprema mediana Pan", "slice", "slices", 260, 27, 11, 12],
        ["Pizza Super Suprema grande Hand Tossed", "slice", "slices", 320, 33, 15, 14],
        ["Pizza de queso mediana Thin 'N Crispy", "slice", "slices", 190, 22, 8, 8],
        ["Pizza suprema mediana Thin 'N Crispy", "slice", "slices", 220, 23, 10, 10]
    ] },
    { chain: "Rey Pizza (estimado)", items: [
        ["Pizza de queso grande", "slice", "slices", 290, 34, 12, 11],
        ["Pizza de jamón grande", "slice", "slices", 300, 34, 14, 12],
        ["Pizza pepperoni grande", "slice", "slices", 320, 33, 13, 15],
        ["Pizza hawaiana grande", "slice", "slices", 310, 37, 13, 12],
        ["Pizza suprema grande", "slice", "slices", 330, 34, 14, 15],
        ["Pizza de carnes grande", "slice", "slices", 370, 33, 16, 19]
    ] },
    { chain: "Domino's", items: [
        ["Pizza pepperoni grande Hand Tossed", "slice", "slices", 300, 34, 12, 13],
        ["Pizza pepperoni y salchicha grande", "slice", "slices", 335, 35, 13, 16],
        ["Pizza Ultimate Pepperoni grande", "slice", "slices", 360, 34, 15, 18],
        ["Pizza Deluxe grande Hand Tossed", "slice", "slices", 340, 36, 13, 16]
    ] },
    { chain: "McDonald's", items: [
        ["Big Mac", "unidad", "unidades", 590, 46, 25, 34],
        ["Cuarto de Libra con queso", "unidad", "unidades", 520, 42, 30, 26],
        ["Doble Cuarto de Libra con queso", "unidad", "unidades", 740, 43, 48, 42],
        ["McDouble / Doble hamburguesa con queso", "unidad", "unidades", 400, 33, 22, 20],
        ["Hamburguesa con queso", "unidad", "unidades", 300, 32, 15, 13],
        ["McChicken", "unidad", "unidades", 400, 39, 14, 21],
        ["Filet-O-Fish", "unidad", "unidades", 390, 39, 16, 19],
        ["McNuggets (10 piezas)", "caja", "cajas", 410, 25, 23, 24],
        ["Papas pequeñas", "orden", "órdenes", 230, 31, 3, 11],
        ["Papas medianas", "orden", "órdenes", 320, 43, 5, 15],
        ["Papas grandes", "orden", "órdenes", 480, 65, 7, 23],
        ["McMuffin con huevo", "unidad", "unidades", 310, 30, 17, 13],
        ["Pie de manzana", "unidad", "unidades", 230, 33, 2, 11],
        ["McFlurry Oreo (regular)", "unidad", "unidades", 510, 80, 12, 16]
    ] },
    { chain: "Burger King", items: [
        ["Whopper", "unidad", "unidades", 670, 51, 31, 40],
        ["Whopper con queso", "unidad", "unidades", 760, 52, 35, 47],
        ["Doble Whopper", "unidad", "unidades", 920, 51, 51, 58],
        ["Whopper Jr.", "unidad", "unidades", 340, 32, 14, 18],
        ["Chicken Fries (9 piezas)", "orden", "órdenes", 280, 20, 13, 17],
        ["Papas medianas", "orden", "órdenes", 370, 51, 4, 16]
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
        ["Famous Bowl", "unidad", "unidades", 720, 77, 26, 35],
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
    { chain: "Subway (6 pulgadas)", items: [
        ["Italian B.M.T.", "sub", "subs", 450, 47, 23, 21],
        ["Pollo teriyaki", "sub", "subs", 380, 60, 26, 5],
        ["Pollo rostizado", "sub", "subs", 320, 47, 23, 5],
        ["Pavo", "sub", "subs", 280, 46, 18, 4],
        ["Atún", "sub", "subs", 510, 36, 21, 30],
        ["Steak & Cheese", "sub", "subs", 380, 48, 24, 10],
        ["Veggie Delite", "sub", "subs", 230, 44, 9, 3],
        ["Pavo y jamón", "sub", "subs", 460, 41, 26, 22],
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
        ["Nachos BellGrande", "orden", "órdenes", 740, 79, 16, 39],
        ["Chalupa Supreme de res", "unidad", "unidades", 350, 30, 12, 21]
    ] }
];

/* Búsqueda rápida por clave "Cadena · Nombre" (para Frecuentes y para volver a agregar) */
const FAST_FOOD_BY_KEY = new Map();
FAST_FOOD.forEach(({ chain, items }) => items.forEach(it => FAST_FOOD_BY_KEY.set(`${chain} · ${it[0]}`, { chain, item: it })));
