/* =========================================================
    VERSIÓN EN LA PANTALLA DE INICIO Y AVISO DE NOVEDADES
    (la lista está en scripts/core/version.js)
========================================================= */

const SEEN_VERSION_KEY = "qpeeg_seen_version";

/* -1, 0 ó 1 comparando "1.10.0" con "1.9.2" número a número */
function compareVersions(a, b) {
    const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d) return d > 0 ? 1 : -1;
    }
    return 0;
}

/* Notas de la versión actual. Un hotfix (x.y.Z sin notas propias) muestra las de la versión que corrige */
const notesVersion = () => (CHANGELOG.find(e => compareVersions(e.v, APP_VERSION) <= 0) || CHANGELOG[0]).v;
const currentNotes = () => CHANGELOG.filter(e => e.v === notesVersion());

function showWhatsNew(entries) {
    if (!entries.length) return Promise.resolve();
    const text = entries.map(e => (entries.length > 1 ? `Versión ${e.v}\n` : "") + e.items.map(i => "• " + i).join("\n")).join("\n\n");
    return openDialog({
        title: entries.length > 1 ? "Novedades" : `Novedades · versión ${entries[0].v}`,
        message: text,
        buttons: [{ label: "Entendido", kind: "accept", confirm: true, value: true }]
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const btn = document.getElementById("versionBtn");
    if (btn) {
        btn.textContent = `Versión ${APP_VERSION}`;
        btn.onclick = () => showWhatsNew(currentNotes());
    }

    await stateReady;
    await consentReady;             /* primero el formulario de acuerdos, si falta */
    let seen = null;
    try { seen = localStorage.getItem(SEEN_VERSION_KEY); } catch (e) { /* nada */ }
    if (seen === APP_VERSION) return;
    try { localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION); } catch (e) { /* nada */ }

    /* Instalación nueva (sin datos): no hay "novedades" que contar.
       Quien ya usaba la app sin este aviso ve solo lo de la versión actual. */
    let entries;
    if (seen) entries = CHANGELOG.filter(e => compareVersions(e.v, seen) > 0);
    else entries = (state.meta.savedAt > 0 || hasUserData()) ? currentNotes() : [];
    if (entries.length) setTimeout(() => showWhatsNew(entries), 700);
});
