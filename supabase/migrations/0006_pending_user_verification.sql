-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 0006_pending_user_verification.sql
-- 1. Pastikan seluruh pengurus (RT, RW, Admin) otomatis terverifikasi (is_rt_verified = true)
-- 2. Perbarui trigger handle_new_user agar pengurus baru otomatis terverifikasi
-- 3. Perbarui fungsi verify_resident agar Ketua RW juga dapat menyetujui warga
-- 4. Perbarui trigger check_profile_update agar Ketua RW diizinkan mengubah is_rt_verified
-- 5. Tambahkan notifikasi otomatis saat akun warga disetujui
-- 6. Perketat policy insert dan RPC submit_ticket HANYA untuk role warga yang belum disetujui
-- 7. Tambahkan index pada profiles(is_rt_verified) untuk performa filter pending user
-- =============================================================================

-- 1. Index untuk mempercepat query warga yang menunggu persetujuan
CREATE INDEX IF NOT EXISTS profiles_is_rt_verified_idx ON public.profiles(is_rt_verified);

-- 2. Pastikan seluruh pengurus (RT, RW, Admin) otomatis terverifikasi
UPDATE public.profiles p
   SET is_rt_verified = true
  FROM auth.users u
 WHERE u.id = p.id
   AND COALESCE(u.raw_app_meta_data->>'sipandu_role', 'warga') IN ('ketua_rt', 'ketua_rw', 'admin');

-- 3. Perbarui trigger handle_new_user agar pengurus otomatis terverifikasi saat akun dibuat
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_is_verified boolean;
BEGIN
  v_role := COALESCE(NEW.raw_app_meta_data->>'sipandu_role', 'warga');
  -- Pengurus (RT, RW, Admin) otomatis langsung terverifikasi; hanya warga umum yang menunggu persetujuan
  v_is_verified := (v_role IN ('ketua_rt', 'ketua_rw', 'admin'));

  INSERT INTO public.profiles (id, full_name, phone, address, region_id, is_rt_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    (NEW.raw_user_meta_data->>'region_id')::bigint,
    v_is_verified
  );
  RETURN NEW;
END;
$$;

-- 4. Perbarui trigger check_profile_update
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_jwt_role text;
BEGIN
  v_jwt_role := COALESCE(auth.jwt()->>'role', '');
  v_role := COALESCE(auth.jwt()->'app_metadata'->>'sipandu_role', '');

  IF v_jwt_role = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF (OLD.region_id IS DISTINCT FROM NEW.region_id) THEN
    IF v_role <> 'admin' THEN
      RAISE EXCEPTION 'Hanya Admin yang dapat mengubah RT / wilayah';
    END IF;
  END IF;

  IF (OLD.is_rt_verified IS DISTINCT FROM NEW.is_rt_verified) THEN
    IF v_role NOT IN ('ketua_rt', 'ketua_rw', 'admin') THEN
      RAISE EXCEPTION 'Warga tidak dapat mengubah status verifikasi sendiri';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Perbarui RPC verify_resident (Dukungan RT, RW, dan Admin untuk menyetujui WARGA)
