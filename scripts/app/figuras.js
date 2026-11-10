/* =========================================================
    FIGURAS DE CRISTAL (Entreno)
    Una persona de palitos de vidrio a mitad del recorrido del ejercicio,
    con una flecha (como la "←" del encabezado) que indica hacia dónde
    termina el movimiento. Imagen fija, sin animación.
    Bancos, barras, poleas y suelo van en líneas grises.
    Toma los colores del destello elegido en Ajustes.
========================================================= */

/* Lienzo de 100 × 120; suelo en y = 110. Vista de lado mirando a la derecha, salvo "front" (de frente) o "top" (desde arriba).
   Puntos: h cabeza · n hombros · p cadera · e codo · w mano · k rodilla · f tobillo · t punta del pie
   e2/w2/k2/f2/t2: el otro brazo o pierna. De lado, si no se dan, va igual pero un poco detrás.
   kit: [tipo, x, y]  — "bar" disco de barra · "db" mancuerna · "handle" agarre · "wheel" rueda · "pad" almohadilla
   props: trazo gris fijo (banco, barra, polea, suelo)
   arrows: [x1, y1, x2, y2] recta o [x1, y1, x2, y2, cx, cy] curva; la punta va en (x2, y2) */
const FLOOR = "M4 110 H96";
const FIGURE_POSES = {
    /* ---------- Pecho ---------- */
    bench: {
        props: `M16 80 H80 M22 80 V110 M74 80 V110 ${FLOOR}`,
        j: { h: [19, 72], n: [29, 76], p: [60, 77], e: [39, 71], w: [39, 52], k: [79, 80], f: [83, 108] },
        kit: [["bar", 39, 51]], arrows: [[52, 64, 52, 44]]
    },
    incline: {
        props: `M20 56 L42 86 H68 M46 86 V110 M66 86 V110 ${FLOOR}`,
        j: { h: [21, 52], n: [28, 61], p: [46, 82], e: [38, 63], w: [38, 44], k: [68, 78], f: [74, 108] },
        kit: [["bar", 38, 43]], arrows: [[52, 56, 52, 36]]
    },
    fly: {   /* desde arriba: acostado en el banco, brazos abiertos */
        top: true, props: "M41 20 H59 V74 H41 Z",
        j: { h: [50, 16], n: [50, 27], p: [50, 66], e: [35, 31], w: [21, 39], e2: [65, 31], w2: [79, 39], k: [45, 87], f: [44, 106], k2: [55, 87], f2: [56, 106] },
        kit: [["db", 20, 40], ["db", 80, 40]], arrows: [[14, 50, 34, 47, 20, 56], [86, 50, 66, 47, 80, 56]]
    },
    crossover: {   /* de frente: brazos abiertos que se juntan al frente */
        front: true, props: `M10 110 V12 M90 110 V12 M10 16 L25 49 M90 16 L75 49 ${FLOOR}`,
        j: { h: [50, 21], n: [50, 31], p: [50, 63], e: [36, 39], w: [25, 49], e2: [64, 39], w2: [75, 49], k: [45, 86], f: [43, 108], k2: [55, 86], f2: [57, 108] },
        kit: [["handle", 25, 50], ["handle", 75, 50]], arrows: [[24, 60, 42, 60, 30, 68], [76, 60, 58, 60, 70, 68]]
    },
    dips: {   /* entre barras paralelas: de lado se ve una barra corta con su poste */
        props: `M40 64 H66 M62 64 V110 ${FLOOR}`,
        j: { h: [51, 32], n: [49, 41], p: [46, 71], e: [37, 53], w: [52, 64], k: [50, 90], f: [36, 96] },
        arrows: [[64, 48, 64, 28]]
    },
    pushup: {
        props: FLOOR,
        j: { h: [79, 80], n: [70, 84], p: [42, 94], e: [60, 95], w: [70, 108], k: [27, 100], f: [13, 106] },
        arrows: [[56, 76, 56, 58]]
    },

    /* ---------- Espalda ---------- */
    pullup: {   /* de frente, colgado de la barra */
        front: true, props: "M16 12 H84",
        j: { h: [50, 30], n: [50, 40], p: [50, 72], e: [33, 31], w: [31, 13], e2: [67, 31], w2: [69, 13], k: [47, 91], f: [49, 108], k2: [53, 91], f2: [51, 108] },
        arrows: [[80, 78, 80, 56]]
    },
    pulldown: {   /* de frente, sentado: la barra baja hacia el pecho */
        front: true, props: `M18 26 H82 M50 26 V2 M32 82 H68 M36 82 V110 M64 82 V110 ${FLOOR}`,
        j: { h: [50, 38], n: [50, 48], p: [50, 80], e: [33, 44], w: [27, 27], e2: [67, 44], w2: [73, 27], k: [41, 84], f: [41, 108], k2: [59, 84], f2: [59, 108] },
        arrows: [[90, 30, 90, 52]]
    },
    row: {   /* inclinado con barra */
        props: FLOOR,
        j: { h: [78, 45], n: [69, 49], p: [40, 58], e: [59, 63], w: [61, 79], k: [47, 83], f: [42, 108] },
        kit: [["bar", 61, 80]], arrows: [[78, 82, 78, 62]]
    },
    dbrow: {   /* rodilla y mano en el banco */
        props: `M10 74 H58 M14 74 V110 M54 74 V110 ${FLOOR}`,
        j: { h: [69, 56], n: [60, 58], p: [31, 61], e: [55, 70], w: [60, 85], k: [37, 84], f: [35, 108], e2: [57, 66], w2: [54, 73], k2: [30, 73], f2: [14, 73] },
        kit: [["db", 60, 86]], arrows: [[72, 88, 72, 68]]
    },
    cablerow: {   /* sentado, polea baja */
        props: `M18 84 H46 M22 84 V110 M42 84 V110 M88 110 V58 M58 58 L88 62 ${FLOOR}`,
        j: { h: [37, 39], n: [36, 48], p: [33, 80], e: [41, 62], w: [56, 58], k: [60, 72], f: [84, 98] },
        kit: [["handle", 57, 58]], arrows: [[72, 48, 54, 48]]
    },
    pullover: {   /* de pie, brazos rectos bajando la polea */
        props: `M90 4 V110 M90 8 L77 48 ${FLOOR}`,
        j: { h: [58, 23], n: [54, 32], p: [46, 62], e: [66, 40], w: [77, 48], k: [49, 85], f: [46, 108] },
        kit: [["handle", 77, 49]], arrows: [[84, 58, 66, 78, 86, 72]]
    },
    hinge: {   /* peso muerto: barra a la altura de la rodilla */
        props: FLOOR,
        j: { h: [66, 33], n: [58, 40], p: [38, 58], e: [58, 57], w: [58, 74], k: [51, 84], f: [44, 108] },
        kit: [["bar", 58, 76]], arrows: [[76, 86, 76, 64]]
    },

    /* ---------- Hombro ---------- */
    ohp: {
        props: FLOOR,
        j: { h: [50, 32], n: [50, 41], p: [50, 72], e: [62, 42], w: [64, 27], k: [51, 91], f: [49, 109] },
        kit: [["bar", 64, 26]], arrows: [[78, 34, 78, 14]]
    },
    lateral: {   /* de frente, brazos a medio subir */
        front: true, props: FLOOR,
        j: { h: [50, 21], n: [50, 31], p: [50, 63], e: [39, 41], w: [28, 50], e2: [61, 41], w2: [72, 50], k: [45, 86], f: [43, 108], k2: [55, 86], f2: [57, 108] },
        kit: [["db", 27, 51], ["db", 73, 51]], arrows: [[20, 58, 14, 36, 12, 50], [80, 58, 86, 36, 88, 50]]
    },
    frontraise: {
        props: FLOOR,
        j: { h: [50, 22], n: [50, 31], p: [50, 62], e: [61, 40], w: [71, 49], k: [51, 85], f: [49, 108] },
        kit: [["db", 72, 50]], arrows: [[82, 54, 76, 30, 86, 40]]
    },
    reardelt: {   /* pájaros: inclinado, brazos abriendo hacia arriba */
        props: FLOOR,
        j: { h: [78, 45], n: [69, 49], p: [40, 58], e: [68, 64], w: [67, 79], k: [47, 83], f: [42, 108] },
        kit: [["db", 67, 80]], arrows: [[80, 86, 76, 62, 88, 70]]
    },
    facepull: {
        props: `M92 4 V110 M92 22 L70 25 ${FLOOR}`,
        j: { h: [50, 22], n: [50, 31], p: [50, 62], e: [61, 23], w: [70, 25], k: [51, 85], f: [49, 108] },
        kit: [["handle", 70, 25]], arrows: [[80, 12, 62, 12]]
    },
    shrug: {
        front: true, props: FLOOR,
        j: { h: [50, 21], n: [50, 31], p: [50, 63], e: [42, 47], w: [41, 63], e2: [58, 47], w2: [59, 63], k: [45, 86], f: [43, 108], k2: [55, 86], f2: [57, 108] },
        kit: [["db", 41, 65], ["db", 59, 65]], arrows: [[30, 34, 30, 16], [70, 34, 70, 16]]
    },

    /* ---------- Brazos ---------- */
    curl: {
        props: FLOOR,
        j: { h: [50, 22], n: [50, 31], p: [50, 62], e: [52, 48], w: [67, 47], k: [51, 85], f: [49, 108] },
        kit: [["db", 68, 47]], arrows: [[78, 54, 66, 32, 82, 38]]
    },
    pushdown: {   /* extensión en polea: el antebrazo baja */
        props: `M70 4 V110 M70 8 L62 56 ${FLOOR}`,
        j: { h: [50, 22], n: [50, 31], p: [50, 62], e: [52, 47], w: [62, 57], k: [51, 85], f: [49, 108] },
        kit: [["handle", 62, 57]], arrows: [[78, 56, 64, 72, 78, 70]]
    },
    overhead: {   /* extensión sobre la cabeza: la mano sube */
        props: FLOOR,
        j: { h: [45, 33], n: [50, 41], p: [50, 72], e: [60, 22], w: [45, 15], k: [51, 91], f: [49, 109] },
        kit: [["db", 44, 14]], arrows: [[32, 22, 52, 5, 32, 4]]
    },
    skull: {   /* press francés: acostado, el antebrazo sube */
        props: `M16 80 H80 M22 80 V110 M74 80 V110 ${FLOOR}`,
        j: { h: [19, 72], n: [29, 76], p: [60, 77], e: [30, 59], w: [19, 50], k: [79, 80], f: [83, 108] },
        kit: [["bar", 18, 49]], arrows: [[8, 40, 26, 36, 10, 30]]
    },
    benchdip: {   /* fondos de tríceps en banco */
        props: `M8 72 H38 M12 72 V110 M34 72 V110 ${FLOOR}`,
        j: { h: [45, 51], n: [44, 60], p: [46, 88], e: [30, 62], w: [36, 72], k: [66, 96], f: [86, 106] },
        arrows: [[58, 74, 58, 54]]
    },
    kickback: {   /* patada de tríceps: inclinado, el antebrazo va hacia atrás */
        props: FLOOR,
        j: { h: [77, 47], n: [68, 50], p: [40, 58], e: [52, 52], w: [41, 63], k: [46, 83], f: [42, 108], e2: [70, 66], w2: [72, 80] },
        kit: [["db", 40, 64]], arrows: [[40, 74, 28, 56, 30, 70]]
    },

    /* ---------- Pierna ---------- */
    squat: {
        props: FLOOR,
        j: { h: [58, 34], n: [52, 44], p: [38, 72], e: [40, 54], w: [44, 46], k: [60, 86], f: [48, 108] },
        kit: [["bar", 45, 45]], arrows: [[74, 66, 74, 44]]
    },
    legpress: {   /* recostado, empuja la plataforma en diagonal */
        props: `M10 64 L28 96 H50 M30 96 V110 M64 42 L86 64 ${FLOOR}`,
        j: { h: [14, 62], n: [19, 71], p: [33, 92], e: [26, 84], w: [34, 92], k: [52, 74], f: [75, 54] },
        arrows: [[78, 76, 92, 62]]
    },
    lunge: {
        props: FLOOR,
        j: { h: [50, 34], n: [49, 43], p: [48, 74], e: [50, 59], w: [50, 75], k: [66, 86], f: [64, 108], k2: [38, 97], f2: [24, 104], t2: [20, 108] },
        kit: [["db", 50, 77]], arrows: [[80, 70, 80, 50]]
    },
    bulgarian: {   /* pie de atrás sobre el banco */
        props: `M4 82 H28 M8 82 V110 M24 82 V110 ${FLOOR}`,
        j: { h: [51, 32], n: [50, 41], p: [48, 72], e: [50, 57], w: [50, 73], k: [64, 85], f: [62, 108], k2: [36, 95], f2: [24, 82] },
        kit: [["db", 50, 75]], arrows: [[80, 68, 80, 48]]
    },
    legext: {   /* extensión de cuádriceps sentado */
        props: `M26 84 H58 M30 84 V110 M54 84 V110 M26 84 L22 42 ${FLOOR}`,
        j: { h: [34, 39], n: [35, 48], p: [40, 80], e: [44, 64], w: [50, 82], k: [62, 80], f: [79, 96] },
        kit: [["pad", 80, 97]], arrows: [[90, 100, 92, 78, 96, 92]]
    },
    legcurl: {   /* curl femoral acostado boca abajo */
        props: `M22 82 H80 M26 82 V110 M76 82 V110 ${FLOOR}`,
        j: { h: [85, 72], n: [75, 76], p: [49, 78], e: [82, 82], w: [92, 80], k: [27, 78], f: [15, 64] },
        kit: [["pad", 14, 63]], arrows: [[8, 72, 20, 50, 4, 56]]
    },
    calf: {   /* sobre el borde de un escalón: el talón sube y el cuerpo se eleva */
        props: `M50 100 H76 V110 ${FLOOR}`,
        j: { h: [48, 14], n: [48, 23], p: [48, 55], e: [54, 38], w: [57, 53], k: [48, 77], f: [48, 96], t: [57, 100],
             e2: [44, 38], w2: [42, 53], k2: [46, 77], f2: [46, 96], t2: [55, 100] },
        kit: [["db", 57, 55]], arrows: [[32, 90, 32, 70]]
    },

    /* ---------- Glúteo ---------- */
    hipthrust: {   /* espalda apoyada en el banco, la cadera sube */
        props: `M4 78 H28 M8 78 V110 M24 78 V110 ${FLOOR}`,
        j: { h: [17, 73], n: [26, 78], p: [52, 87], e: [39, 88], w: [51, 82], k: [70, 77], f: [76, 108] },
        kit: [["bar", 52, 80]], arrows: [[40, 70, 40, 52]]
    },
    bridge: {   /* puente de glúteo en el suelo */
        props: FLOOR,
        j: { h: [16, 103], n: [25, 104], p: [50, 94], e: [36, 108], w: [46, 108], k: [68, 82], f: [76, 108] },
        arrows: [[50, 82, 50, 62]]
    },
    kick: {   /* patada de glúteo en cuatro apoyos */
        props: FLOOR,
        j: { h: [85, 74], n: [76, 80], p: [46, 82], e: [77, 95], w: [78, 108], k: [26, 86], f: [20, 66], k2: [46, 106], f2: [30, 108] },
        arrows: [[12, 90, 10, 64, 4, 80]]
    },
    abduct: {   /* de frente, la pierna se abre hacia afuera */
        front: true, props: `M86 30 V110 ${FLOOR}`,
        j: { h: [50, 21], n: [50, 31], p: [50, 63], e: [43, 47], w: [41, 62], e2: [66, 42], w2: [84, 48], k: [41, 85], f: [33, 106], k2: [54, 86], f2: [55, 108] },
        arrows: [[26, 104, 14, 88, 16, 102]]
    },

    /* ---------- Abdomen ---------- */
    crunch: {
        props: FLOOR,
        j: { h: [28, 86], n: [36, 92], p: [58, 102], e: [34, 80], w: [26, 84], k: [74, 86], f: [86, 108] },
        arrows: [[20, 74, 42, 66, 26, 62]]
    },
    legraise: {   /* acostado, piernas rectas suben */
        props: FLOOR,
        j: { h: [16, 102], n: [25, 104], p: [54, 104], e: [36, 108], w: [46, 108], k: [68, 90], f: [81, 77] },
        arrows: [[90, 86, 80, 60, 94, 68]]
    },
    wheel: {   /* rueda abdominal: de rodillas, vuelve hacia atrás */
        props: FLOOR,
        j: { h: [80, 70], n: [72, 74], p: [46, 86], e: [80, 88], w: [86, 100], k: [40, 106], f: [22, 108] },
        kit: [["wheel", 88, 103]], arrows: [[70, 60, 52, 60]]
    },
    twist: {   /* sentado inclinado hacia atrás, gira con el peso */
        props: FLOOR,
        j: { h: [24, 66], n: [30, 74], p: [42, 100], e: [44, 82], w: [54, 82], k: [62, 90], f: [80, 96] },
        kit: [["bar", 56, 82]], arrows: [[50, 66, 68, 66, 60, 56]]
    },
    /* ---------- Variantes con su propio dibujo ---------- */
    decline: {   /* banco declinado: la cabeza más abajo que la cadera */
        props: `M14 90 L80 74 M24 88 V110 M70 77 V110 ${FLOOR}`,
        j: { h: [18, 87], n: [28, 85], p: [58, 78], e: [38, 78], w: [38, 59], k: [76, 68], f: [84, 82] },
        kit: [["bar", 38, 58]], arrows: [[52, 72, 52, 52]]
    },
    dbpress: {   /* press con mancuernas en banco plano */
        props: `M16 80 H80 M22 80 V110 M74 80 V110 ${FLOOR}`,
        j: { h: [19, 72], n: [29, 76], p: [60, 77], e: [39, 71], w: [39, 53], k: [79, 80], f: [83, 108] },
        kit: [["db", 39, 52]], arrows: [[52, 64, 52, 44]]
    },
    pecdeck: {   /* de frente, sentado en la máquina: los brazos cierran al frente */
        front: true, props: `M26 14 V42 M74 14 V42 M34 76 H66 M50 76 V110 ${FLOOR}`,
        j: { h: [50, 26], n: [50, 36], p: [50, 72], e: [31, 37], w: [29, 20], e2: [69, 37], w2: [71, 20], k: [42, 80], f: [42, 108], k2: [58, 80], f2: [58, 108] },
        arrows: [[16, 52, 34, 52], [84, 52, 66, 52]]
    },
    ohpseated: {   /* press de hombro sentado con mancuernas */
        props: `M30 84 H60 M34 84 V110 M56 84 V110 M30 84 L27 44 ${FLOOR}`,
        j: { h: [45, 38], n: [44, 48], p: [42, 80], e: [57, 49], w: [57, 33], k: [64, 80], f: [66, 108] },
        kit: [["db", 57, 32]], arrows: [[72, 42, 72, 22]]
    },
    frontsquat: {   /* barra adelante, sobre los hombros */
        props: FLOOR,
        j: { h: [52, 33], n: [50, 43], p: [37, 73], e: [66, 50], w: [59, 44], k: [62, 86], f: [50, 108] },
        kit: [["bar", 61, 43]], arrows: [[78, 66, 78, 44]]
    },
    rdl: {   /* peso muerto rumano: piernas casi rectas, cadera atrás */
        props: FLOOR,
        j: { h: [71, 39], n: [62, 44], p: [40, 56], e: [62, 61], w: [62, 78], k: [46, 82], f: [44, 108] },
        kit: [["bar", 62, 80]], arrows: [[78, 86, 78, 64]]
    },
    preacher: {   /* curl en atril: el brazo apoyado en la almohadilla */
        props: `M36 55 L54 66 M46 61 V110 M20 84 H38 M29 84 V110 ${FLOOR}`,
        j: { h: [37, 39], n: [36, 48], p: [30, 80], e: [53, 59], w: [65, 48], k: [50, 82], f: [52, 108] },
        kit: [["db", 66, 47]], arrows: [[74, 58, 64, 36, 80, 42]]
    },
    inclinecurl: {   /* curl sentado en banco inclinado: el brazo cuelga detrás del cuerpo */
        props: `M18 50 L40 86 H64 M44 86 V110 M62 86 V110 ${FLOOR}`,
        j: { h: [22, 46], n: [28, 56], p: [44, 82], e: [28, 73], w: [42, 72], k: [66, 80], f: [72, 108] },
        kit: [["db", 43, 72]], arrows: [[50, 80, 42, 58, 56, 62]]
    },
    cablecurl: {   /* curl en polea baja */
        props: `M88 110 V92 M88 96 L67 48 ${FLOOR}`,
        j: { h: [50, 22], n: [50, 31], p: [50, 62], e: [52, 48], w: [67, 47], k: [51, 85], f: [49, 108] },
        kit: [["handle", 67, 47]], arrows: [[78, 40, 64, 26, 80, 26]]
    },
    /* ---------- Añadidas en 1.10 ---------- */
    goblet: {   /* sentadilla con una mancuerna sujeta frente al pecho */
        props: FLOOR,
        j: { h: [50, 37], n: [47, 46], p: [35, 73], e: [52, 61], w: [57, 49], k: [58, 86], f: [48, 108] },
        kit: [["db", 58, 48]], arrows: [[76, 70, 76, 48]]
    },
    sumo: {   /* de frente: piernas muy abiertas y la mancuerna colgando entre ellas */
        front: true, props: FLOOR,
        j: { h: [50, 32], n: [50, 42], p: [50, 71], e: [44, 57], w: [48, 72], e2: [56, 57], w2: [52, 72], k: [31, 84], f: [27, 108], k2: [69, 84], f2: [73, 108] },
        kit: [["db", 50, 75]], arrows: [[90, 80, 90, 58]]
    },
    hipadd: {   /* de frente, sentado en la máquina: las rodillas se cierran */
        front: true, props: `M30 70 H70 M34 70 V110 M66 70 V110 M30 70 V34 M70 70 V34 ${FLOOR}`,
        j: { h: [50, 24], n: [50, 34], p: [50, 68], e: [40, 52], w: [36, 66], e2: [60, 52], w2: [64, 66], k: [26, 80], f: [26, 106], k2: [74, 80], f2: [74, 106] },
        kit: [["pad", 31, 82], ["pad", 69, 82]], arrows: [[6, 94, 18, 94], [94, 94, 82, 94]]
    },
    hipabd: {   /* de frente, sentado en la máquina: las rodillas se abren */
        front: true, props: `M30 70 H70 M34 70 V110 M66 70 V110 M30 70 V34 M70 70 V34 ${FLOOR}`,
        j: { h: [50, 24], n: [50, 34], p: [50, 68], e: [40, 52], w: [36, 66], e2: [60, 52], w2: [64, 66], k: [40, 82], f: [40, 106], k2: [60, 82], f2: [60, 106] },
        kit: [["pad", 34, 82], ["pad", 66, 82]], arrows: [[22, 94, 8, 94], [78, 94, 92, 94]]
    },
    chestmachine: {   /* press de pecho sentado en máquina: empuja al frente */
        props: `M22 84 H52 M26 84 V110 M48 84 V110 M22 84 L18 42 M90 110 V26 M90 40 L64 50 ${FLOOR}`,
        j: { h: [30, 38], n: [29, 48], p: [34, 80], e: [44, 55], w: [61, 51], k: [56, 80], f: [58, 108] },
        kit: [["handle", 62, 51]], arrows: [[60, 36, 80, 36]]
    },
    uprightrow: {   /* remo al mentón (barra Z), de frente: los codos suben por encima de la barra */
        front: true, props: `M26 47 H74 ${FLOOR}`,
        j: { h: [50, 21], n: [50, 31], p: [50, 63], e: [32, 34], w: [43, 47], e2: [68, 34], w2: [57, 47], k: [45, 86], f: [43, 108], k2: [55, 86], f2: [57, 108] },
        arrows: [[86, 66, 86, 42]]
    },
    seatedlegcurl: {   /* femoral sentado: la pierna baja y va hacia atrás */
        props: `M26 84 H58 M30 84 V110 M54 84 V110 M26 84 L22 42 M50 70 H70 ${FLOOR}`,
        j: { h: [34, 39], n: [35, 48], p: [40, 80], e: [46, 62], w: [52, 72], k: [64, 80], f: [62, 103] },
        kit: [["pad", 66, 104]], arrows: [[84, 84, 74, 106, 86, 100]]
    },
    dbpullover: {   /* acostado en el banco: la mancuerna pasa de detrás de la cabeza a encima del pecho */
        props: `M24 80 H86 M30 80 V110 M80 80 V110 ${FLOOR}`,
        j: { h: [27, 72], n: [37, 76], p: [68, 77], e: [22, 66], w: [9, 61], k: [86, 80], f: [90, 108] },
        kit: [["db", 8, 60]], arrows: [[10, 46, 34, 38, 14, 32]]
    },
    revpecdeck: {   /* posterior en máquina (pec deck invertido), de frente: los brazos se abren */
        front: true, props: `M50 12 V42 M34 76 H66 M50 76 V110 ${FLOOR}`,
        j: { h: [50, 26], n: [50, 36], p: [50, 72], e: [32, 39], w: [15, 41], e2: [68, 39], w2: [85, 41], k: [42, 80], f: [42, 108], k2: [58, 80], f2: [58, 108] },
        kit: [["handle", 14, 41], ["handle", 86, 41]], arrows: [[34, 56, 14, 56], [66, 56, 86, 56]]
    },
    calfpress: {   /* pantorrillas en la prensa: piernas estiradas, empujan solo con la punta del pie */
        props: `M10 64 L28 96 H50 M30 96 V110 M70 34 L92 56 ${FLOOR}`,
        j: { h: [14, 62], n: [19, 71], p: [33, 92], e: [26, 84], w: [34, 92], k: [55, 70], f: [75, 50], t: [81, 45] },
        arrows: [[70, 30, 86, 24, 76, 22]]
    },
    cablekick: {   /* patada de glúteo de pie en polea baja: la pierna va hacia atrás */
        props: `M90 110 V20 M90 104 L16 94 ${FLOOR}`,
        j: { h: [64, 30], n: [59, 38], p: [46, 64], e: [72, 46], w: [86, 50], k: [32, 80], f: [16, 92], k2: [49, 86], f2: [49, 108] },
        kit: [["handle", 15, 92]], arrows: [[24, 72, 6, 66, 12, 76]]
    },
    plank: {   /* se mantiene: sin flecha */
        props: FLOOR,
        j: { h: [82, 88], n: [72, 92], p: [42, 96], e: [72, 108], w: [84, 108], k: [27, 101], f: [12, 107] },
        arrows: []
    }
};

