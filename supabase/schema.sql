-- Sindrebassen database schema (Supabase / Postgres).
-- The secret code is set separately and is never committed:
--   insert into private.secret (id, code_hash) values (1, extensions.crypt('<kode>', extensions.gen_salt('bf')))
--   on conflict (id) do update set code_hash = excluded.code_hash;

create extension if not exists pgcrypto with schema extensions;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  who text not null check (who in ('leah','kompis')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  activity text not null default 'Annet ✨' check (char_length(activity) <= 40),
  note text not null default '' check (char_length(note) <= 80),
  created_at timestamptz not null default now(),
  damage_kind text check (char_length(damage_kind) <= 40),
  damage_level int check (damage_level between 0 and 5),
  damage_note text check (char_length(damage_note) <= 120),
  damage_by text check (damage_by in ('leah','kompis')),
  damage_at timestamptz,
  constraint end_after_start check (end_at > start_at),
  constraint max_length check (end_at - start_at <= interval '24 hours'),
  constraint no_double_booking exclude using gist (tstzrange(start_at, end_at) with &&)
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  leah_name text not null default 'Leah' check (char_length(leah_name) between 1 and 20),
  kompis_name text not null default 'Kompisen' check (char_length(kompis_name) between 1 and 20)
);
insert into public.settings default values;

alter table public.bookings enable row level security;
alter table public.settings enable row level security;
create policy "Alle kan lese bookinger" on public.bookings for select to anon, authenticated using (true);
create policy "Alle kan lese navn" on public.settings for select to anon, authenticated using (true);

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.secret (id int primary key default 1 check (id = 1), code_hash text not null);
revoke all on private.secret from public, anon, authenticated;

create function private.check_code(p_code text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_code is null or not exists (
    select 1 from private.secret s where s.code_hash = extensions.crypt(p_code, s.code_hash)
  ) then
    perform pg_sleep(0.4);
    raise exception 'feil_kode' using errcode = '28P01';
  end if;
end $$;
revoke all on function private.check_code(text) from public, anon, authenticated;

create function public.verify_code(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_code(p_code);
  return true;
exception when sqlstate '28P01' then
  return false;
end $$;

create function public.add_booking(p_code text, p_who text, p_start timestamptz, p_end timestamptz, p_activity text, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
  perform private.check_code(p_code);
  insert into public.bookings (who, start_at, end_at, activity, note)
  values (p_who, p_start, p_end, coalesce(left(p_activity, 40), 'Annet ✨'), coalesce(left(p_note, 80), ''))
  returning id into new_id;
  return new_id;
end $$;

create function public.delete_booking(p_code text, p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_code(p_code);
  delete from public.bookings where id = p_id;
end $$;

create function public.set_names(p_code text, p_leah text, p_kompis text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_code(p_code);
  update public.settings set leah_name = left(trim(p_leah), 20), kompis_name = left(trim(p_kompis), 20) where id = 1;
end $$;

create function public.report_damage(p_code text, p_id uuid, p_by text, p_kind text, p_level int, p_note text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.check_code(p_code);
  if p_kind is null then
    update public.bookings
      set damage_kind = null, damage_level = null, damage_note = null, damage_by = null, damage_at = null
      where id = p_id;
  else
    update public.bookings
      set damage_kind = left(p_kind, 40), damage_level = p_level,
          damage_note = nullif(left(trim(coalesce(p_note, '')), 120), ''),
          damage_by = p_by, damage_at = now()
      where id = p_id and start_at <= now();
  end if;
end $$;

revoke all on function public.verify_code(text) from public;
revoke all on function public.add_booking(text, text, timestamptz, timestamptz, text, text) from public;
revoke all on function public.delete_booking(text, uuid) from public;
revoke all on function public.set_names(text, text, text) from public;
revoke all on function public.report_damage(text, uuid, text, text, int, text) from public;
grant execute on function public.verify_code(text) to anon, authenticated;
grant execute on function public.add_booking(text, text, timestamptz, timestamptz, text, text) to anon, authenticated;
grant execute on function public.delete_booking(text, uuid) to anon, authenticated;
grant execute on function public.set_names(text, text, text) to anon, authenticated;
grant execute on function public.report_damage(text, uuid, text, text, int, text) to anon, authenticated;

alter publication supabase_realtime add table public.bookings, public.settings;
