/* =========================================================
    VERSIÓN Y NOVEDADES
    Al publicar una versión: sube APP_VERSION (y "version" en package.json, igual)
    y añade arriba en CHANGELOG lo nuevo, en frases cortas para el usuario.
    Cada teléfono ve el aviso de novedades una sola vez por versión.
========================================================= */

const APP_VERSION = "1.5.0";

const CHANGELOG = [
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
