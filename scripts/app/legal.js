/* =========================================================
    PRIVACIDAD Y SALUD
    - Textos de la política de privacidad y del aviso de salud (Ajustes y privacidad.html).
    - Formulario "Importante" al abrir la app por primera vez (o cuando cambian los acuerdos):
      compartir datos de entrenamiento (opcional), aceptar la política y entender el aviso de salud.
      Se cambia después en Ajustes → Privacidad y salud → Mis acuerdos.
    - Compartir datos: si se acepta, una vez al día se envían rutinas, entrenos y deportes con un id
      anónimo de este teléfono (no el de la cuenta). Al quitarlo se borran del servidor.
    privacidad.html solo usa LEGAL y LEGAL_UPDATED (lo demás necesita la app).
========================================================= */

const LEGAL_UPDATED = "11 de noviembre de 2026";
const LEGAL_CONTACT = "digitalizayaa@gmail.com";
const LEGAL_VERSION = 1;          /* subirlo si cambian los acuerdos: el formulario vuelve a salir */

const LEGAL = {
    privacy: {
        title: "Política de privacidad",
        sections: [
            ["En resumen",
                "Q.P.E.E.G guarda tus rutinas, comidas, deportes y plan en tu teléfono. No tiene anuncios, no te rastrea, no usa cookies ni vende datos. Si creas un código para sincronizar, tus datos viajan cifrados y el servidor no puede leerlos. Solo si tú lo aceptas, compartes tus datos de entrenamiento para mejorar la app."],
            ["Qué se guarda en tu teléfono",
                "Todo lo que registras: rutinas, series, comidas, deportes, tu plan de calorías (edad, sexo, peso, estatura, actividad y, si lo pones, grasa corporal), la foto o avatar de perfil y tus ajustes. Se queda en el almacenamiento de la app en tu teléfono. Sin código de cuenta, nada de esto sale del teléfono."],
            ["Si usas un código de cuenta",
                "Tus datos se cifran en tu teléfono con una clave que sale de tu código antes de enviarse. El servidor solo guarda ese bloque cifrado: no puede ver tus rutinas, comidas, peso ni foto. Tampoco pedimos correo, nombre ni contraseña. Por eso, si pierdes el código, nadie puede recuperar tu cuenta.\n\nEl servidor guarda además hasta 20 copias anteriores de tu cuenta (como mucho una cada 3 horas), también cifradas, para que puedas volver a una versión de antes. Los códigos temporales para pasar la cuenta a otro teléfono se borran a los 10 minutos."],
            ["Compartir datos de entrenamiento (opcional)",
                "Si lo aceptas, una vez al día se envía una copia de tus rutinas, entrenos (ejercicios, series, repeticiones y pesos) y deportes. Va sin cifrar para poder estudiarla, pero sin tu código, sin tu cuenta, sin tus comidas, sin tu plan ni tu foto: solo con un número al azar de este teléfono. Se usa únicamente para desarrollar y mejorar Q.P.E.E.G; no se vende ni se comparte con nadie.\n\nPuedes quitarlo cuando quieras en Ajustes → Privacidad y salud → Mis acuerdos, y lo que compartiste se borra del servidor. Si no abres la app en 76 días, también se borra."],
            ["Errores de la app",
                "Si la app falla, envía un informe técnico anónimo: el mensaje del error, la versión de la app y el sistema y navegador (por ejemplo, \"Android 14 · Chrome 130\"). No incluye tu código, tu cuenta ni nada de lo que registras. Los informes se borran a los 60 días si el error no se repite."],
            ["Quién da el servicio",
                "Los archivos de la app se sirven desde GitHub Pages y la sincronización funciona en Cloudflare. Como cualquier sitio web, estos proveedores reciben la dirección IP de tu conexión para poder responder. La app no guarda esas direcciones."],
            ["Cuánto tiempo se guarda",
                "En tu teléfono, hasta que lo borres. En el servidor, si no abres la app en 76 días (unos 2 meses y medio), tu cuenta, sus copias y lo que compartiste se borran solos."],
            ["Borrar tus datos",
                "En Ajustes → Privacidad y salud → \"Borrar mi cuenta\" se borran del servidor tu cuenta, todas sus copias y lo que hayas compartido, al momento, y el código deja de funcionar. Lo que hay en tu teléfono se borra quitando la app o borrando los datos del sitio en el navegador."],
            ["Menores de edad",
                "Si tienes menos de 18 años, usa la app con permiso de tu madre, padre o tutor. La app no pide nombre, correo ni ningún dato para identificarte."],
            ["Cambios y contacto",
                `Si esta política cambia, la app te volverá a pedir que la aceptes. Dudas o solicitudes: ${LEGAL_CONTACT}.`]
        ]
    },
    health: {
        title: "Aviso de salud",
        sections: [
            ["No es consejo médico",
                "Las calorías, macros, porciones y la carga de los deportes son estimaciones con fórmulas generales y tablas de alimentos. Sirven de guía, no sustituyen a un médico, nutricionista ni entrenador."],
            ["Antes de empezar",
                "Consulta a un profesional de salud antes de empezar a entrenar o de cambiar tu alimentación, sobre todo si tienes alguna enfermedad, lesión, estás embarazada o tomas medicamentos."],
            ["Menores de 18 años",
                "Si estás creciendo, tu cuerpo necesita energía suficiente. No sigas un plan para bajar de peso sin que lo supervise un adulto responsable y un profesional de salud. Aprende la técnica de cada ejercicio con alguien que sepa antes de subir el peso."],
            ["Escucha a tu cuerpo",
                "Si sientes dolor en el pecho, mareo, falta de aire fuera de lo normal o un dolor fuerte en una articulación, para de inmediato y busca ayuda médica."]
        ]
    }
};

