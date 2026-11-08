/* =========================================================
    VERSIÓN Y NOVEDADES
    Al publicar una versión: sube APP_VERSION (y "version" en package.json, igual)
    y añade arriba en CHANGELOG lo nuevo, en frases cortas para el usuario.
    Cada teléfono ve el aviso de novedades una sola vez por versión.
========================================================= */

const APP_VERSION = "1.5.6";

const CHANGELOG = [
    {
        v: "1.5.6",
        items: [
            "Al tocar un día en el calendario, toda la app queda en ese día (Semana, Entreno, Comida e Historial) y puedes deslizar entre pestañas sin volver a hoy.",
            "Para volver a hoy, toca el botón \"Hoy\" a la derecha de la fecha, o la casita.",
            "El título ya no se corta con fechas largas: se ajusta al espacio.",
            "En el calendario se marca el día que estás viendo."
        ]
    },
    {
        v: "1.5.5",
        items: [
            "Pan cuadrado blanco Bimbo: 2 rebanadas (62 g) son 146 kcal, que equivalen a 2 harinas.",
            "Salmón separado de la pechuga: 30 g = 0,5 prot. BG · 0,5 prot. MG.",
            "Mayonesa Delga-C ultra light: la porción son 3 cucharadas (45 g) = 1 grasa.",
            "Cocoa 0 % azúcar: la porción son 4 cucharaditas (20 g).",
            "Torta de arroz: 1 torta = 100 g."
        ]
    },
    {
        v: "1.5.4",
        items: [
            "Leche: ahora hay entera, semidescremada (2 %) y descremada, cada una con sus calorías.",
            "Leche de coco: de cartón (con y sin azúcar) y de lata (normal y light).",
            "Yogurts: natural y de sabor, en 0 % grasa, griego y normal.",
            "Chicharritos: de cerdo o de harina y maíz.",
            "Helado Prote DP y torta de arroz calibrados con su tabla nutricional."
        ]
    },
    {
        v: "1.5.3",
        items: [
            "Porciones recalibradas: cada producto de comida rápida tiene su equivalencia ajustada, con un error medio del 1,4 % frente a sus calorías reales. Lo que ya registraste se corrige solo.",
            "Refrescos y salsas: ahora cuentan las porciones de harina que corresponden a sus calorías.",
            "Catálogo normal: nuggets Pipasa, ricotta, chocolate oscuro, miel, mermelada, pasas y leche condensada tienen sus calorías reales y se reparten en los grupos que corresponden.",
            "Las flechas vuelven a subir de 1 en 1. Las medias porciones (0,5 · 1,5 · 2,5) se escriben tocando el número."
        ]
    },
    {
        v: "1.5.2",
        items: [
            "Comida rápida: ahora también suma porciones. Cada producto se reparte en harinas, proteína y grasas (por ejemplo, 1 slice = 2,5 harinas · 0,5 prot. MG · 1 grasa). Lo que ya registraste se corrige solo.",
            "Al agregar comida rápida ves a cuántas porciones equivale, y en el historial aparece la equivalencia de cada cosa.",
            "Las cantidades se cambian de media en media (0,5 · 1 · 1,5 · 2,5…)."
        ]
    },
    {
        v: "1.5.1",
        items: [
            "Comida rápida: catálogo más grande, con Wendy's, Little Caesars, Carl's Jr., Church's Texas Chicken y Rostipollos, y más productos en las cadenas que ya estaban.",
            "Pizza de jamón y queso en todas las pizzerías, por slice."
        ]
    },
    {
        v: "1.5.0",
        items: [
            "Comida: nuevo botón a la par de la barra de calorías para dar el día. Completa las calorías que faltan como volumen sucio, para los días en que comes fuera de lo común. Si lo tocas otra vez, lo quitas.",
            "Comida: catálogo de comida rápida (Papa John's, Pizza Hut, Rey Pizza, Domino's, McDonald's, Burger King, KFC, Popeyes, Subway y Taco Bell). Las pizzas van por slice.",
            "Lo que comes en comida rápida también suma carbohidratos, proteína y grasa, y puede salir en Frecuentes."
        ]
    },
    {
        v: "1.4.0",
        items: [
            "Rutinas y Semana: las tarjetas de rutinas y días tienen el color de los botones.",
            "Comida: puedes agregar varias comidas seguidas. Cada una se marca con el color de la app y el menú no se cierra.",
            "Comida: nueva sección Frecuentes arriba del menú, con lo que agregaste más de 3 veces. Si pasan 3 días sin agregarla, desaparece."
        ]
    },
    {
        v: "1.3.1",
        items: [
            "Comida: el botón \"Ver historial\" ahora tiene el color de los demás botones.",
            "Test TDEE: el máximo potencial muscular muestra tu peso con 10 %, 13 % y 16 % de grasa (mujeres: 18 %, 21 % y 24 %)."
        ]
    },
    {
        v: "1.3.0",
        items: [
            "Comida: carbohidratos, proteína y grasa muestran lo que llevas y tu meta según el test y tu tipo de dieta.",
            "La versión de la app aparece abajo en la pantalla de inicio. Tócala para volver a ver las novedades.",
            "Tus datos se guardan de forma más segura y la app se actualiza sola.",
            "Las ventanas se abren desde arriba hacia abajo.",
            "Dibujos corregidos: presses y elevación de talones."
        ]
    }
];

if (typeof module !== "undefined" && module.exports) module.exports = { APP_VERSION, CHANGELOG };
