/* Revisa los nombres globales de la app. Los scripts de index.html comparten un solo ámbito global:
   dos archivos que declaran el mismo nombre arriba del todo (const, let, function, class) rompen la app al
   cargar ("Identifier has already been declared") o se pisan sin avisar. Esta revisión lo detecta antes.
   Uso: node tools/globales.mjs            → lista de choques (sale con error si hay)
        node tools/globales.mjs --mapa     → además, qué archivo declara cada nombre */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(ROOT, "index.html"), "utf8");
const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1].split("?")[0]);

const owner = new Map();
const clashes = [];
const DECL = /^(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z_$][\w$]*)/;
for (const f of files) {
    const lines = readFileSync(join(ROOT, f), "utf8").split("\n");
    lines.forEach((line, i) => {
        const m = DECL.exec(line);              /* solo declaraciones en la columna 0 (nivel superior) */
        if (!m) return;
        const name = m[1], at = `${f}:${i + 1}`;
        if (owner.has(name) && !/^var\s/.test(line)) clashes.push(`${name}: ${owner.get(name)} y ${at}`);
        else if (!owner.has(name)) owner.set(name, at);
    });
}

/* Hojas de estilo: un comentario sin cerrar se "come" las reglas de abajo sin dar error */
const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
for (const css of sheets) {
    const t = readFileSync(join(ROOT, css), "utf8");
    if ((t.match(/\/\*/g) || []).length !== (t.match(/\*\//g) || []).length) clashes.push(`${css}: comentario sin cerrar`);
    if ((t.match(/\{/g) || []).length !== (t.match(/\}/g) || []).length) clashes.push(`${css}: llaves sin cerrar`);
}

if (process.argv.includes("--mapa")) {
    for (const [name, at] of [...owner].sort((a, b) => a[1].localeCompare(b[1]))) console.log(`${at.padEnd(42)} ${name}`);
}
if (clashes.length) {
    console.error("Problemas de nombres globales u hojas de estilo:\n  " + clashes.join("\n  "));
    process.exit(1);
}
console.log(`Nombres globales sin choques (${owner.size} en ${files.length} archivos)`);
