#!/usr/bin/env node
/* Genera la lista de archivos y el nombre de caché del service worker.
   Uso:  node tools/build-sw.mjs          → reescribe service-worker.js
         node tools/build-sw.mjs --check  → falla si service-worker.js no está al día (CI)
   Los archivos salen de index.html (scripts, estilos, iconos), de las url() de las hojas de estilo
   (fuentes) y del manifest y sus iconos. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SW = join(ROOT, "service-worker.js");
const read = (p) => readFileSync(join(ROOT, p));

const html = read("index.html").toString();
const refs = new Set(["index.html", "manifest.json"]);
for (const m of html.matchAll(/(?:src|href)="([^"#?:]+)"/g)) {
    const p = m[1].replace(/^\.\//, "");
    if (existsSync(join(ROOT, p))) refs.add(p);
}
/* Archivos que pide la hoja de estilos (fuentes) */
for (const css of [...refs].filter(f => f.endsWith(".css"))) {
    for (const m of read(css).toString().matchAll(/url\("?([^")#?:]+)"?\)/g)) {
        const p = join(dirname(css), m[1]).replace(/\\/g, "/");
        if (existsSync(join(ROOT, p))) refs.add(p);
    }
}
const manifest = JSON.parse(read("manifest.json"));
for (const icon of manifest.icons || []) refs.add(icon.src.replace(/^\.\//, ""));

const files = [...refs].sort();
for (const f of files) if (!existsSync(join(ROOT, f))) { console.error("Falta el archivo: " + f); process.exit(1); }

const hash = createHash("sha256");
for (const f of files) hash.update(f + "\0").update(read(f));
const swBody = readFileSync(SW, "utf8").replace(/\/\* <generado> \*\/[\s\S]*?\/\* <\/generado> \*\//, "");
hash.update(swBody);   /* cambiar la lógica del service worker también publica caché nueva */
const name = "qpeeg-" + hash.digest("hex").slice(0, 10);

const block = `/* <generado> */\nconst CACHE_NAME = "${name}";\nconst CORE_ASSETS = [\n    "./",\n${files.map((f) => `    "./${f}"`).join(",\n")}\n];\n/* </generado> */`;
const current = readFileSync(SW, "utf8");
const next = current.replace(/\/\* <generado> \*\/[\s\S]*?\/\* <\/generado> \*\//, block);

if (process.argv.includes("--check")) {
    if (next !== current) { console.error("service-worker.js no está al día: ejecuta  node tools/build-sw.mjs"); process.exit(1); }
    console.log("service-worker.js al día (" + name + ", " + files.length + " archivos)");
} else {
    writeFileSync(SW, next);
    console.log("service-worker.js → " + name + " (" + files.length + " archivos)");
}
