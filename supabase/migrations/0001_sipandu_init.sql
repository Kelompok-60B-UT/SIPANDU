-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 0001_sipandu_init.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions & Enums
-- -----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

create type public.user_role as enum ('warga', 'ketua_rt', 'ketua_rw', 'admin');
create type public.ticket_status as enum ('draft', 'terkirim', 'diverifikasi_rt', 'diproses_rw', 'selesai', 'ditolak');
create type public.attachment_type as enum ('laporan', 'penyelesaian');

-- -----------------------------------------------------------------------------
-- 2. Table: regions (RT 01-08 RW 06)
-- -----------------------------------------------------------------------------
create table public.regions (
  id        bigint generated always as identity primary key,
  name      text not null,
  rw        text not null default '06',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.regions enable row level security;

create policy "regions_public_read" on public.regions for select using (true);

create policy "regions_admin_write" on public.regions for all to authenticated
  using ((select (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'admin')
  with check ((select (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'admin');

-- -----------------------------------------------------------------------------
-- 3. Table: profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  address     text,
  region_id   bigint references public.regions(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_region_id_idx on public.profiles(region_id);

alter table public.profiles enable row level security;

create policy "profiles_own_select" on public.profiles for select to authenticated
  using (
    (select auth.uid()) = id
    or (select (auth.jwt()->'app_metadata'->>'sipandu_role')) in ('ketua_rt', 'ketua_rw', 'admin')
  );

create policy "profiles_own_update" on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Trigger: protect region_id on profiles from unauthorized edits
create or replace function public.check_profile_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (old.region_id is distinct from new.region_id) then
    if coalesce(auth.jwt()->'app_metadata'->>'sipandu_role', '') <> 'admin' then
      raise exception 'Hanya Admin yang dapat mengubah RT / wilayah';
    end if;
  end if;
  return new;
end;
$$;

create trigger on_profile_before_update
  before update on public.profiles
  for each row execute procedure public.check_profile_update();

-- -----------------------------------------------------------------------------
-- 4. Triggers on auth.users: automatic profile creation & default role
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user_app_metadata()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.raw_app_meta_data is null or not (new.raw_app_meta_data ? 'sipandu_role') then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('sipandu_role', 'warga');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created_set_role
  before insert on auth.users
  for each row execute procedure public.handle_new_user_app_metadata();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, address, region_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'address',
    (new.raw_user_meta_data->>'region_id')::bigint
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 5. Table: categories
-- -----------------------------------------------------------------------------
create table public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categories_public_read" on public.categories for select using (true);

create policy "categories_admin_write" on public.categories for all to authenticated
  using ((select (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'admin')
  with check ((select (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'admin');

-- -----------------------------------------------------------------------------
-- 6. Table: tickets
-- -----------------------------------------------------------------------------
create table public.tickets (
  id                bigint generated always as identity primary key,
  ticket_number     text unique,
  user_id           uuid not null references auth.users(id) on delete restrict,
  region_id         bigint not null references public.regions(id),
  category_id       bigint not null references public.categories(id),
  title             text not null,
  description       text not null,
  location_landmark text,
  status            public.ticket_status not null default 'draft',
  rejection_reason  text,
  handler_rt_id     uuid references auth.users(id),
  handler_rw_id     uuid references auth.users(id),
  rating            smallint check (rating between 1 and 5),
  rating_comment    text,
  rated_at          timestamptz,
  submitted_at      timestamptz,
  verified_at       timestamptz,
  processed_at      timestamptz,
  completed_at      timestamptz,
  rejected_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index tickets_user_id_idx on public.tickets(user_id);
create index tickets_region_id_idx on public.tickets(region_id);
create index tickets_category_id_idx on public.tickets(category_id);
create index tickets_status_idx on public.tickets(status);
create index tickets_ticket_number_idx on public.tickets(ticket_number);
create index tickets_handler_rt_id_idx on public.tickets(handler_rt_id);
create index tickets_handler_rw_id_idx on public.tickets(handler_rw_id);

alter table public.tickets enable row level security;

create policy "tickets_warga_select" on public.tickets for select to authenticated
  using (
    case (select (auth.jwt()->'app_metadata'->>'sipandu_role'))
      when 'warga' then (select auth.uid()) = user_id
      when 'ketua_rt' then
        status <> 'draft'
        and region_id = (
          select region_id from public.profiles
          where id = (select auth.uid())
        )
      when 'ketua_rw' then status <> 'draft'
      when 'admin'    then true
      else false
    end
  );

create policy "tickets_warga_insert" on public.tickets for insert to authenticated
  with check (
    (select (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'warga'
    and (select auth.uid()) = user_id
    and status = 'draft'
  );

create policy "tickets_warga_update_draft" on public.tickets for update to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'draft'
  )
  with check (
    (select auth.uid()) = user_id
    and status = 'draft'
  );

create policy "tickets_warga_delete_draft" on public.tickets for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'draft'
  );

-- -----------------------------------------------------------------------------
-- 7. Function: generate_ticket_number
-- -----------------------------------------------------------------------------
create or replace function public.generate_ticket_number(p_year int default null)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_year int;
  v_seq  int;
begin
  v_year := coalesce(p_year, extract(year from now())::int);
  select count(*) + 1
    into v_seq
    from public.tickets
   where ticket_number like 'PG-' || v_year || '-%';
  return 'PG-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. Table: ticket_attachments
-- -----------------------------------------------------------------------------
create table public.ticket_attachments (
  id           bigint generated always as identity primary key,
  ticket_id    bigint not null references public.tickets(id) on delete cascade,
  uploaded_by  uuid not null references auth.users(id),
  type         public.attachment_type not null,
  storage_path text not null,
  file_name    text not null,
  mime_type    text not null check (mime_type in ('image/jpeg', 'image/png')),
  size_bytes   bigint not null check (size_bytes <= 5242880),
  created_at   timestamptz not null default now()
);

create index ticket_attachments_ticket_id_idx on public.ticket_attachments(ticket_id);
create index ticket_attachments_uploaded_by_idx on public.ticket_attachments(uploaded_by);

alter table public.ticket_attachments enable row level security;

create policy "attachments_select" on public.ticket_attachments for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
      and case (select (auth.jwt()->'app_metadata'->>'sipandu_role'))
            when 'warga'     then (select auth.uid()) = t.user_id
            when 'ketua_rt'  then t.status <> 'draft' and t.region_id = (select region_id from public.profiles where id = (select auth.uid()))
            when 'ketua_rw'  then t.status <> 'draft'
            when 'admin'     then true
            else false
          end
    )
  );

create policy "attachments_insert_laporan" on public.ticket_attachments for insert to authenticated
  with check (
    type = 'laporan'
    and (select auth.uid()) = uploaded_by
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
        and t.user_id = (select auth.uid())
        and t.status in ('draft', 'terkirim')
    )
    and (
      select count(*) from public.ticket_attachments ta
      where ta.ticket_id = ticket_attachments.ticket_id and ta.type = 'laporan'
    ) < 3
  );

create policy "attachments_insert_penyelesaian" on public.ticket_attachments for insert to authenticated
  with check (
    type = 'penyelesaian'
    and (select auth.uid()) = uploaded_by
    and (select (auth.jwt()->'app_metadata'->>'sipandu_role')) in ('ketua_rw', 'admin')
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_attachments.ticket_id
        and t.status in ('diproses_rw', 'selesai')
    )
  );

create policy "attachments_delete" on public.ticket_attachments for delete to authenticated
  using (
    (select auth.uid()) = uploaded_by
    and type = 'laporan'
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_id and t.user_id = (select auth.uid()) and t.status = 'draft'
    )
  );

-- -----------------------------------------------------------------------------
-- 9. Table: ticket_timeline
-- -----------------------------------------------------------------------------
create table public.ticket_timeline (
  id          bigint generated always as identity primary key,
  ticket_id   bigint not null references public.tickets(id) on delete cascade,
  actor_id    uuid references auth.users(id),
  actor_name  text not null,
  actor_role  text not null,
  from_status public.ticket_status,
  to_status   public.ticket_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index ticket_timeline_ticket_id_idx on public.ticket_timeline(ticket_id);
create index ticket_timeline_actor_id_idx on public.ticket_timeline(actor_id);

alter table public.ticket_timeline enable row level security;

create policy "timeline_select" on public.ticket_timeline for select to authenticated
  using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_id
      and case (select (auth.jwt()->'app_metadata'->>'sipandu_role'))
            when 'warga'    then (select auth.uid()) = t.user_id
            when 'ketua_rt' then t.status <> 'draft' and t.region_id = (select region_id from public.profiles where id = (select auth.uid()))
            when 'ketua_rw' then t.status <> 'draft'
            when 'admin'    then true
            else false
          end
    )
  );

-- -----------------------------------------------------------------------------
-- 10. Table: notifications
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  ticket_id   bigint references public.tickets(id) on delete cascade,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_ticket_id_idx on public.notifications(ticket_id);

alter table public.notifications enable row level security;

create policy "notifications_own_select" on public.notifications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notifications_own_update" on public.notifications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 11. RPC State Machine & Helper Functions
-- -----------------------------------------------------------------------------

create or replace function public._get_actor_info(out actor_name text, out actor_role text, out actor_region_id bigint)
returns record
language plpgsql
security definer set search_path = public
as $$
begin
  select p.full_name, coalesce(auth.jwt()->'app_metadata'->>'sipandu_role', 'warga'), p.region_id
    into actor_name, actor_role, actor_region_id
    from public.profiles p
   where p.id = auth.uid();
end;
$$;

create or replace function public._notify_users(
  p_ticket_id bigint,
  p_message   text,
  p_user_ids  uuid[]
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid;
begin
  foreach v_uid in array p_user_ids loop
    insert into public.notifications (user_id, ticket_id, message)
    values (v_uid, p_ticket_id, p_message);
  end loop;
end;
$$;

create or replace function public.submit_ticket(p_ticket_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ticket        public.tickets;
  v_actor_name    text;
  v_actor_role    text;
  v_region_id     bigint;
  v_ticket_number text;
  v_rt_users      uuid[];
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if v_ticket.user_id <> auth.uid() then raise exception 'Akses ditolak'; end if;
  if v_ticket.status <> 'draft' then raise exception 'Tiket harus berstatus draft untuk dikirim'; end if;

  select actor_name, actor_role, actor_region_id
    into v_actor_name, v_actor_role, v_region_id
    from public._get_actor_info();

  v_ticket_number := public.generate_ticket_number();

  update public.tickets set
    status = 'terkirim',
    ticket_number = v_ticket_number,
    submitted_at = now(),
    updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status, note)
  values (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'draft', 'terkirim', 'Tiket dikirim oleh warga');

  select array_agg(p.id)
    into v_rt_users
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.region_id = v_ticket.region_id
     and (u.raw_app_meta_data->>'sipandu_role') = 'ketua_rt';

  if v_rt_users is not null then
    perform public._notify_users(p_ticket_id,
      'Tiket baru #' || v_ticket_number || ' menunggu verifikasi Anda.',
      v_rt_users);
  end if;
end;
$$;

create or replace function public.verify_ticket(p_ticket_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ticket     public.tickets;
  v_actor_name text;
  v_actor_role text;
  v_region_id  bigint;
  v_rw_users   uuid[];
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if v_ticket.status <> 'terkirim' then raise exception 'Tiket harus berstatus terkirim untuk diverifikasi'; end if;

  select actor_name, actor_role, actor_region_id
    into v_actor_name, v_actor_role, v_region_id
    from public._get_actor_info();

  if v_actor_role <> 'ketua_rt' then raise exception 'Hanya Ketua RT yang bisa memverifikasi tiket'; end if;
  if v_ticket.region_id <> v_region_id then raise exception 'Tiket tidak berada di RT Anda'; end if;

  update public.tickets set
    status = 'diverifikasi_rt',
    handler_rt_id = auth.uid(),
    verified_at = now(),
    updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status)
  values (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'terkirim', 'diverifikasi_rt');

  select array_agg(p.id)
    into v_rw_users
    from public.profiles p
    join auth.users u on u.id = p.id
   where (u.raw_app_meta_data->>'sipandu_role') in ('ketua_rw', 'admin');

  perform public._notify_users(p_ticket_id,
    'Tiket #' || v_ticket.ticket_number || ' telah diverifikasi oleh Ketua RT.',
    array_remove(array_cat(v_rw_users, array[v_ticket.user_id]), null));
end;
$$;

create or replace function public.reject_ticket(p_ticket_id bigint, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ticket     public.tickets;
  v_actor_name text;
  v_actor_role text;
  v_region_id  bigint;
begin
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Alasan penolakan wajib diisi';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if v_ticket.status <> 'terkirim' then raise exception 'Tiket harus berstatus terkirim untuk ditolak'; end if;

  select actor_name, actor_role, actor_region_id
    into v_actor_name, v_actor_role, v_region_id
    from public._get_actor_info();

  if v_actor_role <> 'ketua_rt' then raise exception 'Hanya Ketua RT yang bisa menolak tiket'; end if;
  if v_ticket.region_id <> v_region_id then raise exception 'Tiket tidak berada di RT Anda'; end if;

  update public.tickets set
    status = 'ditolak',
    rejection_reason = p_reason,
    handler_rt_id = auth.uid(),
    rejected_at = now(),
    updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status, note)
  values (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'terkirim', 'ditolak', p_reason);

  perform public._notify_users(p_ticket_id,
    'Tiket #' || v_ticket.ticket_number || ' ditolak: ' || p_reason,
    array[v_ticket.user_id]);
end;
$$;

create or replace function public.process_ticket(p_ticket_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ticket     public.tickets;
  v_actor_name text;
  v_actor_role text;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if v_ticket.status <> 'diverifikasi_rt' then raise exception 'Tiket harus berstatus diverifikasi_rt untuk diproses'; end if;

  select actor_name, actor_role
    into v_actor_name, v_actor_role
    from public._get_actor_info();

  if v_actor_role not in ('ketua_rw', 'admin') then raise exception 'Hanya Ketua RW atau Admin yang bisa memproses tiket'; end if;

  update public.tickets set
    status = 'diproses_rw',
    handler_rw_id = auth.uid(),
    processed_at = now(),
    updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status)
  values (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'diverifikasi_rt', 'diproses_rw');

  perform public._notify_users(p_ticket_id,
    'Tiket #' || v_ticket.ticket_number || ' sedang diproses oleh RW.',
    array[v_ticket.user_id]);
end;
$$;

create or replace function public.complete_ticket(p_ticket_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ticket      public.tickets;
  v_actor_name  text;
  v_actor_role  text;
  v_proof_count int;
begin
  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if v_ticket.status <> 'diproses_rw' then raise exception 'Tiket harus berstatus diproses_rw untuk diselesaikan'; end if;

  select count(*) into v_proof_count
    from public.ticket_attachments
   where ticket_id = p_ticket_id and type = 'penyelesaian';

  if v_proof_count < 1 then raise exception 'Minimal satu foto bukti penyelesaian wajib diunggah'; end if;

  select actor_name, actor_role
    into v_actor_name, v_actor_role
    from public._get_actor_info();

  if v_actor_role not in ('ketua_rw', 'admin') then raise exception 'Hanya Ketua RW atau Admin yang bisa menyelesaikan tiket'; end if;

  update public.tickets set
    status = 'selesai',
    completed_at = now(),
    updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status)
  values (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'diproses_rw', 'selesai');

  perform public._notify_users(p_ticket_id,
    'Tiket #' || v_ticket.ticket_number || ' telah selesai ditangani. Silakan berikan penilaian.',
    array[v_ticket.user_id]);
end;
$$;

create or replace function public.rate_ticket(p_ticket_id bigint, p_rating smallint, p_comment text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_ticket     public.tickets;
  v_actor_name text;
  v_actor_role text;
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating harus antara 1 dan 5'; end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if not found then raise exception 'Tiket tidak ditemukan'; end if;
  if v_ticket.user_id <> auth.uid() then raise exception 'Hanya pemilik tiket yang bisa memberi rating'; end if;
  if v_ticket.status <> 'selesai' then raise exception 'Rating hanya bisa diberikan pada tiket yang selesai'; end if;
  if v_ticket.rated_at is not null then raise exception 'Rating sudah diberikan sebelumnya'; end if;

  select actor_name, actor_role into v_actor_name, v_actor_role from public._get_actor_info();

  update public.tickets set
    rating = p_rating,
    rating_comment = p_comment,
    rated_at = now(),
    updated_at = now()
  where id = p_ticket_id;

  insert into public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status, note)
  values (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'selesai', 'selesai',
          'Rating: ' || p_rating || '/5' || coalesce(' - ' || p_comment, ''));
end;
$$;

create or replace function public.verify_resident(p_user_id uuid, p_region_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor_role text;
begin
  v_actor_role := (select (auth.jwt()->'app_metadata'->>'sipandu_role'));
  if v_actor_role <> 'admin' then raise exception 'Hanya Admin yang bisa verifikasi warga'; end if;

  update public.profiles set region_id = p_region_id, updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.public_stats()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'total_tickets', (select count(*) from public.tickets where status <> 'draft'),
    'selesai',       (select count(*) from public.tickets where status = 'selesai'),
    'diproses',      (select count(*) from public.tickets where status = 'diproses_rw'),
    'ditolak',       (select count(*) from public.tickets where status = 'ditolak')
  )
$$;

-- Permissions hardening
revoke execute on function public._get_actor_info() from public, anon, authenticated;
revoke execute on function public._notify_users(bigint, text, uuid[]) from public, anon, authenticated;
revoke execute on function public.generate_ticket_number(integer) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_user_app_metadata() from public, anon, authenticated;
revoke execute on function public.check_profile_update() from public, anon, authenticated;

revoke execute on function public.submit_ticket(bigint) from public, anon;
grant execute on function public.submit_ticket(bigint) to authenticated;

revoke execute on function public.verify_ticket(bigint) from public, anon;
grant execute on function public.verify_ticket(bigint) to authenticated;

revoke execute on function public.reject_ticket(bigint, text) from public, anon;
grant execute on function public.reject_ticket(bigint, text) to authenticated;

revoke execute on function public.process_ticket(bigint) from public, anon;
grant execute on function public.process_ticket(bigint) to authenticated;

revoke execute on function public.complete_ticket(bigint) from public, anon;
grant execute on function public.complete_ticket(bigint) to authenticated;

revoke execute on function public.rate_ticket(bigint, smallint, text) from public, anon;
grant execute on function public.rate_ticket(bigint, smallint, text) to authenticated;

revoke execute on function public.verify_resident(uuid, bigint) from public, anon;
grant execute on function public.verify_resident(uuid, bigint) to authenticated;

grant execute on function public.public_stats() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 12. Storage Bucket: ticket-attachments
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;

create policy "storage_upload_laporan" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] = 'laporan'
    and exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[2]
        and t.user_id = auth.uid()
        and t.status in ('draft', 'terkirim')
    )
  );

create policy "storage_upload_penyelesaian" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] = 'penyelesaian'
    and (select (auth.jwt()->'app_metadata'->>'sipandu_role')) in ('ketua_rw', 'admin')
    and exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[2]
        and t.status in ('diproses_rw', 'selesai')
    )
  );

