/* =========================================================
    AJUSTES DE ESTILO: tema claro/oscuro, color del destello y foto de perfil
    Se guardan en state.settings = { theme, glow }.
========================================================= */

const GLOW_PALETTES = [
    { id: "verde",    name: "Verde",    g1: "76, 175, 109", g2: "224, 192, 64" },
    { id: "azul",     name: "Azul",     g1: "70, 130, 230", g2: "150, 100, 230" },
    { id: "morado",   name: "Morado",   g1: "150, 90, 220", g2: "230, 100, 170" },
    { id: "rosa",     name: "Rosa",     g1: "232, 100, 150", g2: "240, 160, 90" },
    /* ui: color de botones. El rojo va muy suave para no confundirse con los botones de borrar */
    { id: "rojo",     name: "Rojo",     g1: "224, 85, 85",  g2: "240, 150, 70", ui: "196, 132, 128" },
    { id: "naranja",  name: "Naranja",  g1: "240, 150, 60", g2: "224, 192, 64" },
    { id: "turquesa", name: "Turquesa", g1: "40, 190, 190", g2: "70, 130, 230" },
    { id: "gris",     name: "Gris",     g1: "160, 160, 170", g2: "110, 110, 120" }
];

function getSettings() {
    state.settings = Object.assign({ theme: "dark", glow: "verde", bright: "mid", speed: "mid" }, state.settings || {});
    return state.settings;
}

/* Brillo: solo cambia la intensidad del destello del fondo y de los velos de vidrio (medio = el de siempre) */
const BRIGHT_LEVELS = { low: { glow: 0.5, glass: 0.6 }, mid: { glow: 1, glass: 1 }, high: { glow: 1.8, glass: 1.6 } };
/* Velocidad de navegación: multiplicador de la duración de las transiciones */
const SPEED_LEVELS = { slow: 1.6, mid: 1, fast: 0.55 };

function applySettings() {
    const st = getSettings();
    const root = document.documentElement;
    const palette = GLOW_PALETTES.find(p => p.id === st.glow) || GLOW_PALETTES[0];

    if (st.theme === "light") root.dataset.theme = "light";
    else delete root.dataset.theme;

    root.style.setProperty("--glow1", palette.g1);
    root.style.setProperty("--glow2", palette.g2);
    root.style.setProperty("--ui-rgb", palette.ui || palette.g1);   /* botones y selecciones siguen al destello */

    const dark = st.theme !== "light";
    const lv = BRIGHT_LEVELS[st.bright] || BRIGHT_LEVELS.mid;
    const a = n => Math.min(1, Math.round(n * 1000) / 1000);
    root.style.setProperty("--ga1", a((dark ? 0.085 : 0.2) * lv.glow));
    root.style.setProperty("--ga2", a((dark ? 0.055 : 0.14) * lv.glow));
    root.style.setProperty("--glass-bg", dark ? `rgba(255, 255, 255, ${a(0.055 * lv.glass)})` : `rgba(255, 255, 255, ${a(0.72 * lv.glass)})`);
    root.style.setProperty("--glass-bg-strong", dark ? `rgba(255, 255, 255, ${a(0.085 * lv.glass)})` : `rgba(255, 255, 255, ${a(0.92 * lv.glass)})`);
    root.style.setProperty("--glass-border", dark ? `rgba(255, 255, 255, ${a(0.09 * lv.glass)})` : `rgba(0, 0, 0, ${a(0.11 * lv.glass)})`);

    NAV_SPEED = SPEED_LEVELS[st.speed] || 1;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = st.theme === "light" ? "#f4f4f1" : "#181818";
}

let settingsOverlay = null;

