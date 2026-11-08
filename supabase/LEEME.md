# Servidor de sincronización (Supabase)

La app funciona sin servidor. El servidor solo hace falta para usar los mismos datos en varios teléfonos.
Guarda copias **cifradas en el teléfono**: ni Supabase ni quien administre el proyecto puede leerlas.

## Ponerlo en marcha (una sola vez, ~5 minutos)

1. Crea una cuenta en https://supabase.com y un proyecto nuevo (plan gratuito). Región: la más cercana (p. ej. East US).
2. En el proyecto: **SQL Editor → New query**, pega todo el contenido de `esquema.sql` y pulsa **Run**.
   Debe terminar con "Success. No rows returned".
3. En **Project Settings → API** copia:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public key** (una clave larga que empieza por `eyJ…`, o `sb_publishable_…`)
4. Pon esos dos valores en `scripts/core/config.js` y publica.
   La clave *anon/publishable* es pública por diseño: solo permite llamar a las cuatro funciones `qpeeg_*`.
   **Nunca** pongas la clave `service_role` / `secret` en la app.

## Qué guarda

| Tabla          | Contenido                                                              |
|----------------|------------------------------------------------------------------------|
| `qpeeg_vaults` | Una fila por cuenta: huella del código, bloque cifrado y nº de versión |
| `qpeeg_pairs`  | Códigos temporales de vinculación (10 min, se borran al usarse)        |

Las tablas tienen RLS activado y sin políticas: no se pueden leer ni escribir directamente desde la app.

## Tener en cuenta

- En el plan gratuito, Supabase **pausa** el proyecto tras ~1 semana sin actividad. Mientras está pausado la app
  sigue funcionando sin conexión y sincroniza cuando se reactiva (desde el panel de Supabase). Para uso con
  usuarios reales conviene el plan de pago.
- Si una persona pierde su código de cuenta no se puede recuperar (no hay correo). Sus datos siguen en sus teléfonos.
- Cambiar `esquema.sql` y volver a ejecutarlo es seguro: no borra datos.
