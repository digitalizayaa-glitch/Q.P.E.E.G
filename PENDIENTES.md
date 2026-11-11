# Pendientes de Q.P.E.E.G

Lista de trabajo apuntado para más adelante (actualizada en la versión 2.0.0, 11 de noviembre de 2026).

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

## Fase D — Publicación ✅ (2.0.0)
- Hecho: textos legales y acuerdos (1.15.0), guía para instalar y mudanza (1.16.0), y la app publicada en Cloudflare:
  https://qpeeg.digitalizayaa.workers.dev
- Play Store: pospuesto.

## Auditoría de la 2.0 (11 de noviembre de 2026)
Lo que se encontró y se corrigió para publicar la 2.0:
1. El servidor se subía a mano y no salía del repositorio → un solo Worker (`qpeeg`) con la app y la sincronización, publicado solo en cada push (`wrangler.jsonc`).
2. La dirección raíz (`/`) de la app nueva no abría → el Worker la resuelve a `index.html`.
3. Cualquier sitio `*.workers.dev` o `*.pages.dev` podía llamar al servidor desde el navegador → solo los orígenes exactos de la app.
4. Sin tope de peticiones → 120 por minuto por IP (429).
5. Los errores del servidor no quedaban registrados → registros activados y traza en cada error 500.
6. Sin cabeceras de seguridad ni política de contenido → `_headers` y CSP (la app solo carga su propio código); se quitaron el script y el `onclick` en línea.
7. Sin página 404 y se publicaban pruebas y herramientas → `404.html` y `.assetsignore`.
8. `legal.js` mezclaba textos y lógica con un truco para la página pública → `legal-textos.js` + `legal.js` + `privacidad.js`.
9. Carpeta `supabase/` sin uso, README y LEEME desactualizados, manifest con descripción vieja → limpiado y al día.
10. La prueba de sincronización fallaba sin avisar desde la 1.15.0 (dos secciones de Ajustes con la misma clase) → corregida; ahora se revisan también los cierres inesperados.

Pendiente (no bloquea):
- Del dueño: cambiar el código de las 2 cuentas cuyos códigos se escribieron en un chat.
- Cuando ya nadie use la dirección anterior: quitar el aviso de mudanza, borrar el Worker `qpeeg-sync` y desactivar GitHub Pages.
- Opcional: dominio propio (por ejemplo qpeeg.app); al cambiar de dominio los datos del teléfono no se mudan solos (hace falta el código de cuenta).
- Opcional: que Cloudflare publique solo si pasan las pruebas de GitHub Actions (hoy publica en cada push; las pruebas se corren antes a mano).
- Opcional: probar a mano en un iPhone real.
- Tabla `vault_backups` en la base: copia manual de cuando se separaron dos cuentas; borrarla cuando ya no haga falta.