function openSettings() {
    if (settingsOverlay) return;
    const st = getSettings();

    const overlay = document.createElement("div");
    overlay.className = "picker-overlay";
    const sheet = document.createElement("div");
    sheet.className = "picker-sheet settings-sheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");

    const head = document.createElement("div");
    head.className = "picker-head";
    head.innerHTML = '<h3 class="picker-title">Ajustes</h3>';
    const closeBtn = document.createElement("button");
    closeBtn.className = "picker-close";
    closeBtn.setAttribute("aria-label", "Cerrar");
    closeBtn.textContent = "✕";
    head.appendChild(closeBtn);
    sheet.appendChild(head);

    const label = text => { const d = document.createElement("div"); d.className = "settings-label"; d.textContent = text; return d; };

    /* Tema */
    const seg = document.createElement("div");
    seg.className = "seg";
    [["dark", "Oscuro"], ["light", "Claro"]].forEach(([value, text]) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "seg-btn" + (st.theme === value ? " active" : "");
        b.textContent = text;
        b.onclick = () => {
            getSettings().theme = value;
            saveState();
            applySettings();
            seg.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b));
        };
        seg.appendChild(b);
    });
    sheet.append(label("Tema"), seg);

    /* Color del destello */
    const swatches = document.createElement("div");
    swatches.className = "swatches";
    GLOW_PALETTES.forEach(pal => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "swatch" + (st.glow === pal.id ? " active" : "");
        b.style.background = `linear-gradient(135deg, rgb(${pal.g1}) 0%, rgb(${pal.g1}) 55%, rgb(${pal.g2}) 100%)`;
        b.setAttribute("aria-label", pal.name);
        b.title = pal.name;
        b.onclick = () => {
            getSettings().glow = pal.id;
            saveState();
            applySettings();
            swatches.querySelectorAll(".swatch").forEach(x => x.classList.toggle("active", x === b));
        };
        swatches.appendChild(b);
    });
    sheet.append(label("Color del destello"), swatches);

    /* Brillo y velocidad: reguladores de 3 niveles */
    const levels = (key, options) => {
        const row = document.createElement("div");
        row.className = "seg";
        options.forEach(([value, text]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "seg-btn" + (getSettings()[key] === value ? " active" : "");
            b.textContent = text;
            b.onclick = () => {
                getSettings()[key] = value;
                saveState();
                applySettings();
                row.querySelectorAll(".seg-btn").forEach(x => x.classList.toggle("active", x === b));
            };
            row.appendChild(b);
        });
        return row;
    };
    sheet.append(label("Brillo"), levels("bright", [["low", "Bajo"], ["mid", "Medio"], ["high", "Alto"]]));
    sheet.append(label("Velocidad de navegación"), levels("speed", [["slow", "Lenta"], ["mid", "Media"], ["fast", "Rápida"]]));

    /* Foto */
    const photoWrap = document.createElement("div");
    photoWrap.className = "settings-photo";
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "dialog-btn danger";
    delBtn.textContent = "Quitar foto de perfil";
    delBtn.disabled = !state.photo;
    delBtn.onclick = async () => {
        const ok = await askConfirm({
            title: "Quitar foto",
            message: "Se borrará la foto de perfil para que puedas elegir otra.",
            confirmLabel: "Quitar"
        });
        if (!ok) return;
        removeProfilePhoto();
        delBtn.disabled = true;
    };
    photoWrap.appendChild(delBtn);

    /* Sin foto: un avatar abstracto en su lugar */
    const avatarBtn = document.createElement("button");
    avatarBtn.type = "button";
    avatarBtn.className = "dialog-btn ghost";
    const avatarRow = document.createElement("div");
    avatarRow.className = "avatar-options";
    AVATARS.forEach(a => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "avatar-option";
        b.dataset.id = a.id;
        b.setAttribute("aria-label", `Avatar ${a.name}`);
        b.innerHTML = avatarSvg(a.id);
        b.onclick = () => { state.avatar = a.id; saveState(); renderProfile(); paintAvatar(); };
        avatarRow.appendChild(b);
    });
    const paintAvatar = () => {
        avatarBtn.textContent = state.avatar ? "Usar foto de perfil" : "No usar foto de perfil";
        avatarBtn.setAttribute("aria-pressed", !!state.avatar);
        avatarRow.hidden = !state.avatar;
        avatarRow.querySelectorAll(".avatar-option").forEach(b => b.classList.toggle("active", b.dataset.id === state.avatar));
    };
    avatarBtn.onclick = () => {
        state.avatar = state.avatar ? null : AVATARS[0].id;
        saveState();
        renderProfile();
        paintAvatar();
    };
    paintAvatar();
    photoWrap.append(avatarBtn, avatarRow);
    sheet.append(label("Foto de perfil"), photoWrap);

    /* Cuenta y sincronización (solo si hay servidor configurado) */
    const account = buildAccountSection(label);
    sheet.append(...account.nodes);
    sheet.append(...buildLegalSection(label));
    const moving = moveMode() === "old";
    if (moving || !isInstalled()) {
        const inst = document.createElement("div");
        inst.className = "settings-photo settings-install";
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dialog-btn accept";
        b.textContent = moving ? "Pasarme a la app nueva" : "Instalar la app";
        b.onclick = moving ? openMoveGuide : openInstallGuide;
        inst.appendChild(b);
        sheet.append(label("App"), inst);
    }

    overlay.appendChild(sheet);

    const close = () => {
        if (!settingsOverlay) return;
        settingsOverlay = null;
        account.dispose();
        window.removeEventListener("keydown", onKey, true);
        overlay.style.pointerEvents = "none";
        sheetCollapse(sheet, 130);
        overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 130, fill: "forwards" }).finished.then(() => overlay.remove()).catch(() => overlay.remove());
    };
    const onKey = e => { if (dialogOverlay) return; if (e.key === "Escape") { e.preventDefault(); close(); } };
    window.addEventListener("keydown", onKey, true);
    closeBtn.onclick = close;
    overlay.addEventListener("pointerdown", e => { if (e.target === overlay) close(); });

    document.body.appendChild(overlay);
    settingsOverlay = overlay;

    overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: "ease-out" });
    sheetAppear(sheet);
}

