#!/usr/bin/env node
/* Calibra la equivalencia en porciones (de 0,5 en 0,5) de la comida rápida.
   Para cada producto busca, entre los grupos que tienen sentido para su tipo, la combinación
   que más se acerca a sus calorías (peso alto) y a sus carbohidratos, proteína y grasa.
   Escribe el resultado como 8.º elemento de cada producto en scripts/app/comida-rapida.js.
   Uso:  node tools/calibrar-porciones.mjs        (y revisar el diff)
         node tools/calibrar-porciones.mjs --check   (falla si algo no está calibrado) */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "scripts/app/comida-rapida.js");
const src = readFileSync(FILE, "utf8");

/* Mismos valores por porción que FOOD_GROUPS en scripts/app/comida.js: [carbohidratos, proteína, grasa] */
const G = { h: [15, 3, 1], bg: [0, 7, 1], mg: [0, 7, 5], g: [0, 0, 5], l: [12, 8, 3] };
const kcalOf = ([c, p, f]) => 4 * c + 4 * p + 9 * f;

/* Qué grupos puede usar cada tipo de producto (super = sección de supermercado) */
function groupsFor(name, isSuper) {
    if (isSuper === "drink") return /leche/i.test(name) ? ["h", "l", "g"] : ["h"];          /* bebidas: solo azúcar → harinas (con leche: también lácteo y grasa) */
    if (isSuper) return /Maní/i.test(name) ? ["h", "bg", "g"] : ["h", "g"];   /* galletas, snacks y chocolates: harinas y grasas */
    if (/Refresco|Crazy Sauce/i.test(name)) return ["h"];                                   /* azúcar → harinas, como la miel */
    if (/Salsa de ajo/i.test(name)) return ["g"];
    if (/Sundae|McFlurry|Frosty/i.test(name)) return ["h", "l", "g"];                        /* postres lácteos */
    if (/Pie de|Hotcakes|Galleta|Biscuit|Breadstick|Crazy Bread/i.test(name)) return ["h", "g"];
    if (/Papas|Aros de cebolla|Puré|Ensalada de repollo/i.test(name)) return ["h", "bg", "g"];
    return ["h", "bg", "mg", "g"];
}

export function calibrate(kcal, c, p, f, keys) {
    if (kcal < 20) return {};                              /* bebidas light / cero: no suman porciones */
    if (keys.length === 1) {                               /* un solo grupo: lo más cercano en calorías */
        const v = Math.max(0.5, Math.round(kcal / kcalOf(G[keys[0]]) * 2) / 2);
        return { [keys[0]]: v };
    }
    let best = null, bestErr = Infinity;
    /* tope de cada grupo por su macro principal (harinas y lácteos: carbohidratos; proteínas: proteína;
       grasas: grasa). Con el tope por el macro más bajo, una bolsa grande de papas (casi sin proteína)
       no podía pasar de 2,5 harinas */
    const MAIN = { h: 0, l: 0, v: 0, fr: 0, bg: 1, mg: 1, g: 2 };
    const ub = keys.map(k => {
        const per = G[k][MAIN[k] ?? 0], have = [c, p, f][MAIN[k] ?? 0];
        const u = per ? Math.min(30, have / per + 1.5) : 30;
        return Math.max(0.5, Math.floor(u * 2) / 2);
    });
    const cur = keys.map(() => 0);
    (function rec(i, sc, sp, sf) {
        if (i === keys.length) {
            const e = 4 * sc + 4 * sp + 9 * sf;
            const err = 6 * (e - kcal) ** 2 + (4 * (sc - c)) ** 2 + (4 * (sp - p)) ** 2 + (9 * (sf - f)) ** 2
                + cur.filter(v => v > 0).length * 60            /* menos grupos, más fácil de leer */
                + mgPreference(keys, cur);                       /* proteína con grasa (queso, carne) → MG */
            if (err < bestErr) { bestErr = err; best = [...cur]; }
            return;
        }
        for (let v = 0; v <= ub[i]; v += 0.5) {
            cur[i] = v;
            rec(i + 1, sc + v * G[keys[i]][0], sp + v * G[keys[i]][1], sf + v * G[keys[i]][2]);
        }
        cur[i] = 0;
    })(0, 0, 0, 0);
    const out = {};
    keys.forEach((k, j) => { if (best[j]) out[k] = best[j]; });
    return out;
}
/* Proteína BG + Grasas juntas equivalen casi a Proteína MG: se prefiere MG */
function mgPreference(keys, cur) {
    const bg = cur[keys.indexOf("bg")] || 0, g = cur[keys.indexOf("g")] || 0;
    return keys.includes("mg") ? 400 * Math.min(bg, g) : 0;
}
export const portionsKcal = pt => Object.entries(pt).reduce((s, [k, v]) => s + v * kcalOf(G[k]), 0);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const lines = src.split("\n");
    let changed = 0, worst = [];
    const re = /^(\s+)\["([^"\\]*(?:\\.[^"\\]*)*)", "([^"]+)", "([^"]+)", (\d+), ([\d.]+), ([\d.]+), ([\d.]+)(?:, \{[^}]*\})?\](,?)$/;
    let isSuper = false;
    const out = lines.map(line => {
        if (/^\s+\{ chain:/.test(line)) isSuper = /drink: true/.test(line) ? "drink" : /super: true/.test(line);
        const m = line.match(re);
        if (!m) return line;
        const [, ind, name, unit, plural, k, c, p, f, comma] = m;
        const pt = calibrate(+k, +c, +p, +f, groupsFor(name.replace(/\\"/g, '"'), isSuper));
        if (+k >= 20) worst.push([Math.round((portionsKcal(pt) - k) / k * 1000) / 10, name, +k]);   /* las cero no cuentan en el error */
        const entries = Object.entries(pt);
        const lit = entries.length ? "{ " + entries.map(([g, v]) => `${g}: ${v}`).join(", ") + " }" : "{}";
        const next = `${ind}["${name}", "${unit}", "${plural}", ${k}, ${c}, ${p}, ${f}, ${lit}]${comma}`;
        if (next !== line) changed++;
        return next;
    });
    worst.sort((a, b) => Math.abs(b[0]) - Math.abs(a[0]));
    const avg = worst.reduce((s, w) => s + Math.abs(w[0]), 0) / worst.length;
    console.log(`${worst.length} productos · error medio ${avg.toFixed(1)} % · mayores:`);
    worst.slice(0, 6).forEach(w => console.log(`  ${w[0]} %  ${w[1]} (${w[2]} kcal)`));
    if (process.argv.includes("--check")) {
        if (changed) { console.error(`${changed} productos sin calibrar: ejecuta node tools/calibrar-porciones.mjs`); process.exit(1); }
    } else {
        writeFileSync(FILE, out.join("\n"));
        console.log(`${changed} productos actualizados`);
    }
}