/* Ejercicio → postura (por palabras del nombre; lo más específico primero) */
const FIGURE_RULES = [
    [/goblet/, "goblet"],
    [/sumo/, "sumo"],
    [/aduccion|aductor/, "hipadd"],
    [/abduccion/, "hipabd"],
    [/press militar maq|press hombro maq/, "ohpseated"],
    [/press plano|press pecho maq|press (de pecho )?en maq/, "chestmachine"],
    [/barra z|al menton/, "uprightrow"],
    [/femoral sentad|rodillas? sentad/, "seatedlegcurl"],
    [/femoral acostad|rodillas? acostad/, "legcurl"],
    [/pull ?over acostad|pull ?over (con )?mancuerna/, "dbpullover"],
    [/pull ?over/, "pullover"],
    [/posterior (en )?maq|pec deck invertido/, "revpecdeck"],
    [/remo alto|remo a la altura|remo altura/, "facepull"],
    [/(pantorrilla|gemelo).*prensa/, "calfpress"],
    [/pantorrilla/, "calf"],
    [/patada.*polea/, "cablekick"],
    [/extension (de )?rodilla/, "legext"],
    [/extension (de )?triceps|triceps polea/, "pushdown"],
    [/copa/, "overhead"],
    [/martillo/, "curl"],
    [/remo agarre/, "cablerow"],
    [/desplante.*bulgar|bulgar/, "bulgarian"],
    [/desplante/, "lunge"],
    [/press inclin/, "incline"],
    [/fondos triceps/, "benchdip"],
    [/patada triceps/, "kickback"],
    [/curl femoral/, "legcurl"],
    [/ext\.? cuadriceps/, "legext"],
    [/press frances/, "skull"],
    [/press inclinado/, "incline"],
    [/press declinado/, "decline"],
    [/press mancuernas/, "dbpress"],
    [/pec deck/, "pecdeck"],
    [/press hombro/, "ohpseated"],
    [/sentadilla frontal/, "frontsquat"],
    [/peso muerto rumano/, "rdl"],
    [/curl predicador/, "preacher"],
    [/curl inclinado/, "inclinecurl"],
    [/curl polea/, "cablecurl"],
    [/press militar/, "ohp"],
    [/sobre cabeza/, "overhead"],
    [/extension polea/, "pushdown"],
    [/curl/, "curl"],
    [/aperturas/, "fly"],
    [/cruce de poleas/, "crossover"],
    [/fondos/, "dips"],
    [/flexiones/, "pushup"],
    [/dominada/, "pullup"],
    [/jalon/, "pulldown"],
    [/remo mancuerna/, "dbrow"],
    [/remo polea/, "cablerow"],
    [/remo/, "row"],
    [/pullover/, "pullover"],
    [/peso muerto/, "hinge"],
    [/elev\.? de piernas/, "legraise"],
    [/elev\.? lateral/, "lateral"],
    [/lateral/, "lateral"],
    [/elev\.? frontal/, "frontraise"],
    [/frontal/, "frontraise"],
    [/pajaro/, "reardelt"],
    [/face pull/, "facepull"],
    [/encogimiento/, "shrug"],
    [/zancada/, "lunge"],
    [/sentadilla/, "squat"],
    [/prensa/, "legpress"],
    [/gemelo/, "calf"],
    [/hip thrust/, "hipthrust"],
    [/puente/, "bridge"],
    [/patada/, "kick"],
    [/abductor/, "abduct"],
    [/plancha/, "plank"],
    [/rueda/, "wheel"],
    [/russian|giro/, "twist"],
    [/crunch|abdominal/, "crunch"],
    [/press/, "bench"]
];

