# Pendientes de Q.P.E.E.G

Lista de trabajo apuntado para más adelante (actualizada en la versión 1.13.0, 10 de noviembre de 2026).

## Fase A — Cuentas seguras ✅ (1.11.0)
- Hecho: el código ya no une cuentas (entrar con un código = usar esa cuenta), versiones anteriores en el servidor y "Cambiar mi código".
- Pendiente del usuario: cambiar el código de las 2 cuentas cuyos códigos se escribieron en un chat.

## Fase B — Servidor ✅ (1.12.0)
- Hecho: tope de 1 MB por cuenta y de 400 MB en total para cuentas nuevas, sin consulta cada 90 s, y limpieza diaria de cuentas sin uso en 2 meses y medio.
- Pendiente (opcional): límite de peticiones por cliente (rate limit) si algún día hay abuso.

## Fase C — Calidad ✅ (1.13.0)
- Hecho: registro de errores anónimo, auditoría de accesibilidad (contraste AA, área de toque, nombres para lectores de pantalla, calendario descrito en palabras) y pruebas de interfaz en WebKit (Safari) en cada publicación.
- Mínimo: iOS 15.4; la sincronización comprimida necesita iOS 16.4 (marzo 2023).
- Pendiente (opcional): probar a mano en un iPhone real (instalar desde Safari → Compartir → "Añadir a pantalla de inicio").

## Fase D — Publicación
- Textos legales: política de privacidad, aviso de salud (hay usuarios menores de edad) y opción de borrar la cuenta (necesita aprobar el contenido).
- Servir la app desde Cloudflare (importar el repositorio desde el panel de Cloudflare; lo hace el dueño de la cuenta).
- Play Store: pospuesto.