/* Lo de aquí abajo es de la app (privacidad.html se queda en los textos) */
if (typeof stateReady !== "undefined") {

var legalText = doc => LEGAL[doc].sections.map(([h, p]) => `${h}\n${p}`).join("\n\n") + `\n\nActualizado el ${LEGAL_UPDATED}.`;

var showLegal = doc => openDialog({
    title: LEGAL[doc].title,
    message: legalText(doc),
    buttons: [{ label: "Entendido", kind: "accept", confirm: true, value: true }]
});

/* ---------- acuerdos (guardados en este teléfono) ---------- */

var CONSENT_KEY = "qpeeg_consent";
var SHARE_ID_KEY = "qpeeg_share_id";
var SHARE_AT_KEY = "qpeeg_share_at";
var SHARE_EVERY = 20 * 3600 * 1000;      /* como mucho una vez al día */

var getConsent = () => {
    try { return JSON.parse(localStorage.getItem(CONSENT_KEY)) || null; } catch (e) { return null; }
};
var setConsent = c => {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch (e) { /* nada */ }
};
var consentOk = () => { const c = getConsent(); return !!(c && c.v >= LEGAL_VERSION); };

/* Formulario de acuerdos. first: al abrir la app (no se cierra sin aceptar). Resuelve al terminar */
var openAgreements = ({ first = false } = {}) => new Promise(resolve => {
    const prev = getConsent() || {};
    const val = {
        share: !!prev.share,
        privacy: !first && prev.v >= LEGAL_VERSION,
        health: !first && prev.v >= LEGAL_VERSION
    };
    const { sheet, close } = openSheet("agree-sheet", first ? "Importante" : "Mis acuerdos", () => resolve(getConsent()), { locked: first });

    const body = document.createElement("div");
    body.className = "agree-form";
    const intro = document.createElement("p");
    intro.className = "agree-intro";
    intro.textContent = first
        ? "Antes de empezar, revisa y acepta cómo funciona Q.P.E.E.G. Puedes cambiarlo después en Ajustes."
        : "Cambia lo que aceptaste. Compartir tus datos de entrenamiento es opcional.";
    body.appendChild(intro);

    const boxes = {};
    const row = (key, title, sub, doc, optional) => {
        const r = document.createElement("div");
        r.className = "agree-row";
        const box = document.createElement("button");
        box.type = "button";
        box.className = "agree-check";
        box.setAttribute("role", "checkbox");
        box.setAttribute("aria-label", title);
        box.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
        const text = document.createElement("div");
        text.className = "agree-text";
        const b = document.createElement("b");
        b.textContent = title;
        text.appendChild(b);
        if (optional) {
            const opt = document.createElement("span");
            opt.className = "agree-opt";
            opt.textContent = "Opcional";
            b.append(" ", opt);
        }
        const small = document.createElement("small");
        small.textContent = sub;
        text.appendChild(small);
        if (doc) {
            const read = document.createElement("button");
            read.type = "button";
            read.className = "agree-read";
            read.textContent = `Leer ${LEGAL[doc].title.toLowerCase()}`;
            read.onclick = () => showLegal(doc);
            text.appendChild(read);
        }
        const toggle = () => { val[key] = !val[key]; paint(); };
        box.onclick = toggle;
        b.onclick = toggle;
        r.append(box, text);
        boxes[key] = box;
        return r;
    };
    body.append(
        row("share", "Compartir mis datos de entrenamiento",
            "Rutinas, series, pesos y deportes, sin tu código ni tu cuenta, para uso exclusivo del desarrollo de la app. Nada más.", null, true),
        row("privacy", "Acepto la política de privacidad",
            "Tus datos se guardan en tu teléfono; con código viajan cifrados. Sin anuncios ni rastreo.", "privacy"),
        row("health", "Entiendo el aviso de salud",
            "La app da estimaciones, no consejo médico. Consulta a un profesional antes de empezar.", "health")
    );

    const need = document.createElement("p");
    need.className = "agree-need";
    const actions = document.createElement("div");
    actions.className = "dialog-actions";
    if (!first) {
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "dialog-btn ghost";
        cancel.textContent = "Cancelar";
        cancel.onclick = close;
        actions.appendChild(cancel);
    }
    const ok = document.createElement("button");
    ok.type = "button";
    ok.className = "dialog-btn accept";
    ok.textContent = first ? "Continuar" : "Guardar";
    actions.appendChild(ok);
    body.append(actions, need);      /* el aviso va debajo del botón; sin aviso no ocupa espacio */
    sheet.appendChild(body);

    function paint() {
        for (const k in boxes) {
            boxes[k].setAttribute("aria-checked", String(val[k]));
            boxes[k].classList.toggle("on", val[k]);
        }
        const ready = val.privacy && val.health;
        ok.disabled = !ready;
        need.textContent = ready ? "" : "Para usar la app acepta la política de privacidad y el aviso de salud.";
    }
    ok.onclick = () => {
        if (!(val.privacy && val.health)) return;
        const was = !!prev.share;
        setConsent({ v: LEGAL_VERSION, share: val.share, unshare: !val.share && (was || !!prev.unshare), at: Date.now() });
        if (val.share && !was) { try { localStorage.removeItem(SHARE_AT_KEY); } catch (e) { /* nada */ } }
        close();
        syncSharedTraining();
    };
    paint();
});

/* ---------- compartir datos de entrenamiento ---------- */

var shareId = () => {
    let id = null;
    try { id = localStorage.getItem(SHARE_ID_KEY); } catch (e) { /* nada */ }
    if (!/^[0-9a-f]{64}$/.test(id || "")) {
        id = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, "0")).join("");
        try { localStorage.setItem(SHARE_ID_KEY, id); } catch (e) { /* nada */ }
    }
    return id;
};

