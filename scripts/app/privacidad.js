/* Página pública privacidad.html: pinta los textos de legal-textos.js */
document.getElementById("updated").textContent = `Actualizado el ${LEGAL_UPDATED}`;
const docs = document.getElementById("docs");
for (const key of ["privacy", "health"]) {
    const h2 = document.createElement("h2");
    h2.id = key === "privacy" ? "privacidad" : "salud";
    h2.textContent = LEGAL[key].title;
    docs.appendChild(h2);
    for (const [h, p] of LEGAL[key].sections) {
        const h3 = document.createElement("h3");
        h3.textContent = h;
        const para = document.createElement("p");
        para.textContent = p;
        docs.append(h3, para);
    }
}
