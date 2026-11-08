/* Servidor de sincronización (Supabase). Ver supabase/LEEME.md.
   La "anon key" es pública por diseño: va en la app y solo permite llamar a las
   funciones qpeeg_* (las tablas están cerradas y los datos viajan cifrados).
   Vacío = la sincronización no aparece en la app. */
const QPEEG_SYNC = {
    url: "",
    key: ""
};