function figureMoveFor(name) {
    const n = normalizeText(name);
    const rule = FIGURE_RULES.find(([re]) => re.test(n));
    return rule ? rule[1] : "curl";
}

let figureSeq = 0;

/* Imágenes de equipo (para elegir en la galería del ejercicio), con el mismo estilo de cristal */
const EQUIPMENT_FIGURES = {
    "eq-mancuerna": { label: "Mancuerna",
        draw: `<path class="fig-limb" d="M32,60 H68"/>
               <rect class="fig-eq" x="18" y="44" width="9" height="32" rx="3"/><rect class="fig-eq" x="27" y="49" width="6" height="22" rx="2"/>
               <rect class="fig-eq" x="73" y="44" width="9" height="32" rx="3"/><rect class="fig-eq" x="67" y="49" width="6" height="22" rx="2"/>` },
    "eq-barra": { label: "Barra",
        draw: `<path class="fig-limb fig-thin" d="M6,60 H94"/>
               <rect class="fig-eq" x="13" y="38" width="7" height="44" rx="2.5"/><rect class="fig-eq" x="21" y="44" width="6" height="32" rx="2"/>
               <rect class="fig-eq" x="80" y="38" width="7" height="44" rx="2.5"/><rect class="fig-eq" x="73" y="44" width="6" height="32" rx="2"/>
               <path class="fig-bar" d="M29,56 V64 M71,56 V64"/>` },
    "eq-dominadas": { label: "Barra de dominadas",
        draw: `<path class="fig-prop" d="M20,112 V24 M80,112 V24 M12,112 H28 M72,112 H88"/>
               <path class="fig-limb" d="M14,24 H86"/>
               <path class="fig-bar" d="M34,20 V28 M66,20 V28"/>` }
};

