/* =========================================================
    TEXTOS LEGALES: política de privacidad y aviso de salud.
    Un solo texto para la app (legal.js) y para la página pública privacidad.html.
    Si cambian los acuerdos, sube LEGAL_VERSION: el formulario vuelve a salir.
========================================================= */

const LEGAL_UPDATED = "13 de noviembre de 2026";
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
                "Si lo aceptas, una vez al día se envía una copia de tus rutinas, entrenos (ejercicios, series, repeticiones y pesos) y deportes. Va sin cifrar para poder estudiarla, pero sin tu código, sin tu cuenta, sin tus comidas, sin tu plan ni tu foto: solo con un número anónimo. Si tienes código, ese número sale de tu clave para que todos tus teléfonos cuenten como uno, pero no se puede relacionar con tu cuenta en el servidor; si no tienes, es un número al azar de este teléfono. Se usa únicamente para desarrollar y mejorar Q.P.E.E.G; no se vende ni se comparte con nadie.\n\nPuedes quitarlo cuando quieras en Ajustes → Privacidad y salud → Mis acuerdos, y lo que compartiste se borra del servidor. Si no abres la app en 76 días, también se borra."],
            ["Errores de la app",
                "Si la app falla, envía un informe técnico anónimo: el mensaje del error, la versión de la app y el sistema y navegador (por ejemplo, \"Android 14 · Chrome 130\"). No incluye tu código, tu cuenta ni nada de lo que registras. Los informes se borran a los 60 días si el error no se repite."],
            ["Quién da el servicio",
                "La app y la sincronización funcionan en Cloudflare (la dirección anterior, en GitHub Pages, sigue abierta mientras dura la mudanza). Como cualquier sitio web, estos proveedores reciben la dirección IP de tu conexión para poder responder y para frenar abusos. La app no guarda esas direcciones."],
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
