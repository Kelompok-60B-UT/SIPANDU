-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 0007_admin_protection_and_profile_guards.sql
-- 1. Preflight assertion: Verifikasi minimal 1 Admin aktif sah sebelum DDL
-- 2. Helper function _is_caller_admin() & Penguatan RLS untuk Admin
-- 3. Proteksi Akun Admin Terakhir di tingkat database (auth.users)
-- 4. Penguatan trigger check_profile_guards untuk status is_active & delete (public.profiles)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Preflight Assertion
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_total_users   int;
  v_active_admins int;
BEGIN
  SELECT count(*) INTO v_total_users
  FROM auth.users
  WHERE deleted_at IS NULL;

  SELECT count(*) INTO v_active_admins
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
    AND p.is_active = true;

  IF v_total_users = 0 THEN
    RAISE NOTICE 'PREFLIGHT SKIPPED: Database kosong (0 akun di auth.users). Pastikan bootstrap Admin aktif dijalankan setelah migrasi selesai.';
  ELSIF v_active_admins < 1 THEN
    RAISE EXCEPTION 'PREFLIGHT ABORT: Ditemukan 0 akun Admin aktif sah dari % akun terdaftar. Sistem wajib memiliki minimal 1 Admin aktif sebelum migration ini dapat diterapkan.', v_total_users;
  ELSE
    RAISE NOTICE 'PREFLIGHT PASSED: Terverifikasi % akun Admin aktif sah.', v_active_admins;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Helper functions (_is_caller_admin, _get_caller_role) & Pembaruan RLS Policies
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._is_caller_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT COALESCE((
    SELECT (u.raw_app_meta_data->>'sipandu_role') = 'admin'
       AND p.is_active = true
       AND u.deleted_at IS NULL
       AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = (SELECT auth.uid())
  ), false);
$$;

REVOKE ALL ON FUNCTION public._is_caller_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._is_caller_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public._get_caller_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT u.raw_app_meta_data->>'sipandu_role'
  FROM auth.users u
  JOIN public.profiles p ON p.id = u.id
  WHERE u.id = (SELECT auth.uid())
    AND p.is_active = true
    AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
    AND (u.raw_app_meta_data->>'sipandu_role') IN ('warga', 'ketua_rt', 'ketua_rw', 'admin');
$$;

REVOKE ALL ON FUNCTION public._get_caller_role() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._get_caller_role() TO authenticated;

-- Perbarui policy categories_admin_write agar menggunakan helper real-time
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL
  USING (public._is_caller_admin())
  WITH CHECK (public._is_caller_admin());

-- Perbarui policy regions_admin_write agar menggunakan helper real-time
DROP POLICY IF EXISTS "regions_admin_write" ON public.regions;
CREATE POLICY "regions_admin_write" ON public.regions
  FOR ALL
  USING (public._is_caller_admin())
  WITH CHECK (public._is_caller_admin());

-- Perbarui policy tickets_admin_delete agar menggunakan helper real-time
DROP POLICY IF EXISTS "tickets_admin_delete" ON public.tickets;
CREATE POLICY "tickets_admin_delete" ON public.tickets
  FOR DELETE
  USING (public._is_caller_admin());

-- Perbarui policy profiles_own_select agar menggunakan role real-time
DROP POLICY IF EXISTS "profiles_own_select" ON public.profiles;
CREATE POLICY "profiles_own_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR (SELECT public._get_caller_role()) IN ('ketua_rt', 'ketua_rw', 'admin')
  );

-- Perbarui policy tickets_warga_select agar menggunakan role real-time
DROP POLICY IF EXISTS "tickets_warga_select" ON public.tickets;
CREATE POLICY "tickets_warga_select" ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public._is_caller_active()
    AND CASE (SELECT public._get_caller_role())
      WHEN 'warga' THEN (SELECT auth.uid()) = user_id
      WHEN 'ketua_rt' THEN (
        status <> 'draft'
        AND region_id = (
          SELECT p.region_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())
        )
      )
      WHEN 'ketua_rw' THEN (status <> 'draft')
      WHEN 'admin' THEN true
      ELSE false
    END
  );

