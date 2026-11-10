-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 0010_fix_null_region_auth_bypass.sql
--
-- Tujuan:
-- Menutup celah otorisasi three-valued logic (NULL comparison) pada RPC:
-- 1. public.verify_ticket(bigint)
-- 2. public.reject_ticket(bigint, text)
-- 3. public.verify_resident(uuid, boolean)
--
-- Sebelum migrasi ini:
-- - Pada verify_ticket dan reject_ticket, kondisi `v_ticket.region_id <> v_region_id`
--   menghasilkan UNKNOWN (NULL) jika `v_region_id` atau `v_ticket.region_id` bernilai NULL,
--   sehingga cabang IF tidak tereksekusi dan Ketua RT dengan region_id NULL dapat
--   memverifikasi atau menolak tiket di wilayah mana pun.
-- - Pada verify_resident, kondisi `v_caller_region_id IS NULL OR v_caller_region_id <> v_target_region_id`
--   menghasilkan UNKNOWN (NULL) ketika `v_caller_region_id` tidak NULL tetapi `v_target_region_id`
--   bernilai NULL (`FALSE OR UNKNOWN` -> `UNKNOWN`), sehingga Ketua RT dapat memverifikasi
--   akun warga yang belum memiliki region_id (NULL).
--
-- Perbaikan:
-- Menggunakan pengecekan eksplisit `IS NULL` untuk wilayah pemanggil maupun target,
-- serta operator NULL-safe `IS DISTINCT FROM` untuk memastikan wilayah Ketua RT
-- dan wilayah target sama-sama terdefinisi (NOT NULL) dan identik.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Hardened public.verify_ticket(bigint)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_ticket(p_ticket_id bigint)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket     public.tickets;
  v_actor_name text;
  v_actor_role text;
  v_region_id  bigint;
  v_rw_users   uuid[];
BEGIN
  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tiket tidak ditemukan'; END IF;
  IF v_ticket.status <> 'terkirim' THEN RAISE EXCEPTION 'Tiket harus berstatus terkirim untuk diverifikasi'; END IF;

  SELECT actor_name, actor_role, actor_region_id
    INTO v_actor_name, v_actor_role, v_region_id
    FROM public._get_actor_info();

  IF v_actor_role IS DISTINCT FROM 'ketua_rt' THEN
    RAISE EXCEPTION 'Hanya Ketua RT yang bisa memverifikasi tiket';
  END IF;

  IF v_region_id IS NULL OR v_ticket.region_id IS NULL OR v_ticket.region_id IS DISTINCT FROM v_region_id THEN
    RAISE EXCEPTION 'Tiket tidak berada di RT Anda';
  END IF;

  UPDATE public.tickets SET
    status = 'diverifikasi_rt',
    handler_rt_id = auth.uid(),
    verified_at = now(),
    updated_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status)
  VALUES (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'terkirim', 'diverifikasi_rt');

  SELECT array_agg(p.id)
    INTO v_rw_users
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
   WHERE (u.raw_app_meta_data->>'sipandu_role') IN ('ketua_rw', 'admin');

  PERFORM public._notify_users(p_ticket_id,
    'Tiket #' || COALESCE(v_ticket.ticket_number, v_ticket.id::text) || ' telah diverifikasi oleh Ketua RT.',
    array_remove(array_cat(v_rw_users, ARRAY[v_ticket.user_id]), null));
END;
$$;

