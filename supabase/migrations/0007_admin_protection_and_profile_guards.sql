-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 0007_admin_protection_and_profile_guards.sql
-- 1. Proteksi Akun Admin Terakhir di tingkat database (auth.users)
-- 2. Penguatan trigger check_profile_update untuk status is_active (public.profiles)
-- =============================================================================

-- 1. Fungsi & Trigger untuk melindungi akun Admin terakhir pada auth.users
CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_active_admin_count int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF (OLD.raw_app_meta_data->>'sipandu_role') = 'admin' THEN
      SELECT COUNT(*) INTO v_active_admin_count
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
        AND p.is_active = true
        AND (u.banned_until IS NULL OR u.banned_until <= now())
        AND u.id <> OLD.id;

      IF v_active_admin_count < 1 THEN
        RAISE EXCEPTION 'Operasi dibatalkan: Tidak dapat menghapus akun Admin terakhir. Sistem wajib mempertahankan minimal 1 akun Admin aktif.';
      END IF;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Cek jika peran diubah dari admin ke non-admin
    IF (OLD.raw_app_meta_data->>'sipandu_role') = 'admin'
       AND COALESCE(NEW.raw_app_meta_data->>'sipandu_role', '') <> 'admin' THEN
      SELECT COUNT(*) INTO v_active_admin_count
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
        AND p.is_active = true
        AND (u.banned_until IS NULL OR u.banned_until <= now())
        AND u.id <> OLD.id;

      IF v_active_admin_count < 1 THEN
        RAISE EXCEPTION 'Operasi dibatalkan: Tidak dapat mengubah peran akun Admin terakhir. Sistem wajib mempertahankan minimal 1 akun Admin aktif.';
      END IF;
    END IF;

    -- Cek jika akun admin diban / dinonaktifkan di auth
    IF (OLD.raw_app_meta_data->>'sipandu_role') = 'admin'
       AND (OLD.banned_until IS NULL OR OLD.banned_until <= now())
       AND (NEW.banned_until IS NOT NULL AND NEW.banned_until > now()) THEN
      SELECT COUNT(*) INTO v_active_admin_count
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
      WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
        AND p.is_active = true
        AND (u.banned_until IS NULL OR u.banned_until <= now())
        AND u.id <> OLD.id;

      IF v_active_admin_count < 1 THEN
        RAISE EXCEPTION 'Operasi dibatalkan: Tidak dapat memblokir/menonaktifkan akun Admin terakhir.';
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_last_admin ON auth.users;
CREATE TRIGGER tr_protect_last_admin
BEFORE UPDATE OR DELETE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_last_admin();

-- 2. Penguatan trigger check_profile_update pada public.profiles
CREATE OR REPLACE FUNCTION public.check_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_jwt_role text;
  v_active_admin_count int;
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

  IF (OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    IF v_role <> 'admin' THEN
      RAISE EXCEPTION 'Hanya Admin yang dapat mengubah status aktif akun';
    END IF;

    -- Jika akun admin dinonaktifkan, pastikan minimal 1 admin aktif tetap ada
    IF OLD.is_active = true AND NEW.is_active = false THEN
      IF (SELECT COALESCE(raw_app_meta_data->>'sipandu_role', '') FROM auth.users WHERE id = OLD.id) = 'admin' THEN
        SELECT COUNT(*) INTO v_active_admin_count
        FROM auth.users u
        JOIN public.profiles p ON p.id = u.id
        WHERE (u.raw_app_meta_data->>'sipandu_role') = 'admin'
          AND p.is_active = true
          AND (u.banned_until IS NULL OR u.banned_until <= now())
          AND u.id <> OLD.id;

        IF v_active_admin_count < 1 THEN
          RAISE EXCEPTION 'Operasi dibatalkan: Tidak dapat menonaktifkan akun Admin terakhir. Sistem wajib memiliki minimal 1 akun Admin aktif.';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