CREATE OR REPLACE FUNCTION public.verify_resident(p_user_id uuid, p_is_verified boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role      text;
  v_caller_region_id bigint;
  v_caller_name      text;
  v_target_role      text;
  v_target_region_id bigint;
  v_caller_active    boolean;
  v_role_title       text;
BEGIN
  SELECT COALESCE(auth.jwt()->'app_metadata'->>'sipandu_role', ''), p.region_id, p.is_active, p.full_name
    INTO v_caller_role, v_caller_region_id, v_caller_active, v_caller_name
    FROM public.profiles p
   WHERE p.id = auth.uid();

  IF v_caller_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Akun Anda dinonaktifkan';
  END IF;

  IF v_caller_role NOT IN ('ketua_rt', 'ketua_rw', 'admin') THEN
    RAISE EXCEPTION 'Hanya Ketua RT, Ketua RW, atau Admin yang bisa memverifikasi warga';
  END IF;

  -- Periksa data warga target
  SELECT p.region_id, COALESCE(u.raw_app_meta_data->>'sipandu_role', 'warga')
    INTO v_target_region_id, v_target_role
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
   WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warga tidak ditemukan';
  END IF;

  -- Jika target adalah pengurus, tidak memerlukan verifikasi warga
  IF v_target_role IN ('ketua_rt', 'ketua_rw', 'admin') THEN
    UPDATE public.profiles SET is_rt_verified = true WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Jika pemanggil adalah Ketua RT, batasi hanya untuk RT sewilayah
  IF v_caller_role = 'ketua_rt' AND (v_caller_region_id IS NULL OR v_caller_region_id <> v_target_region_id) THEN
    RAISE EXCEPTION 'Ketua RT hanya bisa memverifikasi warga di wilayah RT yang sama';
  END IF;

  -- Update status verifikasi warga
  UPDATE public.profiles
     SET is_rt_verified = p_is_verified,
         updated_at = now()
   WHERE id = p_user_id;

  -- Notifikasi ke warga ketika disetujui
  IF p_is_verified THEN
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

GRANT EXECUTE ON FUNCTION public.verify_resident(uuid, boolean) TO authenticated;

-- 6. Perketat policy insert tickets agar hanya berlaku bagi role 'warga' yang belum disetujui
DROP POLICY IF EXISTS "tickets_warga_insert" ON public.tickets;
CREATE POLICY "tickets_warga_insert" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    public._is_caller_active()
    AND (
      -- Pengurus dapat insert draft tanpa batas verifikasi warga
      (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) <> 'warga'
      OR (
        (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'warga'
        AND (SELECT auth.uid()) = user_id
        AND status = 'draft'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid()) AND is_rt_verified = true
        )
      )
    )
  );

-- 7. Perketat RPC submit_ticket (hanya warga umum yang dicek status persetujuannya)
CREATE OR REPLACE FUNCTION public.submit_ticket(p_ticket_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ticket        public.tickets;
  v_actor_name    text;
  v_actor_role    text;
  v_region_id     bigint;
  v_ticket_number text;
  v_rt_users      uuid[];
  v_is_verified   boolean;
BEGIN
  -- Validasi status persetujuan HANYA jika pemanggil adalah 'warga'
  IF (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'warga' THEN
    SELECT is_rt_verified INTO v_is_verified
      FROM public.profiles
     WHERE id = auth.uid();

    IF v_is_verified IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Akun Anda belum disetujui oleh Ketua RT, Ketua RW, atau Admin';
    END IF;
  END IF;

  SELECT * INTO v_ticket FROM public.tickets WHERE id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tiket tidak ditemukan'; END IF;
  IF v_ticket.user_id <> auth.uid() THEN RAISE EXCEPTION 'Akses ditolak'; END IF;
  IF v_ticket.status <> 'draft' THEN RAISE EXCEPTION 'Tiket harus berstatus draft untuk dikirim'; END IF;

  SELECT actor_name, actor_role, actor_region_id
    INTO v_actor_name, v_actor_role, v_region_id
    FROM public._get_actor_info();

  v_ticket_number := public.generate_ticket_number();

  UPDATE public.tickets SET
    status = 'terkirim',
    ticket_number = v_ticket_number,
    submitted_at = now(),
    updated_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO public.ticket_timeline (ticket_id, from_status, to_status, actor_id, actor_name, actor_role, note)
  VALUES (p_ticket_id, 'draft', 'terkirim', auth.uid(), v_actor_name, v_actor_role, 'Tiket diajukan oleh warga');

  -- Notifikasi ke Ketua RT di wilayah terkait
  SELECT array_agg(u.id) INTO v_rt_users
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
   WHERE p.region_id = v_ticket.region_id
     AND (u.raw_app_meta_data->>'sipandu_role') = 'ketua_rt';

  IF v_rt_users IS NOT NULL THEN
    PERFORM public._notify_users(p_ticket_id,
      'Tiket baru #' || v_ticket_number || ' menunggu verifikasi Anda.',
      v_rt_users);
  END IF;
END;
$$;