function removeProfilePhoto() {
    state.photo = null;
    saveState();
    renderProfile();
}

/* ---------- Avatares (en lugar de foto) ----------
   Formas de vidrio translúcido con brillo; toman el color del destello elegido. */
const AVATARS = [
    { id: "orbes",  name: "Orbes" },
    { id: "prisma", name: "Prisma" },
    { id: "ondas",  name: "Ondas" }
];

let avatarSeq = 0;
function avatarSvg(id) {
    const u = `av${++avatarSeq}`;                 /* ids únicos: puede haber varios en pantalla */
    const g1 = "rgb(var(--glow1))", g2 = "rgb(var(--glow2))";
    const defs = `<defs>
        <radialGradient id="${u}bg" cx="30%" cy="25%" r="85%"><stop offset="0" style="stop-color:${g1};stop-opacity:.45"/><stop offset="1" style="stop-color:${g2};stop-opacity:.12"/></radialGradient>
        <linearGradient id="${u}a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:#fff;stop-opacity:.55"/><stop offset="1" style="stop-color:${g1};stop-opacity:.35"/></linearGradient>
        <linearGradient id="${u}b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:#fff;stop-opacity:.45"/><stop offset="1" style="stop-color:${g2};stop-opacity:.4"/></linearGradient>
        <filter id="${u}s" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4"/></filter>
    </defs>`;
    const glass = `stroke="rgba(255,255,255,.6)" stroke-width=".8"`;
    const shapes = {
        orbes: `
            <circle cx="40" cy="58" r="24" fill="url(#${u}b)" ${glass}/>
            <circle cx="62" cy="42" r="20" fill="url(#${u}a)" ${glass}/>
            <circle cx="66" cy="68" r="11" fill="rgba(255,255,255,.18)" ${glass}/>`,
        prisma: `
            <rect x="24" y="30" width="40" height="40" rx="10" transform="rotate(-14 44 50)" fill="url(#${u}b)" ${glass}/>
            <rect x="38" y="26" width="38" height="38" rx="10" transform="rotate(18 57 45)" fill="url(#${u}a)" ${glass}/>
            <circle cx="40" cy="70" r="7" fill="rgba(255,255,255,.25)" ${glass}/>`,
        ondas: `
            <path d="M8 62 C 26 48, 40 74, 58 60 S 86 50, 96 58 L 96 100 L 4 100 Z" fill="url(#${u}b)" ${glass}/>
            <path d="M4 74 C 22 62, 42 86, 62 72 S 88 64, 98 72 L 98 100 L 2 100 Z" fill="url(#${u}a)" ${glass}/>
            <circle cx="64" cy="34" r="13" fill="url(#${u}a)" ${glass}/>`
    };
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${defs}
        <rect width="100" height="100" fill="url(#${u}bg)"/>
        <g filter="url(#${u}s)" opacity=".55">${shapes[id]}</g>
        ${shapes[id]}
        <ellipse cx="36" cy="24" rx="20" ry="8" transform="rotate(-24 36 24)" fill="rgba(255,255,255,.22)"/>
    </svg>`;
}

/* Inicio: avatar si está activado; si no, la foto; si no hay foto, el "+" para elegir una */
function renderProfile() {
    const img = document.getElementById("profileImg");
    const avatar = document.getElementById("profileAvatar");
    const plus = document.getElementById("profilePlaceholder");
    if (!img) return;

    const useAvatar = !!state.avatar;
    const usePhoto = !useAvatar && !!state.photo;
    if (usePhoto) img.src = state.photo; else img.removeAttribute("src");
    img.style.display = usePhoto ? "block" : "none";
    avatar.style.display = useAvatar ? "block" : "none";
    avatar.innerHTML = useAvatar ? avatarSvg(state.avatar) : "";
    plus.style.display = useAvatar || usePhoto ? "none" : "";
}

applySettings();
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("settingsBtn");
    if (btn) btn.addEventListener("click", openSettings);
});
