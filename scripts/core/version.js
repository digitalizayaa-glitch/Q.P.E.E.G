/* =========================================================
    VERSIÓN Y NOVEDADES
    Al publicar una versión: sube APP_VERSION (y "version" en package.json, igual)
    y añade arriba en CHANGELOG lo nuevo, en frases cortas para el usuario.
    Cada teléfono ve el aviso de novedades una sola vez por versión.
========================================================= */

const APP_VERSION = "1.3.0";

const CHANGELOG = [
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