function equipmentFigure(kind) {
    const u = `fg${++figureSeq}`;
    const draw = EQUIPMENT_FIGURES[kind].draw.replace(/class="(fig-limb[^"]*|fig-eq)"/g, `class="$1" stroke="url(#${u}l)"`);
    return `<svg class="fig-svg" viewBox="0 0 100 120" aria-hidden="true">
        <defs>
            <linearGradient id="${u}l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="120">
                <stop offset="0" style="stop-color:#fff;stop-opacity:.9"/>
                <stop offset=".45" style="stop-color:rgb(var(--glow1));stop-opacity:.85"/>
                <stop offset="1" style="stop-color:rgb(var(--glow2));stop-opacity:.75"/>
            </linearGradient>
            <filter id="${u}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>
        <g filter="url(#${u}b)" class="fig-glow">${draw}</g>
        ${draw}
    </svg>`;
}

/* SVG de la figura del ejercicio. "fig" (opcional) es la imagen elegida en la galería:
   una pose de FIGURE_POSES o un equipo de EQUIPMENT_FIGURES; si no, se elige por el nombre. */
function exerciseFigure(name, fig) {
    if (fig && EQUIPMENT_FIGURES[fig]) return equipmentFigure(fig);
    const pose = FIGURE_POSES[fig && FIGURE_POSES[fig] ? fig : figureMoveFor(name)];
    const u = `fg${++figureSeq}`;
    const j = pose.j;
    const twoSided = pose.front || pose.top;

    /* el otro brazo y la otra pierna: si no vienen dados, van un poco detrás (vista de lado) */
    const back = ([x, y]) => [x - 3, y - 1];
    const q = {
        ...j,
        e2: j.e2 || back(j.e), w2: j.w2 || back(j.w),
        k2: j.k2 || back(j.k), f2: j.f2 || back(j.f),
        t2: j.t2 || (j.t && !j.f2 ? back(j.t) : null)
    };
    const P = ([x, y]) => `${x},${y}`;
    const leg = (k, f, t) => `M${P(q.p)} L${P(k)} L${P(f)}${t ? ` L${P(t)}` : ""}`;
    const limbsBack = `M${P(q.n)} L${P(q.e2)} L${P(q.w2)} ${leg(q.k2, q.f2, q.t2)}`;
    const limbsFront = `M${P(q.n)} L${P(q.p)} M${P(q.n)} L${P(q.e)} L${P(q.w)} ${leg(q.k, q.f, q.t)}`;

    const kitSvg = (pose.kit || []).map(([type, x, y]) => {
        const r = { bar: 6, db: 4, handle: 3, wheel: 6, pad: 4 }[type];
        const db = type === "db" ? `<path class="fig-bar" d="M${x - 5},${y} H${x + 5}"/>` : "";
        /* el disco de la barra y la rueda llevan su centro marcado, para no confundirse con la cabeza */
        const hub = type === "bar" || type === "wheel" ? `<circle class="fig-hub" cx="${x}" cy="${y}" r="1.8"/>` : "";
        return `${db}<circle class="fig-plate${type === "bar" || type === "wheel" ? " fig-disc" : ""}" cx="${x}" cy="${y}" r="${r}"/>${hub}`;
    }).join("");

    /* flecha: línea fina con punta, como la "←" del encabezado */
    const arrowSvg = (pose.arrows || []).map(a => {
        const [x1, y1, x2, y2, cx, cy] = a;
        const curved = cx !== undefined;
        const fx = curved ? cx : x1, fy = curved ? cy : y1;
        const ang = Math.atan2(y2 - fy, x2 - fx), L = 5.5;
        const head = [ang + 2.5, ang - 2.5].map(t => `M${x2},${y2} L${(x2 + L * Math.cos(t)).toFixed(1)},${(y2 + L * Math.sin(t)).toFixed(1)}`).join(" ");
        return `<path class="fig-arrow" d="M${x1},${y1} ${curved ? `Q${cx},${cy} ` : "L"}${x2},${y2} ${head}"/>`;
    }).join("");

    return `<svg class="fig-svg" viewBox="0 0 100 120" aria-hidden="true">
        <defs>
            <linearGradient id="${u}l" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="120">
                <stop offset="0" style="stop-color:#fff;stop-opacity:.9"/>
                <stop offset=".45" style="stop-color:rgb(var(--glow1));stop-opacity:.85"/>
                <stop offset="1" style="stop-color:rgb(var(--glow2));stop-opacity:.75"/>
            </linearGradient>
            <radialGradient id="${u}h" cx="35%" cy="30%" r="75%">
                <stop offset="0" style="stop-color:#fff;stop-opacity:.85"/>
                <stop offset="1" style="stop-color:rgb(var(--glow1));stop-opacity:.45"/>
            </radialGradient>
            <filter id="${u}b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
        </defs>
        <path class="fig-prop" d="${pose.props}"/>
        <g filter="url(#${u}b)" class="fig-glow"><path class="fig-limb" stroke="url(#${u}l)" d="${limbsBack} ${limbsFront}"/></g>
        <path class="fig-limb${twoSided ? "" : " fig-back"}" stroke="url(#${u}l)" d="${limbsBack}"/>
        <path class="fig-limb" stroke="url(#${u}l)" d="${limbsFront}"/>
        <path class="fig-shine" d="${limbsFront}"/>
        <circle class="fig-head" fill="url(#${u}h)" cx="${j.h[0]}" cy="${j.h[1]}" r="7.5"/>
        ${kitSvg}
        ${arrowSvg}
    </svg>`;
}
