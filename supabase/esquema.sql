-- =========================================================
--  Q.P.E.E.G · servidor de sincronización (Supabase)
--  Pegar entero en: Supabase → SQL Editor → New query → Run.
--  Se puede ejecutar más de una vez sin romper nada.
--
--  El servidor NO puede leer los datos: solo guarda bloques cifrados en el
--  teléfono, identificados por una huella del código de cuenta (no el código).
--  Las tablas no se pueden leer ni escribir directamente: solo con estas funciones.
-- =========================================================

-- Copias cifradas: una por cuenta
create table if not exists public.qpeeg_vaults (
    id          text primary key check (id ~ '^[0-9a-f]{64}$'),
    blob        text not null check (length(blob) <= 6000000),   -- ~6 MB, de sobra
    rev         bigint not null default 1,                        -- versión, para no pisar cambios
    updated_at  timestamptz not null default now()
);

-- Códigos temporales para vincular otro teléfono (10 minutos, un solo uso)
create table if not exists public.qpeeg_pairs (
    id          text primary key check (id ~ '^[0-9a-f]{64}$'),
    payload     text not null check (length(payload) <= 4000),
    expires_at  timestamptz not null
);

alter table public.qpeeg_vaults enable row level security;
alter table public.qpeeg_pairs  enable row level security;
-- Sin políticas: nadie accede a las tablas salvo a través de las funciones.
revoke all on public.qpeeg_vaults from public, anon, authenticated;
revoke all on public.qpeeg_pairs  from public, anon, authenticated;

-- Leer la copia de una cuenta
create or replace function public.qpeeg_get(p_id text)
returns table (blob text, rev bigint)
language sql stable security definer set search_path = public as $$
    select v.blob, v.rev from public.qpeeg_vaults v where v.id = p_id;
$$;

-- Guardar la copia. p_rev = versión sobre la que se hicieron los cambios (0 = cuenta nueva).
-- Devuelve la versión nueva, o -1 si otro teléfono guardó antes (el teléfono vuelve a leer y fusiona).
create or replace function public.qpeeg_put(p_id text, p_blob text, p_rev bigint)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
    new_rev bigint;
begin
    if p_id !~ '^[0-9a-f]{64}$' then raise exception 'id no válido'; end if;
    if p_rev = 0 then
        insert into public.qpeeg_vaults (id, blob, rev) values (p_id, p_blob, 1)
        on conflict (id) do nothing
        returning rev into new_rev;
    else
        update public.qpeeg_vaults
           set blob = p_blob, rev = rev + 1, updated_at = now()
         where id = p_id and rev = p_rev
        returning rev into new_rev;
    end if;
    return coalesce(new_rev, -1);
end;
$$;

-- Publicar un código temporal (lo hace el teléfono que ya tiene la cuenta)
create or replace function public.qpeeg_pair_put(p_id text, p_payload text)
returns void
language plpgsql security definer set search_path = public as $$
begin
    if p_id !~ '^[0-9a-f]{64}$' then raise exception 'id no válido'; end if;
    delete from public.qpeeg_pairs where expires_at < now();
    insert into public.qpeeg_pairs (id, payload, expires_at) values (p_id, p_payload, now() + interval '10 minutes')
    on conflict (id) do update set payload = excluded.payload, expires_at = excluded.expires_at;
end;
$$;

-- Recoger un código temporal (lo hace el teléfono nuevo). Se borra al recogerlo.
create or replace function public.qpeeg_pair_take(p_id text)
returns text
language plpgsql security definer set search_path = public as $$
declare
    result text;
begin
    delete from public.qpeeg_pairs where expires_at < now();
    delete from public.qpeeg_pairs where id = p_id returning payload into result;
    return result;
end;
$$;

revoke all on function public.qpeeg_get(text)                 from public;
revoke all on function public.qpeeg_put(text, text, bigint)   from public;
revoke all on function public.qpeeg_pair_put(text, text)      from public;
revoke all on function public.qpeeg_pair_take(text)           from public;
grant execute on function public.qpeeg_get(text)               to anon, authenticated;
grant execute on function public.qpeeg_put(text, text, bigint) to anon, authenticated;
grant execute on function public.qpeeg_pair_put(text, text)    to anon, authenticated;
grant execute on function public.qpeeg_pair_take(text)         to anon, authenticated;