-- Perbarui policy attachments_insert_penyelesaian agar menggunakan role real-time
DROP POLICY IF EXISTS "attachments_insert_penyelesaian" ON public.ticket_attachments;
CREATE POLICY "attachments_insert_penyelesaian" ON public.ticket_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    public._is_caller_active()
    AND type = 'penyelesaian'
    AND (SELECT auth.uid()) = uploaded_by
    AND (SELECT public._get_caller_role()) IN ('ketua_rw', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND t.status <> 'draft'
    )
  );

-- Perbarui policy attachments_delete agar menggunakan role real-time
DROP POLICY IF EXISTS "attachments_delete" ON public.ticket_attachments;
CREATE POLICY "attachments_delete" ON public.ticket_attachments
  FOR DELETE TO authenticated
  USING (
    public._is_caller_active()
    AND (
      (SELECT public._get_caller_role()) = 'admin'
      OR (
        (SELECT public._get_caller_role()) = 'ketua_rw'
        AND type = 'penyelesaian'
      )
      OR (
        (SELECT auth.uid()) = uploaded_by
        AND type = 'laporan'
        AND EXISTS (
          SELECT 1 FROM public.tickets t
          WHERE t.id = ticket_attachments.ticket_id
            AND t.user_id = (SELECT auth.uid())
            AND t.status = 'draft'
        )
      )
    )
  );

-- Perbarui policy storage_upload_penyelesaian agar menggunakan role real-time
DROP POLICY IF EXISTS "storage_upload_penyelesaian" ON storage.objects;
CREATE POLICY "storage_upload_penyelesaian" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND (storage.foldername(name))[1] = 'penyelesaian'
    AND (SELECT public._get_caller_role()) IN ('ketua_rw', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(objects.name))[2]
        AND t.status <> 'draft'
    )
  );

-- Perbarui policy storage_delete agar menggunakan role real-time
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
CREATE POLICY "storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND (
      (SELECT public._get_caller_role()) = 'admin'
      OR (
        (SELECT public._get_caller_role()) = 'ketua_rw'
        AND (storage.foldername(name))[1] = 'penyelesaian'
      )
      OR (
        (storage.foldername(name))[1] = 'laporan'
        AND EXISTS (
          SELECT 1 FROM public.tickets t
          WHERE t.id::text = (storage.foldername(objects.name))[2]
            AND t.user_id = (SELECT auth.uid())
            AND t.status = 'draft'
        )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 3. Fungsi & Trigger untuk melindungi akun Admin aktif pada auth.users
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_was_active boolean;
  v_is_demoting boolean;
  v_is_soft_deleting boolean;
  v_is_banning boolean;
  v_active_admin_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_was_active := (
      (OLD.raw_app_meta_data->>'sipandu_role') = 'admin'
      AND OLD.deleted_at IS NULL
      AND (OLD.banned_until IS NULL OR OLD.banned_until <= pg_catalog.now())
      AND EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = OLD.id AND p.is_active = true
      )
    );

    IF v_was_active THEN
      PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('sipandu_admin_protection_lock')::bigint);

      SELECT COUNT(*) INTO v_active_admin_count
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
        AND u.deleted_at IS NULL
        AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
        AND p.is_active = true
        AND u.id <> OLD.id;

      IF v_active_admin_count < 1 THEN
        RAISE EXCEPTION 'Operasi dibatalkan: Tidak dapat menghapus akun Admin terakhir. Sistem wajib mempertahankan minimal 1 akun Admin aktif.';
      END IF;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    v_is_demoting := (
      (OLD.raw_app_meta_data->>'sipandu_role') = 'admin'
      AND COALESCE(NEW.raw_app_meta_data->>'sipandu_role', '') <> 'admin'
    );
    v_is_soft_deleting := (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL);
    v_is_banning := (
      (OLD.banned_until IS NULL OR OLD.banned_until <= pg_catalog.now())
      AND (NEW.banned_until IS NOT NULL AND NEW.banned_until > pg_catalog.now())
    );

    IF (v_is_demoting OR v_is_soft_deleting OR v_is_banning) THEN
      v_was_active := (
        (OLD.raw_app_meta_data->>'sipandu_role') = 'admin'
        AND OLD.deleted_at IS NULL
        AND (OLD.banned_until IS NULL OR OLD.banned_until <= pg_catalog.now())
        AND EXISTS (
          SELECT 1 FROM public.profiles p WHERE p.id = OLD.id AND p.is_active = true
        )
      );

      IF v_was_active THEN
        PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('sipandu_admin_protection_lock')::bigint);

        SELECT COUNT(*) INTO v_active_admin_count
        FROM auth.users u
        JOIN public.profiles p ON p.id = u.id
        WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
          AND u.deleted_at IS NULL
          AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
          AND p.is_active = true
          AND u.id <> OLD.id;

        IF v_active_admin_count < 1 THEN
          RAISE EXCEPTION 'Operasi dibatalkan: Tidak dapat menurunkan peran, mencekal, atau menghapus akun Admin terakhir. Sistem wajib mempertahankan minimal 1 akun Admin aktif.';
        END IF;
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_last_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tr_protect_last_admin ON auth.users;
CREATE TRIGGER tr_protect_last_admin
BEFORE UPDATE OR DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_admin();

