# Pendientes de Q.P.E.E.G

Lista de trabajo apuntado para más adelante (actualizada en la versión 1.10.3, 10 de noviembre de 2026).

## Fase A — Cuentas seguras (lo más urgente)
- **"Unir" más seguro:** al entrar a una cuenta con un teléfono que ya tiene datos, avisar si los perfiles son de personas distintas (sexo, edad, foto) y dejar "Solo la cuenta" como opción principal. Pasó una unión accidental entre dos cuentas el 10 de noviembre.
- **Deshacer en el servidor:** guardar las últimas versiones de cada cuenta (cifradas) para poder volver atrás sin ayuda manual.
- **Cambiar el código de la cuenta:** los códigos de dos cuentas quedaron escritos en un chat.

## Fase B — Servidor de sincronización (Cloudflare Worker + D1)
- **Protección contra abusos:** límite de peticiones por cliente (rate limit) y tope de tamaño por cuenta, para que nadie pueda llenar la base de datos (hoy bastarían unas 260 subidas de 1,9 MB para llenar los 500 MB gratuitos).
- **Menos peticiones:** quitar la consulta automática cada 90 s y sincronizar solo al abrir la app, al volver a ella y después de guardar. Pasaría de ~650 a ~2.000 usuarios diarios con 2 teléfonos dentro del plan gratuito.
- **Limpieza de cuentas abandonadas:** borrar cuentas sin actividad durante mucho tiempo (plazo por decidir).

## Fase C — Calidad
- Registro de errores (saber cuándo algo falla en el teléfono de un usuario).
- Accesibilidad (lectores de pantalla, contraste, tamaños de toque).
- Pruebas en iPhone / Safari.

## Fase D — Publicación
- Textos legales: política de privacidad, aviso de salud (hay usuarios menores de edad) y opción de borrar la cuenta (necesita aprobar el contenido).
- Servir la app desde Cloudflare (importar el repositorio desde el panel de Cloudflare; lo hace el dueño de la cuenta).
- Play Store: pospuesto.
