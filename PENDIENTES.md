# Pendientes de Q.P.E.E.G

Lista de trabajo apuntado para más adelante (actualizada en la versión 1.8.0, 9 de noviembre de 2026).

## Servidor de sincronización (Cloudflare Worker + D1)
- **Protección contra abusos:** límite de peticiones por cliente (rate limit) y tope de tamaño por cuenta, para que nadie pueda llenar la base de datos (hoy bastarían unas 260 subidas de 1,9 MB para llenar los 500 MB gratuitos).
- **Limpieza de cuentas abandonadas:** borrar cuentas sin actividad durante mucho tiempo (plazo por decidir).
- **Menos peticiones:** quitar la consulta automática cada 90 s y sincronizar solo al abrir la app, al volver a ella y después de guardar. Pasaría de ~650 a ~2.000 usuarios diarios con 2 teléfonos dentro del plan gratuito.

## Calidad
- Registro de errores (saber cuándo algo falla en el teléfono de un usuario).
- Accesibilidad (lectores de pantalla, contraste, tamaños de toque).
- Pruebas en iPhone / Safari.

## Publicación
- Textos legales: política de privacidad, aviso de salud y opción de borrar la cuenta (necesita aprobar el contenido).
- Servir la app desde Cloudflare (importar el repositorio desde el panel de Cloudflare; lo hace el dueño de la cuenta).
- Play Store: pospuesto.