-- -----------------------------------------------------------------------------
-- 4. Penguatan trigger check_profile_guards pada public.profiles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_profile_guards()
RETURNS trigger
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_jwt_role             text;
  v_caller_id            uuid;
  v_is_system            boolean;
  v_caller_role          text;
  v_caller_active        boolean;
  v_is_active_auth_admin boolean;
  v_active_admin_count   int;
BEGIN
  v_jwt_role  := COALESCE(auth.jwt()->>'role', '');
  v_caller_id := auth.uid();

  -- Identifikasi konteks pemanggil sistem tepercaya yang sah:
  -- 1. PostgREST request dengan Service Role Key (v_jwt_role = 'service_role')
  -- 2. Koneksi internal / administratif langsung (auth.jwt() IS NULL dan session_user terverifikasi)
  --    - postgres: CLI migrasi / maintenance
  --    - supabase_admin: superuser platform
  --    - supabase_auth_admin: daemon GoTrue Auth (termasuk cascade delete saat deleteUser)
  v_is_system := (
    v_jwt_role = 'service_role'
    OR (auth.jwt() IS NULL AND session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin'))
  );

  -- A. Pemeriksaan Otorisasi Operasional
  IF NOT v_is_system THEN
    -- Wajib memiliki role JWT 'authenticated'
    IF v_jwt_role <> 'authenticated' THEN
      RAISE EXCEPTION 'Akses ditolak: sesi tidak terotentikasi';
    END IF;

    -- Wajib memiliki auth.uid() yang valid
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'Akses ditolak: identitas autentikasi tidak valid';
    END IF;

    -- Ambil role dan status aktif terkini dari database untuk pemanggil authenticated
    -- Menolak stale JWT dan mengevaluasi status ban serta soft-delete secara real-time
    SELECT u.raw_app_meta_data->>'sipandu_role', p.is_active
      INTO v_caller_role, v_caller_active
      FROM public.profiles p
      JOIN auth.users u ON u.id = p.id
     WHERE p.id = v_caller_id
       AND u.deleted_at IS NULL
       AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now());

    IF NOT FOUND OR v_caller_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Akses ditolak: akun pemanggil tidak aktif atau tidak ditemukan';
    END IF;

    -- Role NULL atau tidak dikenal harus ditolak secara tertutup (tanpa fallback)
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('warga', 'ketua_rt', 'ketua_rw', 'admin') THEN
      RAISE EXCEPTION 'Akses ditolak: peran pengguna tidak sah';
    END IF;

    -- Batas perubahan kolom operasional
    IF TG_OP = 'UPDATE' THEN
      -- Validasi region_id: Mutlak hanya Admin (konsisten dengan 0001, 0003, 0006)
      IF (OLD.region_id IS DISTINCT FROM NEW.region_id) THEN
        IF v_caller_role <> 'admin' THEN
          RAISE EXCEPTION 'Hanya Admin yang dapat mengubah RT / wilayah';
        END IF;
      END IF;

      -- Validasi is_rt_verified: Hanya Ketua RT, Ketua RW, atau Admin
      IF (OLD.is_rt_verified IS DISTINCT FROM NEW.is_rt_verified) THEN
        IF v_caller_role NOT IN ('ketua_rt', 'ketua_rw', 'admin') THEN
          RAISE EXCEPTION 'Warga tidak dapat mengubah status verifikasi sendiri';
        END IF;
      END IF;

      -- Validasi is_active: Hanya Admin
      IF (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
        IF v_caller_role <> 'admin' THEN
          RAISE EXCEPTION 'Hanya Admin yang dapat mengubah status aktif akun';
        END IF;
      END IF;
    END IF;
  END IF;

  -- B. Penegakan Invariant Admin Terakhir (WAJIB UNTUK SEMUA CALLER, termasuk service_role dan koneksi sistem)
  IF (TG_OP = 'DELETE' AND OLD.is_active = true) OR
     (TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false) THEN

    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('sipandu_admin_protection_lock')::bigint);

    SELECT EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = OLD.id
        AND (u.raw_app_meta_data->>'sipandu_role') = 'admin'
        AND u.deleted_at IS NULL
        AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
    ) INTO v_is_active_auth_admin;

    IF v_is_active_auth_admin THEN
      SELECT COUNT(*) INTO v_active_admin_count
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
        AND u.deleted_at IS NULL
        AND (u.banned_until IS NULL OR u.banned_until <= pg_catalog.now())
        AND p.is_active = true
        AND u.id <> OLD.id;

      IF v_active_admin_count < 1 THEN
        RAISE EXCEPTION 'Operasi dibatalkan: Tidak dapat menonaktifkan atau menghapus profil Admin terakhir. Sistem wajib mempertahankan minimal 1 akun Admin aktif.';
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_profile_guards() FROM PUBLIC, anon, authenticated;