/* Solo rutinas, entrenos y deportes: nada de comida, plan, foto, ajustes ni cuenta */
var sharedTraining = () => ({ routines: state.routines || [], logs: state.logs || {}, sports: state.sports || {} });

var sharing = false;
var syncSharedTraining = async () => {
    const c = getConsent();
    if (!c || sharing || !SYNC_ON || navigator.onLine === false) return;
    sharing = true;
    try {
        if (c.share) {
            let last = 0;
            try { last = Number(localStorage.getItem(SHARE_AT_KEY)) || 0; } catch (e) { /* nada */ }
            if (Date.now() - last < SHARE_EVERY) return;
            const data = JSON.stringify(sharedTraining());
            if (data.length > 300000) return;
            await syncRpc("qpeeg_share", { p_id: shareId(), p_ver: APP_VERSION, p_data: data });
            try { localStorage.setItem(SHARE_AT_KEY, String(Date.now())); } catch (e) { /* nada */ }
        } else if (c.unshare) {
            await syncRpc("qpeeg_share", { p_id: shareId(), p_data: null });
            setConsent({ ...getConsent(), unshare: false });
        }
    } catch (e) { /* sin red o servidor caído: se reintenta después */ }
    finally { sharing = false; }
};

/* Al abrir: si faltan los acuerdos, el formulario va antes que todo (Novedades espera a que termine) */
var consentReady = (async () => {
    await stateReady;
    if (!consentOk()) await openAgreements({ first: true });
    setTimeout(syncSharedTraining, 4000);
})();
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncSharedTraining(); });

