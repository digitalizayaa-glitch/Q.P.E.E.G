/* =========================================================
    VERSIÓN Y NOVEDADES
    Al publicar una versión: sube APP_VERSION (y "version" en package.json, igual)
    y añade arriba en CHANGELOG lo nuevo, en frases cortas para el usuario.
    Cada teléfono ve el aviso de novedades una sola vez por versión.
========================================================= */

const APP_VERSION = "2.3.2";   /* x.y.Z sin notas = hotfix: no sale en Novedades */

const CHANGELOG = [
    {
        v: "2.3.0",
        items: [
            "Nuevas bebidas en Comida, con su propio filtro \"Bebidas\": Coca-Cola, Pepsi, Sprite, Fanta, Kolita, Fresca, 7Up, Ginger Ale, tés fríos Tropical y Fuze Tea, Arizona, Gatorade, Powerade, Red Bull, Monster y néctares Del Valle.",
            "Cada bebida va por lata, botella o vaso, con sus calorías reales. El azúcar cuenta como harinas, y las versiones cero o sin azúcar no suman porciones.",
            "Para el café: azúcar (4 cdtas = 1 harina; 2 cdtas = media porción) y cremas Coffee-mate en polvo y líquida, media crema Nestlé y crema dulce."
        ]
    },
    {
        v: "2.2.0",
        items: [
            "Los números que se deslizan (peso, series, reps, rangos, deportes y metas) ya no cambian sin querer al recorrer la app: toca uno para activarlo, late con el color de la app y ahí lo deslizas. A los 3 segundos sin usarlo se bloquea de nuevo.",
            "Para abrir el cuadro de un número, tócalo dos veces.",
            "En el entreno de un día y en el editor de rutinas, la casita se vuelve una flecha para regresar a la sección de antes.",
            "Nuevo botón ✓ en el entreno del día: lo das por terminado aunque falten ejercicios por marcar (los que faltan no cuentan). Tócalo otra vez para quitarlo.",
            "Entreno más ordenado: peso × series × reps ocupa lo mismo que las 4 series y deja todo el espacio a la imagen. La unidad (kg o lb) se cambia en Rutinas."
        ]
    },
    {
        v: "2.1.0",
        items: [
            "Nuevo en Ajustes: elige la fuente de la app entre Atkinson, Grotesk, Saira y Arial. Cada botón se ve con su propia letra.",
            "Las fuentes nuevas miden igual que Arial, así que la app se ve igual de ordenada con cualquiera.",
            "Al instalar la app por primera vez te toca una de las tres al azar, y un globo junto a la tuerca te invita a personalizarla."
        ]
    },
    {
        v: "2.0.0",
        items: [
            "Versión 2.0: Q.P.E.E.G estrena casa propia en qpeeg.digitalizayaa.workers.dev, con la app y la sincronización en el mismo lugar.",
            "Más segura: la app solo carga su propio código y el servidor tiene protección contra abusos.",
            "Si vienes de la dirección anterior, la app te guía para pasarte con tu cuenta en un toque."
        ]
    },
    {
        v: "1.16.0",
        items: [
            "Guía para instalar la app en tu teléfono o computadora (iPhone, Android y computadora), paso a paso. También en Ajustes → Instalar la app.",
            "La app se muda a una dirección nueva: la de siempre te enseña cómo pasarte con tu cuenta, y la nueva te da la bienvenida con un espacio para tu código y cómo instalarla.",
            "Los botones ya no se pintan de azul al tocarlos."
        ]
    },
    {
        v: "1.15.0",
        items: [
            "Política de privacidad y aviso de salud: al abrir la app se aceptan una vez, y se pueden revisar o cambiar en Ajustes → Privacidad y salud → Mis acuerdos.",
            "Nuevo y opcional: compartir tus datos de entrenamiento (rutinas, series y deportes, sin tu código ni tu cuenta) para ayudar a mejorar la app.",
            "\"Borrar mi cuenta\" en Ajustes: borra del servidor tu cuenta, sus copias y lo que hayas compartido."
        ]
    },
    {
        v: "1.14.1",
        items: [
            "Carga de deportes: cada dato (tiempo, km, desnivel) se compara con tu salida normal y se promedia. Con 3 datos cuenta cada uno un tercio, con 2 la mitad; una salida normal da 100 pongas los datos que pongas.",
            "Añadir deporte: ▲ arriba y ▼ abajo de cada campo, campos más altos que se deslizan, y desnivel de 5 en 5.",
            "Toca un deporte de la semana para cambiarlo.",
            "Gráfica de deportes más clara (\"Carga 100 = normal\", detalle en un renglón) y el título del día siempre centrado.",
            "El nombre de cada calendario (Rutinas, Calorías, Deportes) ahora es texto normal, no parece botón."
        ]
    },
    {
        v: "1.14.0",
        items: [
            "Deportes con tiempo, distancia y desnivel positivo: pon uno, dos o los tres datos.",
            "Nueva \"carga\": 100 es una salida normal para ti (según las calorías de mantenimiento de tu plan). Más de 100, una salida más dura de lo normal.",
            "Historial → Deportes: una sola gráfica con la carga de todos tus deportes y la línea de lo normal."
        ]
    },
    {
        v: "1.13.0",
        items: [
            "Si algo falla en tu teléfono, la app envía un aviso anónimo (sin tus datos) para poder arreglarlo.",
            "Más fácil de leer y de tocar: textos grises con más contraste y botones pequeños con más área de toque.",
            "Lectores de pantalla: el calendario dice cómo fue cada día (por ejemplo, \"calorías en meta\"), no solo con colores.",
            "Probada también en Safari (iPhone)."
        ]
    },
    {
        v: "1.12.0",
        items: [
            "Sincronización más ligera: ya no consulta al servidor cada 90 segundos; sincroniza al abrir la app, al volver a ella y después de cada cambio.",
            "Las cuentas que no se abren en 2 meses y medio se borran del servidor (si el teléfono vuelve después, sube lo que tiene).",
            "Cada cuenta puede ocupar hasta 1 MB; si se pasa, Ajustes → Cuenta lo avisa."
        ]
    },
    {
        v: "1.11.0",
        items: [
            "Cuentas más simples: tu código es tu cuenta. Escríbelo en otro teléfono y los dos tendrán los mismos datos; si escribes el código de otra persona, el teléfono cambia a esa cuenta y la tuya queda guardada con tu código. Ya no se mezclan cuentas.",
            "Versiones anteriores: el servidor guarda copias de tu cuenta y puedes volver a una de antes desde Ajustes → Cuenta.",
            "Cambiar mi código: crea un código nuevo con tus datos y el anterior deja de funcionar."
        ]
    },
    {
        v: "1.10.3",
        items: ["Editor de rutinas: la tuerca ⚙ junto al nombre del día permite cambiar el orden de los ejercicios."]
    },
    {
        v: "1.10.2",
        items: [
            "Pan cuadrado Bimbo: ahora se cuenta por rebanada (1 rebanada = 73 kcal = 1 harina).",
            "Catálogo de comida sin repetidos: se quitaron los alimentos INISA que ya estaban (huevo, aguacate, leche, frutas…); los que quedan muestran su porción en tazas, cucharadas o unidades.",
            "El contador dice \"1 rebanada\", \"1 lata\" o \"1 porción\" en singular."
        ]
    },
    {
        v: "1.10.1",
        items: ["Catálogo de ejercicios: se añadieron curl polea baja, bíceps martillo, extensión de rodillas, femoral acostado, press inclinado con mancuernas, extensión de tríceps V, copa con mancuerna, laterales y frontales con mancuernas, elevación laterales, pullover en polea, hip thrust máquina, desplante búlgaro y pantorrillas en máquina."]
    },
    {
        v: "1.10.0",
        items: [
            "Nuevos dibujos de ejercicios: sentadilla goblet y sumo, aductores y abductores en máquina, press de pecho en máquina, remo con barra Z, femoral sentado, pullover acostado, posterior en máquina, pantorrillas en prensa y patada de glúteo en polea.",
            "Más ejercicios en el catálogo (jalón y remo por agarre, prensa vertical, desplantes caminando y más) y mejor reconocimiento de nombres como \"Desplante búlgaro\", \"Laterales\" o \"Copa con mancuerna\"."
        ]
    },
    {
        v: "1.9.2",
        items: ["Comida: se añadió el chimichurri tico (en Vegetales) y el chimichurri argentino con aceite (en Grasas)."]
    },
    {
        v: "1.9.1",
        items: [
            "Entreno: el cuadro de serie extra queda a la misma altura que las demás series.",
            "Historial: el nombre del calendario (Entrenos, Calorías o Deportes) ahora va entre el calendario y los botones."
        ]
    },
    {
        v: "1.9.0",
        items: [
            "Nuevo en Agregar comida → Supermercado: galletas (Chiky, Yipy, Oreo, Sponch, Pozuelo y más), snacks (Ranchitas, Picaritas, Papiolas, Pringles, Doritos, Zambos y más) y chocolates.",
            "Historial: arriba del calendario se indica cuál estás viendo (Entrenos, Calorías o Deportes).",
            "Calendario con verde, amarillo y rojo más vivos, con un toque del color de la app.",
            "El día de hoy se marca con un pulso del color de la app."
        ]
    },
    {
        v: "1.8.0",
        items: [
            "Historial: las 3 gráficas tienen siempre el mismo tamaño y los botones ya no se mueven al cambiar de gráfica o de periodo.",
            "Las flechas ▲ ▼ de todos los cuadros de cantidad llevan el color de la app.",
            "Nueva tuerca ⚙ junto al nombre de cada ejercicio (en Entreno y en el editor de rutinas): cambia el nombre o elige su imagen en una galería.",
            "Imágenes nuevas en la galería: mancuerna, barra y barra de dominadas."
        ]
    },
    {
        v: "1.7.1",
        items: ["Semana: con más de 4 días, los días se ven en dos columnas. Si son impares, el último va abajo y centrado."]
    },
    {
        v: "1.7.0",
        items: [
            "Nuevo en Ajustes → Cuenta: crea tu código de cuenta y usa tus datos en varios teléfonos, sin correo ni contraseña.",
            "Los datos se cifran en tu teléfono antes de subirse: nadie más puede leerlos.",
            "La app sigue funcionando sin internet y se sincroniza sola cuando hay conexión.",
            "Para pasar tus datos a otro teléfono: Ajustes → Cuenta → Vincular otro teléfono, y en el otro escribe el código temporal.",
            "Guarda tu código de cuenta en un lugar seguro: sin él no se puede recuperar la cuenta."
        ]
    },
    {
        v: "1.6.0",
        items: [
            "Historial de comida: la franja más reciente sale arriba. Al mediodía, Mediodía va primero y Mañana debajo; dentro de cada franja, lo último primero.",
            "Los menús emergentes son más altos: empiezan más arriba y terminan más abajo.",
            "Agregar comida: filtros por grupo debajo del buscador (Frecuentes, Harinas, Proteínas, Grasas… y Comida rápida).",
            "El buscador tiene una lupa, y Enter cierra el teclado para ver los resultados.",
            "Si vuelves a tocar algo que ya agregaste en el menú, se abre con esa cantidad para subirla o bajarla. Si la dejas en 0, se quita."
        ]
    },
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