-- Bersihkan trigger profil lama agar tidak berjalan duplikat
DROP TRIGGER IF EXISTS on_profile_before_update ON public.profiles;
DROP TRIGGER IF EXISTS tr_check_profile_guards ON public.profiles;

CREATE TRIGGER tr_check_profile_guards
BEFORE UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.check_profile_guards();

-- -----------------------------------------------------------------------------
-- 5. Penguatan RPC verify_resident(uuid, boolean)
-- -----------------------------------------------------------------------------
-- Hapus overload legacy yang menggunakan otorisasi berbasis JWT.
-- Verifikasi warga saat ini menggunakan verify_resident(uuid, boolean).
DROP FUNCTION IF EXISTS public.verify_resident(uuid, bigint);

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
  -- Catatan: Profil pemanggil tidak dikunci untuk mencegah deadlock dengan operasi bulk (misal deleteRegion).
  -- Otorisasi wilayah berlaku berdasarkan committed snapshot saat pemeriksaan awal (point-in-time authorization).
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
  -- 2a. Kunci target di auth.users (FOR SHARE)
  -- Mencegah race condition jika GoTrue updateUserRole() mengubah role target saat verifikasi berjalan.
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
  -- Menserialisasi pemanggilan konkuren, mengunci wilayah dan status verifikasi target
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

  -- 3. Penegakan Batas Yurisdiksi Wilayah (Point-in-Time Authorization)
  IF v_caller_role = 'ketua_rt' THEN
    IF v_caller_region_id IS NULL OR v_caller_region_id <> v_target_region_id THEN
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

-- Penegakan least privilege untuk RPC verifikasi warga.
REVOKE ALL ON FUNCTION public.verify_resident(uuid, boolean)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.verify_resident(uuid, boolean)
TO authenticated;
