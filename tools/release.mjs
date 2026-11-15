/* Sube la versión en un solo paso y deja todo listo para publicar.
   Uso:  npm run release -- patch | minor | major | 2.4.0
   1. Cambia APP_VERSION (scripts/core/version.js) y "version" (package.json).
   2. Regenera el service worker (la caché de la app).
   3. Corre npm run check y npm test. Si algo falla, avisa y sale con error (no hace commit).
   Las notas de parche (CHANGELOG en version.js) se escriben a mano para las versiones con novedades. */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VERSION_JS = join(ROOT, "scripts/core/version.js");
const PACKAGE = join(ROOT, "package.json");

const arg = process.argv[2] || "patch";
const vjs = readFileSync(VERSION_JS, "utf8");
const m = vjs.match(/APP_VERSION = "(\d+)\.(\d+)\.(\d+)"/);
if (!m) { console.error("No encontré APP_VERSION en version.js"); process.exit(1); }
const [maj, min, pat] = m.slice(1).map(Number);
const next = /^\d+\.\d+\.\d+$/.test(arg) ? arg
    : arg === "major" ? `${maj + 1}.0.0`
    : arg === "minor" ? `${maj}.${min + 1}.0`
    : arg === "patch" ? `${maj}.${min}.${pat + 1}`
    : null;
if (!next) { console.error(`Uso: npm run release -- patch | minor | major | X.Y.Z (recibí "${arg}")`); process.exit(1); }

writeFileSync(VERSION_JS, vjs.replace(m[0], `APP_VERSION = "${next}"`));
const pkg = readFileSync(PACKAGE, "utf8");
writeFileSync(PACKAGE, pkg.replace(/"version": "[^"]+"/, `"version": "${next}"`));
console.log(`Versión ${m[0].slice(15, -1)} → ${next}`);

const run = cmd => execSync(cmd, { cwd: ROOT, stdio: "inherit" });
try {
    run("node tools/build-sw.mjs");
    run("npm run check");
    run("npm test");
} catch (e) {
    console.error(`\nAlgo falló: la versión quedó en ${next}, pero no publiques hasta arreglarlo.`);
    process.exit(1);
}
console.log(`\nListo para publicar ${next}. Si la versión trae novedades, agrega su nota en CHANGELOG (version.js).`);