REVOKE ALL ON FUNCTION public.verify_ticket(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_ticket(bigint) TO authenticated, service_role, postgres;

-- -----------------------------------------------------------------------------
-- 2. Hardened public.reject_ticket(bigint, text)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_ticket(p_ticket_id bigint, p_reason text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ticket     public.tickets;
  v_actor_name text;
  v_actor_role text;
  v_region_id  bigint;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Alasan penolakan wajib diisi';
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tiket tidak ditemukan'; END IF;
  IF v_ticket.status <> 'terkirim' THEN RAISE EXCEPTION 'Tiket harus berstatus terkirim untuk ditolak'; END IF;

  SELECT actor_name, actor_role, actor_region_id
    INTO v_actor_name, v_actor_role, v_region_id
    FROM public._get_actor_info();

  IF v_actor_role IS DISTINCT FROM 'ketua_rt' THEN
    RAISE EXCEPTION 'Hanya Ketua RT yang bisa menolak tiket';
  END IF;

  IF v_region_id IS NULL OR v_ticket.region_id IS NULL OR v_ticket.region_id IS DISTINCT FROM v_region_id THEN
    RAISE EXCEPTION 'Tiket tidak berada di RT Anda';
  END IF;

  UPDATE public.tickets SET
    status = 'ditolak',
    rejection_reason = p_reason,
    handler_rt_id = auth.uid(),
    rejected_at = now(),
    updated_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO public.ticket_timeline (ticket_id, actor_id, actor_name, actor_role, from_status, to_status, note)
  VALUES (p_ticket_id, auth.uid(), v_actor_name, v_actor_role, 'terkirim', 'ditolak', p_reason);

  PERFORM public._notify_users(p_ticket_id,
    'Tiket #' || COALESCE(v_ticket.ticket_number, v_ticket.id::text) || ' ditolak: ' || p_reason,
    ARRAY[v_ticket.user_id]);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_ticket(bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_ticket(bigint, text) TO authenticated, service_role, postgres;

-- -----------------------------------------------------------------------------
-- 3. Hardened public.verify_resident(uuid, boolean)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_resident(
  p_user_id uuid,
  p_is_verified boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_caller_id          uuid;
  v_caller_name        text;
  v_caller_role        text;
  v_caller_region_id   bigint;
  v_caller_active      boolean;
  v_target_role        text;
  v_target_region_id   bigint;
  v_target_is_verified boolean;
  v_role_title         text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Akses ditolak: sesi tidak terotentikasi';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'ID warga tidak valid';
  END IF;

  IF v_caller_id = p_user_id THEN
    RAISE EXCEPTION 'Tidak dapat memverifikasi akun Anda sendiri';
  END IF;

  IF p_is_verified IS NULL THEN
    RAISE EXCEPTION 'Parameter status verifikasi (p_is_verified) tidak boleh bernilai NULL';
  END IF;

  -- 1. Validasi Pemanggil dari database terkini (kebal stale JWT)
  SELECT
    p.full_name,
    p.region_id,
    p.is_active,
    u.raw_app_meta_data->>'sipandu_role'
  INTO
    v_caller_name,
    v_caller_region_id,
    v_caller_active,
    v_caller_role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = v_caller_id
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now());

  IF NOT FOUND OR v_caller_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Akses ditolak: akun Anda tidak aktif atau tidak ditemukan';
  END IF;

  -- Role pemanggil wajib diakui dan memiliki wewenang verifikasi
  IF v_caller_role IS NULL OR v_caller_role NOT IN ('ketua_rt', 'ketua_rw', 'admin') THEN
    RAISE EXCEPTION 'Hanya Ketua RT, Ketua RW, atau Admin aktif yang dapat memverifikasi warga';
  END IF;

  -- 2. Validasi & Penguncian Target (auth.users FOR SHARE -> public.profiles FOR UPDATE)
  SELECT
    u.raw_app_meta_data->>'sipandu_role'
  INTO
    v_target_role
  FROM auth.users u
  WHERE u.id = p_user_id
    AND u.deleted_at IS NULL
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warga tidak ditemukan';
  END IF;

  -- Target wajib memiliki role 'warga' (akun staf bukan subjek verifikasi warga)
  IF v_target_role IS NULL OR v_target_role <> 'warga' THEN
    RAISE EXCEPTION 'Hanya akun warga yang dapat diverifikasi status kewargaannya';
  END IF;

  -- 2b. Kunci target di public.profiles (FOR UPDATE)
  SELECT
    p.region_id,
    p.is_rt_verified
  INTO
    v_target_region_id,
    v_target_is_verified
  FROM public.profiles p
  WHERE p.id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil warga tidak ditemukan';
  END IF;

  -- 3. Penegakan Batas Yurisdiksi Wilayah (Point-in-Time Authorization, NULL-safe)
  IF v_caller_role = 'ketua_rt' THEN
    IF v_caller_region_id IS NULL OR v_target_region_id IS NULL OR v_caller_region_id IS DISTINCT FROM v_target_region_id THEN
      RAISE EXCEPTION 'Ketua RT hanya bisa memverifikasi warga di wilayah RT yang sama';
    END IF;
  END IF;

  -- 4. Terapkan Nilai Parameter Verifikasi (true maupun false)
  UPDATE public.profiles
     SET is_rt_verified = p_is_verified,
         updated_at = pg_catalog.now()
   WHERE id = p_user_id;

  -- 5. Kirim Notifikasi Idempoten (Hanya saat transisi false -> true)
  IF p_is_verified AND (v_target_is_verified IS DISTINCT FROM true) THEN
    v_role_title := CASE v_caller_role
      WHEN 'ketua_rt' THEN 'Ketua RT'
      WHEN 'ketua_rw' THEN 'Ketua RW'
      WHEN 'admin'    THEN 'Admin'
      ELSE 'Pengurus'
    END;

    INSERT INTO public.notifications (user_id, ticket_id, message)
    VALUES (
      p_user_id,
      NULL,
      'Akun Anda telah disetujui oleh ' || COALESCE(v_caller_name, 'Pengurus') || ' (' || v_role_title || '). Sekarang Anda dapat membuat dan memantau pengaduan warga.'
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_resident(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_resident(uuid, boolean) TO authenticated, service_role, postgres;