create policy "storage_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[2]
      and case (select (auth.jwt()->'app_metadata'->>'sipandu_role'))
            when 'warga'    then auth.uid() = t.user_id
            when 'ketua_rt' then t.status <> 'draft' and t.region_id = (select region_id from public.profiles where id = auth.uid())
            when 'ketua_rw' then t.status <> 'draft'
            when 'admin'    then true
            else false
          end
    )
  );

create policy "storage_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and (storage.foldername(name))[1] = 'laporan'
    and exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[2]
        and t.user_id = auth.uid()
        and t.status = 'draft'
    )
  );

-- -----------------------------------------------------------------------------
-- 13. Seed Data
-- -----------------------------------------------------------------------------
insert into public.regions (name, rw) values
  ('RT 01', '06'),
  ('RT 02', '06'),
  ('RT 03', '06'),
  ('RT 04', '06'),
  ('RT 05', '06'),
  ('RT 06', '06'),
  ('RT 07', '06'),
  ('RT 08', '06')
on conflict do nothing;

insert into public.categories (name, description) values
  ('Infrastruktur', 'Jalan rusak, drainase, penerangan jalan, dll.'),
  ('Kebersihan', 'Sampah, kebersihan lingkungan, got mampet, dll.'),
  ('Keamanan', 'Tindak kriminal, gangguan keamanan, dll.'),
  ('Sosial', 'Masalah sosial warga, bantuan sosial, dll.'),
  ('Administrasi', 'Surat menyurat, KTP, KK, sertifikat, dll.'),
  ('Lainnya', 'Pengaduan di luar kategori yang tersedia')
on conflict do nothing;