/* ---------- borrar mi cuenta: la del servidor (si hay) y lo compartido; lo del teléfono se queda ---------- */

var deleteMyData = async () => {
    const acc = SYNC_ON ? await loadAccount() : null;
    const hasAcc = !!(acc && !acc.gone);
    const c = getConsent() || {};
    const shared = !!(c.share || c.unshare);
    if (!hasAcc && !shared) {
        await showMessage({ title: "Borrar mi cuenta", message: "No tienes nada guardado en el servidor: tus datos solo están en este teléfono. Para borrarlos, quita la app o borra los datos del sitio en el navegador." });
        return;
    }
    const ok = await askConfirm({
        title: "Borrar mi cuenta",
        message: (hasAcc ? "Se borran del servidor tu cuenta y todas sus versiones anteriores, y tu código deja de funcionar en todos los teléfonos." : "")
            + (shared ? `${hasAcc ? "\n\n" : ""}También se borran los datos de entrenamiento que compartiste y se deja de compartir.` : "")
            + "\n\nNo se puede deshacer. Lo que hay en este teléfono se queda aquí.",
        confirmLabel: "Borrar"
    });
    if (!ok) return;
    if (!navigator.onLine) { await offlineMsg("borrar tu cuenta"); return; }
    try {
        if (shared) await syncRpc("qpeeg_share", { p_id: shareId(), p_data: null });
        if (hasAcc) await syncRpc("qpeeg_retire", { p_id: acc.id });
    } catch (e) {
        await showMessage({ title: "No se pudo borrar", message: "Revisa tu conexión e inténtalo de nuevo." });
        return;
    }
    setConsent({ ...c, v: c.v || LEGAL_VERSION, share: false, unshare: false });
    if (hasAcc) {
        await saveAccount(undefined);
        syncStatus = "idle";
        syncListeners.forEach(fn => fn(syncStatus));
    }
    await showMessage({ title: "Listo", message: "Ya no hay nada tuyo en el servidor. Para borrar también lo de este teléfono, quita la app o borra los datos del sitio en el navegador." });
};

/* Sección "Privacidad y salud" de Ajustes */
var buildLegalSection = label => {
    const wrap = document.createElement("div");
    wrap.className = "settings-photo settings-account";
    const btn = (text, kind, onClick) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = `dialog-btn ${kind}`;
        b.textContent = text;
        b.onclick = onClick;
        return b;
    };
    const note = document.createElement("p");
    note.className = "settings-note";
    const paintNote = () => { note.textContent = getConsent()?.share ? "Compartes tus datos de entrenamiento para mejorar la app." : "No compartes tus datos de entrenamiento."; };
    paintNote();
    wrap.append(
        note,
        btn("Mis acuerdos", "ghost", async () => { await openAgreements(); paintNote(); }),
        btn(LEGAL.privacy.title, "ghost", () => showLegal("privacy")),
        btn(LEGAL.health.title, "ghost", () => showLegal("health")),
        btn("Borrar mi cuenta", "danger", async () => { await deleteMyData(); paintNote(); })
    );
    return [label("Privacidad y salud"), wrap];
};

}
