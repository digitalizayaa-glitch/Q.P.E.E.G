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
        ["Pizza de queso grande (14\") original", "slice", "slices", 290, 38, 11, 10, { h: 2.5, mg: 0.5, g: 1 }],
        ["Pizza de jamón y queso grande (estimado)", "slice", "slices", 315, 38, 15, 11, { h: 2.5, mg: 1.5 }],
        ["Pizza pepperoni grande original", "slice", "slices", 320, 38, 12, 13, { h: 2.5, mg: 1, g: 1 }],
        ["Pizza pepperoni y salchicha grande", "slice", "slices", 360, 38, 13, 17, { h: 2.5, mg: 1, g: 2 }],
        ["Pizza Ultimate Pepperoni grande", "slice", "slices", 360, 39, 14, 16, { h: 2.5, mg: 1, g: 2 }],
        ["Pizza Zesty Italian Trio grande", "slice", "slices", 370, 38, 14, 17, { h: 2.5, mg: 1, g: 2 }],
        ["Pizza hawaiana grande (estimado)", "slice", "slices", 320, 41, 14, 11, { h: 2.5, mg: 1, g: 1 }],
        ["Pizza The Works grande (estimado)", "slice", "slices", 340, 39, 14, 14, { h: 2.5, mg: 1, g: 1.5 }],
        ["Pizza Zesty Italian Trio mediana", "slice", "slices", 260, 27, 10, 12, { h: 2, mg: 0.5, g: 1.5 }],
        ["Pizza de queso mediana original", "slice", "slices", 210, 27, 8, 8, { h: 2, g: 1 }],
        ["Pizza de jamón y queso mediana (estimado)", "slice", "slices", 230, 27, 11, 9, { h: 2, g: 1.5 }],
        ["Pizza de queso masa delgada", "slice", "slices", 210, 20, 8, 11, { h: 1.5, g: 2 }],
        ["Pizza de queso Epic Stuffed Crust", "slice", "slices", 360, 40, 15, 14, { h: 2.5, mg: 1.5, g: 1 }],
        ["Pizza pepperoni Epic Stuffed Crust", "slice", "slices", 360, 34, 16, 17, { h: 2.5, mg: 1, g: 2 }],
        ["Breadstick", "unidad", "unidades", 140, 26, 4, 3, { h: 1.5, g: 0.5 }],
        ["Salsa de ajo (vasito)", "vasito", "vasitos", 150, 0, 0, 17, { g: 3.5 }]
    ] },
    { chain: "Pizza Hut", items: [
        ["Pizza de queso mediana Hand Tossed", "slice", "slices", 210, 26, 10, 7, { h: 2, g: 1 }],
        ["Pizza de jamón y queso mediana Hand Tossed (estimado)", "slice", "slices", 230, 26, 13, 8, { h: 1.5, mg: 1.5 }],
        ["Pizza pepperoni mediana Hand Tossed", "slice", "slices", 220, 25, 9, 9, { h: 1.5, mg: 1, g: 0.5 }],
        ["Pizza hawaiana mediana Hand Tossed (estimado)", "slice", "slices", 230, 29, 11, 8, { h: 2, mg: 1 }],
        ["Pizza suprema mediana Hand Tossed", "slice", "slices", 240, 26, 10, 10, { h: 2, mg: 0.5, g: 1 }],
        ["Pizza Pepperoni Lover's mediana Hand Tossed", "slice", "slices", 260, 26, 12, 12, { h: 1.5, mg: 1, g: 1.5 }],
        ["Pizza Super Suprema mediana Hand Tossed", "slice", "slices", 270, 27, 12, 13, { h: 2, mg: 0.5, g: 1.5 }],
        ["Pizza Meat Lover's mediana Hand Tossed (estimado)", "slice", "slices", 300, 26, 14, 16, { h: 1.5, mg: 1.5, g: 1.5 }],
        ["Pizza de queso mediana Pan", "slice", "slices", 240, 25, 10, 10, { h: 1.5, mg: 1, g: 1 }],
        ["Pizza de jamón y queso mediana Pan (estimado)", "slice", "slices", 260, 25, 13, 11, { h: 1.5, mg: 1.5, g: 0.5 }],
        ["Pizza suprema mediana Pan", "slice", "slices", 260, 27, 11, 12, { h: 2, mg: 0.5, g: 1.5 }],
        ["Pizza de queso grande Hand Tossed (estimado)", "slice", "slices", 290, 36, 13, 10, { h: 2.5, mg: 0.5, g: 1 }],
        ["Pizza de jamón y queso grande Hand Tossed (estimado)", "slice", "slices", 315, 36, 16, 11, { h: 2.5, mg: 1.5 }],
        ["Pizza pepperoni grande Hand Tossed (estimado)", "slice", "slices", 300, 34, 13, 12, { h: 2.5, mg: 0.5, g: 1.5 }],
        ["Pizza Super Suprema grande Hand Tossed", "slice", "slices", 320, 33, 15, 14, { h: 2, mg: 1.5, g: 1 }],
        ["Pizza de queso mediana Thin 'N Crispy", "slice", "slices", 190, 22, 8, 8, { h: 1.5, g: 1.5 }],
        ["Pizza suprema mediana Thin 'N Crispy", "slice", "slices", 220, 23, 10, 10, { h: 1.5, mg: 1, g: 0.5 }],
        ["Breadstick", "unidad", "unidades", 140, 18, 4, 6, { h: 1.5, g: 0.5 }]
    ] },
    { chain: "Domino's", items: [
        ["Pizza de queso grande Hand Tossed", "slice", "slices", 270, 36, 12, 9, { h: 2.5, g: 1.5 }],
        ["Pizza de jamón y queso grande (estimado)", "slice", "slices", 295, 36, 15, 10, { h: 2.5, mg: 1, g: 0.5 }],
        ["Pizza hawaiana (jamón y piña) grande", "slice", "slices", 270, 33, 11, 9, { h: 2.5, g: 1.5 }],
        ["Pizza pepperoni grande Hand Tossed", "slice", "slices", 300, 34, 12, 13, { h: 2.5, mg: 0.5, g: 1.5 }],
        ["Pizza pepperoni y salchicha grande", "slice", "slices", 335, 35, 13, 16, { h: 2.5, bg: 0.5, g: 2.5 }],
        ["Pizza Ultimate Pepperoni grande", "slice", "slices", 360, 34, 15, 18, { h: 2.5, mg: 1, g: 2 }],
        ["Pizza Deluxe grande Hand Tossed", "slice", "slices", 340, 36, 13, 16, { h: 2.5, mg: 1, g: 1.5 }],
        ["Pizza ExtravaganZZa grande", "slice", "slices", 390, 37, 17, 19, { h: 2.5, mg: 1, g: 2.5 }],
        ["Pizza de queso mediana Hand Tossed (estimado)", "slice", "slices", 200, 25, 8, 8, { h: 1.5, mg: 0.5, g: 1 }],
        ["Pizza hawaiana mediana Hand Tossed", "slice", "slices", 200, 26, 8, 7, { h: 1.5, mg: 1 }]
    ] },
    { chain: "Little Caesars", items: [
        ["Pizza de queso grande Classic", "slice", "slices", 245, 31, 12, 8, { h: 2, mg: 0.5, g: 1 }],
        ["Pizza de jamón y queso grande Classic (estimado)", "slice", "slices", 265, 31, 15, 9, { h: 2, mg: 1.5 }],
        ["Pizza pepperoni grande Classic", "slice", "slices", 290, 31, 14, 12, { h: 2, mg: 1.5, g: 0.5 }],
        ["Pizza de queso ExtraMostBestest", "slice", "slices", 280, 32, 15, 11, { h: 2, mg: 1, g: 1 }],
        ["Pizza pepperoni ExtraMostBestest", "slice", "slices", 320, 33, 15, 14, { h: 2, mg: 1.5, g: 1 }],
        ["Crazy Bread", "palito", "palitos", 100, 16, 3, 3, { h: 1, g: 0.5 }],
        ["Crazy Sauce (vasito)", "vasito", "vasitos", 30, 7, 1, 0, { h: 0.5 }]
    ] },
    { chain: "Rey Pizza (estimado)", items: [
        ["Pizza de queso grande", "slice", "slices", 290, 34, 12, 11, { h: 2.5, bg: 0.5, g: 1.5 }],
        ["Pizza de jamón y queso grande", "slice", "slices", 310, 34, 15, 12, { h: 2.5, mg: 0.5, g: 1.5 }],
        ["Pizza de jamón y hongos grande", "slice", "slices", 300, 34, 14, 11, { h: 2.5, mg: 1, g: 0.5 }],
        ["Pizza pepperoni grande", "slice", "slices", 320, 33, 13, 15, { h: 2, mg: 1.5, g: 1 }],
        ["Pizza hawaiana grande", "slice", "slices", 310, 37, 13, 12, { h: 2.5, mg: 0.5, g: 1.5 }],
        ["Pizza suprema grande", "slice", "slices", 330, 34, 14, 15, { h: 2.5, mg: 0.5, g: 2 }],
        ["Pizza de carnes grande", "slice", "slices", 370, 33, 16, 19, { h: 2, bg: 0.5, mg: 1, g: 2.5 }],
        ["Pizza de pollo grande", "slice", "slices", 300, 34, 16, 11, { h: 2.5, mg: 1, g: 0.5 }]
    ] },
    { chain: "McDonald's", items: [
        ["Big Mac", "unidad", "unidades", 590, 46, 25, 34, { h: 3, mg: 2, g: 4.5 }],
        ["Cuarto de Libra con queso", "unidad", "unidades", 520, 42, 30, 26, { h: 3, mg: 2.5, g: 2 }],
        ["Doble Cuarto de Libra con queso", "unidad", "unidades", 740, 43, 48, 42, { h: 3, bg: 0.5, mg: 5, g: 2.5 }],
        ["McDouble / Doble hamburguesa con queso", "unidad", "unidades", 400, 33, 22, 20, { h: 2, mg: 2, g: 2 }],
        ["Hamburguesa con queso", "unidad", "unidades", 300, 32, 15, 13, { h: 2, mg: 1, g: 1.5 }],
        ["Hamburguesa sencilla", "unidad", "unidades", 250, 31, 12, 9, { h: 2, mg: 0.5, g: 1 }],
        ["McPollo / McChicken", "unidad", "unidades", 400, 39, 14, 21, { h: 2.5, mg: 1.5, g: 2 }],
        ["Filet-O-Fish", "unidad", "unidades", 390, 39, 16, 19, { h: 2.5, mg: 1, g: 2.5 }],
        ["McNuggets (6 piezas)", "caja", "cajas", 250, 15, 14, 15, { h: 1, mg: 2, g: 0.5 }],
        ["McNuggets (10 piezas)", "caja", "cajas", 410, 25, 23, 24, { h: 1.5, mg: 3, g: 1.5 }],
        ["Papas pequeñas", "orden", "órdenes", 230, 31, 3, 11, { h: 2, g: 1.5 }],
        ["Papas medianas", "orden", "órdenes", 320, 43, 5, 15, { h: 2.5, g: 2.5 }],
        ["Papas grandes", "orden", "órdenes", 480, 65, 7, 23, { h: 3.5, bg: 0.5, g: 4 }],
        ["McMuffin con huevo", "unidad", "unidades", 310, 30, 17, 13, { h: 2, mg: 2 }],
        ["Hotcakes (3, con mantequilla y miel)", "orden", "órdenes", 580, 101, 9, 15, { h: 4.5, g: 4.5 }],
        ["Pie de manzana", "unidad", "unidades", 230, 33, 2, 11, { h: 2, g: 1.5 }],
        ["Sundae de caramelo", "unidad", "unidades", 340, 60, 7, 9, { h: 3.5, g: 1 }],
        ["McFlurry Oreo (regular)", "unidad", "unidades", 510, 80, 12, 16, { h: 5, g: 2.5 }],
        ["Refresco mediano (con azúcar)", "vaso", "vasos", 210, 56, 0, 0, { h: 2.5 }]
    ] },
    { chain: "Burger King", items: [
        ["Whopper", "unidad", "unidades", 670, 51, 31, 40, { h: 3.5, mg: 2.5, g: 4.5 }],
        ["Whopper con queso", "unidad", "unidades", 760, 52, 35, 47, { h: 3.5, mg: 3.5, g: 5 }],
        ["Doble Whopper", "unidad", "unidades", 920, 51, 51, 58, { h: 3.5, mg: 6, g: 4.5 }],
        ["Whopper Jr.", "unidad", "unidades", 340, 32, 14, 18, { h: 2, mg: 1.5, g: 1.5 }],
        ["Hamburguesa con queso", "unidad", "unidades", 280, 27, 15, 13, { h: 2, mg: 1, g: 1 }],
        ["Chicken Fries (9 piezas)", "orden", "órdenes", 280, 20, 13, 17, { h: 1.5, mg: 1, g: 2 }],
        ["Papas medianas", "orden", "órdenes", 370, 51, 4, 16, { h: 2.5, g: 3.5 }],
        ["Aros de cebolla medianos", "orden", "órdenes", 410, 50, 5, 21, { h: 3, g: 3.5 }]
    ] },
    { chain: "Wendy's", items: [
        ["Dave's Single", "unidad", "unidades", 580, 35, 29, 36, { h: 2.5, mg: 3, g: 3.5 }],
        ["Dave's Double", "unidad", "unidades", 850, 35, 49, 57, { h: 2.5, mg: 5.5, g: 5.5 }],
        ["Baconator", "unidad", "unidades", 930, 34, 57, 63, { h: 2, mg: 7.5, g: 5 }],
        ["Baconator Single", "unidad", "unidades", 660, 41, 36, 40, { h: 2.5, bg: 0.5, mg: 3.5, g: 4 }],
        ["Jr. Bacon Cheeseburger", "unidad", "unidades", 360, 24, 17, 22, { h: 1.5, mg: 2, g: 2 }],
        ["Jr. Cheeseburger", "unidad", "unidades", 280, 25, 14, 14, { h: 1.5, mg: 1.5, g: 1 }],
        ["Double Stack", "unidad", "unidades", 400, 25, 23, 23, { h: 1.5, mg: 2.5, g: 2 }],
        ["Sándwich de pollo clásico", "unidad", "unidades", 550, 55, 28, 25, { h: 3.5, mg: 2.5, g: 2 }],
        ["Sándwich de pollo picante", "unidad", "unidades", 560, 55, 28, 26, { h: 3.5, mg: 2.5, g: 2 }],
        ["Nuggets (10 piezas)", "orden", "órdenes", 430, 22, 23, 27, { h: 1.5, mg: 3, g: 2 }],
        ["Papas medianas", "orden", "órdenes", 350, 47, 5, 16, { h: 3, g: 2.5 }],
        ["Frosty de chocolate pequeño", "unidad", "unidades", 350, 56, 9, 9, { h: 3.5, g: 1.5 }]
    ] },
    { chain: "Carl's Jr.", items: [
        ["Famous Star con queso", "unidad", "unidades", 670, 57, 28, 37, { h: 4, mg: 2, g: 4.5 }],
        ["Super Star con queso", "unidad", "unidades", 850, 51, 46, 52, { h: 3.5, mg: 5, g: 4.5 }],
        ["Western Bacon Cheeseburger", "unidad", "unidades", 780, 77, 38, 36, { h: 5, mg: 3, g: 3.5 }],
        ["Doble Western Bacon Cheeseburger", "unidad", "unidades", 1040, 78, 58, 56, { h: 5, mg: 6.5, g: 3.5 }],
        ["Hamburguesa con queso", "unidad", "unidades", 390, 42, 19, 15, { h: 3, mg: 1.5, g: 1 }],
        ["Papas pequeñas", "orden", "órdenes", 300, 38, 4, 15, { h: 2.5, g: 2 }]
    ] },
    { chain: "KFC", items: [
        ["Pechuga Receta Original", "pieza", "piezas", 390, 11, 39, 21, { h: 0.5, bg: 1.5, mg: 4 }],
        ["Muslo Receta Original", "pieza", "piezas", 280, 8, 19, 19, { h: 0.5, mg: 3, g: 0.5 }],
        ["Pierna Receta Original", "pieza", "piezas", 130, 4, 12, 8, { bg: 0.5, mg: 1.5 }],
        ["Ala Receta Original", "pieza", "piezas", 130, 4, 10, 8, { h: 0.5, mg: 1, g: 0.5 }],
        ["Pechuga Extra Crispy", "pieza", "piezas", 530, 16, 34, 35, { h: 1, mg: 4.5, g: 2.5 }],
        ["Muslo Extra Crispy", "pieza", "piezas", 330, 11, 17, 24, { h: 1, mg: 1.5, g: 3 }],
        ["Pierna Extra Crispy", "pieza", "piezas", 170, 6, 12, 10, { h: 0.5, mg: 1.5, g: 0.5 }],
        ["Ala Extra Crispy", "pieza", "piezas", 190, 10, 10, 12, { h: 0.5, mg: 1.5, g: 1 }],
        ["Tender / Tira de pollo", "pieza", "piezas", 140, 8, 11, 7, { h: 0.5, mg: 1, g: 0.5 }],
        ["Sándwich de pollo", "unidad", "unidades", 650, 49, 34, 35, { h: 3.5, mg: 3.5, g: 2.5 }],
        ["Famous Bowl", "unidad", "unidades", 720, 77, 26, 35, { h: 5, mg: 1.5, g: 4.5 }],
        ["Papas (individual)", "orden", "órdenes", 320, 41, 4, 15, { h: 2.5, g: 2.5 }],
        ["Puré con gravy (individual)", "unidad", "unidades", 120, 18, 2, 5, { h: 1, g: 1 }],
        ["Ensalada de repollo (individual)", "unidad", "unidades", 170, 14, 1, 12, { h: 1, g: 2 }],
        ["Biscuit", "unidad", "unidades", 180, 22, 4, 8, { h: 1.5, g: 1.5 }]
    ] },
    { chain: "Popeyes", items: [
        ["Pechuga clásica (mild)", "pieza", "piezas", 380, 16, 35, 20, { h: 1, bg: 1, mg: 3.5 }],
        ["Muslo clásico (mild)", "pieza", "piezas", 280, 8, 17, 20, { h: 0.5, mg: 2, g: 2 }],
        ["Pierna clásica (mild)", "pieza", "piezas", 160, 5, 14, 9, { h: 0.5, bg: 0.5, mg: 1.5 }],
        ["Ala clásica (mild)", "pieza", "piezas", 150, 5, 10, 10, { h: 0.5, mg: 1.5 }],
        ["Sándwich de pollo clásico", "unidad", "unidades", 700, 50, 28, 42, { h: 3.5, mg: 2, g: 6 }],
        ["Tenders Blackened (3 piezas)", "orden", "órdenes", 170, 3, 27, 2, { h: 0.5, bg: 3.5 }]
    ] },
    { chain: "Church's Texas Chicken", items: [
        ["Pechuga original", "pieza", "piezas", 250, 8, 22, 14, { h: 0.5, bg: 1, mg: 2, g: 0.5 }],
        ["Muslo original", "pieza", "piezas", 360, 9, 21, 26, { h: 0.5, mg: 2.5, g: 3 }],
        ["Pierna original", "pieza", "piezas", 160, 6, 13, 10, { h: 0.5, mg: 1, g: 1 }],
        ["Ala original", "pieza", "piezas", 290, 9, 19, 20, { h: 0.5, mg: 2.5, g: 1.5 }],
        ["Tira de pollo picante", "pieza", "piezas", 120, 6, 9, 7, { h: 0.5, mg: 0.5, g: 1 }],
        ["Honey-Butter Biscuit", "unidad", "unidades", 230, 22, 3, 15, { h: 1.5, g: 2.5 }],
        ["Papas (regular)", "orden", "órdenes", 210, 27, 3, 10, { h: 1.5, g: 2 }]
    ] },
    { chain: "Rostipollos (estimado)", items: [
        ["1/4 de pollo (pechuga y ala, con piel)", "porción", "porciones", 330, 0, 40, 18, { bg: 3, mg: 3 }],
        ["1/4 de pollo (muslo y pierna, con piel)", "porción", "porciones", 380, 0, 35, 26, { bg: 0.5, mg: 5 }],
        ["1/2 pollo (con piel)", "porción", "porciones", 710, 0, 75, 44, { bg: 2.5, mg: 8.5 }],
        ["Papas fritas (orden)", "orden", "órdenes", 360, 46, 5, 17, { h: 3, g: 2.5 }]
    ] },
    { chain: "Subway (6 pulgadas)", items: [
        ["Italian B.M.T.", "sub", "subs", 450, 47, 23, 21, { h: 3, mg: 2, g: 1.5 }],
        ["Pollo teriyaki", "sub", "subs", 380, 60, 26, 5, { h: 4, bg: 1.5 }],
        ["Pollo rostizado", "sub", "subs", 320, 47, 23, 5, { h: 3, bg: 2 }],
        ["Pavo", "sub", "subs", 280, 46, 18, 4, { h: 3, bg: 1 }],
        ["Jamón", "sub", "subs", 290, 46, 18, 5, { h: 3, bg: 1.5 }],
        ["Atún", "sub", "subs", 510, 36, 21, 30, { h: 2.5, mg: 2, g: 3.5 }],
        ["Steak & Cheese", "sub", "subs", 380, 48, 24, 10, { h: 3, bg: 2, mg: 0.5, g: 0.5 }],
        ["Veggie Delite", "sub", "subs", 230, 44, 9, 3, { h: 3 }],
        ["Pavo y jamón", "sub", "subs", 460, 41, 26, 22, { h: 2.5, mg: 2.5, g: 1.5 }],
        ["Albóndigas (Meatball Marinara)", "sub", "subs", 480, 59, 21, 18, { h: 4, mg: 1.5, g: 1 }],
        ["Pizza Sub", "sub", "subs", 480, 45, 21, 24, { h: 3, mg: 2, g: 2 }],
        ["Galleta de chocolate", "unidad", "unidades", 210, 30, 2, 10, { h: 2, g: 1 }]
    ] },
    { chain: "Taco Bell", items: [
        ["Taco crujiente", "unidad", "unidades", 170, 13, 8, 9, { h: 1, bg: 0.5, g: 1.5 }],
        ["Taco crujiente Supreme", "unidad", "unidades", 190, 14, 8, 11, { h: 1, mg: 0.5, g: 1.5 }],
        ["Taco suave", "unidad", "unidades", 180, 17, 9, 9, { h: 1, mg: 1, g: 0.5 }],
        ["Crunchwrap Supreme", "unidad", "unidades", 530, 71, 16, 21, { h: 4.5, mg: 0.5, g: 3 }],
        ["Burrito Supreme de res", "unidad", "unidades", 390, 43, 16, 16, { h: 3, mg: 1, g: 1.5 }],
        ["Burrito de frijol", "unidad", "unidades", 380, 55, 13, 11, { h: 3.5, mg: 1, g: 0.5 }],
        ["Quesadilla de pollo", "unidad", "unidades", 510, 37, 27, 27, { h: 2.5, mg: 3, g: 2 }],
        ["Quesadilla de queso", "unidad", "unidades", 470, 37, 19, 26, { h: 2.5, mg: 1.5, g: 3.5 }],
        ["Mexican Pizza", "unidad", "unidades", 540, 46, 20, 30, { h: 3, mg: 1.5, g: 4 }],
        ["Cheesy Gordita Crunch", "unidad", "unidades", 500, 40, 20, 28, { h: 2.5, mg: 2.5, g: 2.5 }],
        ["Chalupa Supreme de res", "unidad", "unidades", 350, 30, 12, 21, { h: 2, mg: 1, g: 2.5 }],
        ["Nachos BellGrande", "orden", "órdenes", 740, 79, 16, 39, { h: 5.5, g: 6.5 }]
    ] }
];

/* Búsqueda rápida por clave "Cadena · Nombre" (para Frecuentes y para volver a agregar) */
const FAST_FOOD_BY_KEY = new Map();
FAST_FOOD.forEach(({ chain, items }) => items.forEach(it => FAST_FOOD_BY_KEY.set(`${chain} · ${it[0]}`, { chain, item: it })));
