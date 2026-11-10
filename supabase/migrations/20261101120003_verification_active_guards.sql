-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 0003_verification_active_guards.sql
-- 1. Kolom profiles.is_rt_verified dan proteksi mutasinya
-- 2. Proteksi is_active: akun nonaktif ditolak mutasi/baca tiket & RPC
-- 3. Foto bukti penyelesaian hanya boleh diunggah Ketua RW saat diproses_rw
-- 4. Penguatan trigger handle_new_user_app_metadata agar tidak menimpa role service_role
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tambah kolom is_rt_verified pada profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_rt_verified boolean NOT NULL DEFAULT false;

-- -----------------------------------------------------------------------------
-- 2. Helper function: cek apakah pemanggil berstatus aktif
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._is_caller_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_active FROM public.profiles WHERE id = (SELECT auth.uid())), false);
$$;

-- -----------------------------------------------------------------------------
-- 3. Proteksi update profil: warga tidak bisa ubah region_id & is_rt_verified
-- -----------------------------------------------------------------------------
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
    IF v_role NOT IN ('ketua_rt', 'admin') THEN
      RAISE EXCEPTION 'Warga tidak dapat mengubah status verifikasi RT sendiri';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. RPC verify_resident: hanya RT sewilayah atau Admin yang bisa verifikasi
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_resident(p_user_id uuid, p_is_verified boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller_role      text;
  v_caller_region_id bigint;
  v_target_region_id bigint;
  v_caller_active    boolean;
BEGIN
  SELECT COALESCE(auth.jwt()->'app_metadata'->>'sipandu_role', ''), p.region_id, p.is_active
    INTO v_caller_role, v_caller_region_id, v_caller_active
    FROM public.profiles p
   WHERE p.id = auth.uid();

  IF v_caller_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Akun Anda dinonaktifkan';
  END IF;

  IF v_caller_role NOT IN ('ketua_rt', 'admin') THEN
    RAISE EXCEPTION 'Hanya Ketua RT atau Admin yang bisa memverifikasi warga';
  END IF;

  SELECT region_id INTO v_target_region_id
    FROM public.profiles
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Warga tidak ditemukan';
  END IF;

  IF v_caller_role = 'ketua_rt' AND (v_caller_region_id IS NULL OR v_caller_region_id <> v_target_region_id) THEN
    RAISE EXCEPTION 'Ketua RT hanya bisa memverifikasi warga di wilayah RT yang sama';
  END IF;

  UPDATE public.profiles
     SET is_rt_verified = p_is_verified,
         updated_at = now()
   WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_resident(uuid, boolean) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Helper _get_actor_info: tolak jika is_active false
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._get_actor_info(out actor_name text, out actor_role text, out actor_region_id bigint)
RETURNS record
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_is_active boolean;
BEGIN
  SELECT p.full_name, COALESCE(auth.jwt()->'app_metadata'->>'sipandu_role', 'warga'), p.region_id, p.is_active
    INTO actor_name, actor_role, actor_region_id, v_is_active
    FROM public.profiles p
   WHERE p.id = auth.uid();

  IF v_is_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Akun Anda dinonaktifkan';
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. Trigger handle_new_user_app_metadata: jangan timpa role jika sudah ada
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.raw_app_meta_data IS NULL 
     OR (NEW.raw_app_meta_data->>'sipandu_role') IS NULL 
     OR TRIM(NEW.raw_app_meta_data->>'sipandu_role') = '' THEN
    NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('sipandu_role', 'warga');
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. Policy tickets: wajib caller is_active = true
-- -----------------------------------------------------------------------------
ALTER POLICY "tickets_warga_select" ON public.tickets
  USING (
    public._is_caller_active()
    AND
    CASE (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role'))
      WHEN 'warga' THEN (SELECT auth.uid()) = user_id
      WHEN 'ketua_rt' THEN
        status <> 'draft'
        AND region_id = (
          SELECT region_id FROM public.profiles
          WHERE id = (SELECT auth.uid())
        )
      WHEN 'ketua_rw' THEN status <> 'draft'
      WHEN 'admin'    THEN true
      ELSE false
    END
  );

ALTER POLICY "tickets_warga_insert" ON public.tickets
  WITH CHECK (
    public._is_caller_active()
    AND (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'warga'
    AND (SELECT auth.uid()) = user_id
    AND status = 'draft'
  );

ALTER POLICY "tickets_warga_update_draft" ON public.tickets
  USING (
    public._is_caller_active()
    AND (SELECT auth.uid()) = user_id
    AND status = 'draft'
  )
  WITH CHECK (
    public._is_caller_active()
    AND (SELECT auth.uid()) = user_id
    AND status = 'draft'
  );

ALTER POLICY "tickets_warga_delete_draft" ON public.tickets
  USING (
    public._is_caller_active()
    AND (SELECT auth.uid()) = user_id
    AND status = 'draft'
  );

-- -----------------------------------------------------------------------------
-- 8. Policy ticket_attachments: wajib caller is_active = true & foto penyelesaian
--    HANYA Ketua RW saat diproses_rw (Admin tidak boleh)
-- -----------------------------------------------------------------------------
ALTER POLICY "attachments_select" ON public.ticket_attachments
  USING (
    public._is_caller_active()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
      AND CASE (SELECT ((auth.jwt() -> 'app_metadata'::text) ->> 'sipandu_role'::text))
            WHEN 'warga'::text THEN ((SELECT auth.uid()) = t.user_id)
            WHEN 'ketua_rt'::text THEN ((t.status <> 'draft'::ticket_status) AND (t.region_id = (SELECT profiles.region_id FROM public.profiles WHERE (profiles.id = (SELECT auth.uid())))))
            WHEN 'ketua_rw'::text THEN (t.status <> 'draft'::ticket_status)
            WHEN 'admin'::text THEN true
            ELSE false
          END
    )
  );

ALTER POLICY "attachments_insert_laporan" ON public.ticket_attachments
  WITH CHECK (
    public._is_caller_active()
    AND type = 'laporan'
    AND (SELECT auth.uid()) = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND t.user_id = (SELECT auth.uid())
        AND t.status IN ('draft', 'terkirim')
    )
    AND public._count_laporan_attachments(ticket_attachments.ticket_id) < 3
  );

ALTER POLICY "attachments_insert_penyelesaian" ON public.ticket_attachments
  WITH CHECK (
    public._is_caller_active()
    AND type = 'penyelesaian'
    AND (SELECT auth.uid()) = uploaded_by
    AND (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'ketua_rw'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND t.status = 'diproses_rw'
    )
  );

ALTER POLICY "attachments_delete" ON public.ticket_attachments
  USING (
    public._is_caller_active()
    AND (SELECT auth.uid()) = uploaded_by
    AND type = 'laporan'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id AND t.user_id = (SELECT auth.uid()) AND t.status = 'draft'
    )
  );

-- -----------------------------------------------------------------------------
-- 9. Policy ticket_timeline: wajib caller is_active = true
-- -----------------------------------------------------------------------------
ALTER POLICY "timeline_select" ON public.ticket_timeline
  USING (
    public._is_caller_active()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_timeline.ticket_id
      AND CASE (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role'))
            WHEN 'warga'    THEN (SELECT auth.uid()) = t.user_id
            WHEN 'ketua_rt' THEN t.status <> 'draft' AND t.region_id = (SELECT region_id FROM public.profiles WHERE id = (SELECT auth.uid()))
            WHEN 'ketua_rw' THEN t.status <> 'draft'
            WHEN 'admin'    THEN true
            ELSE false
          END
    )
  );

-- -----------------------------------------------------------------------------
-- 10. Storage policies: wajib caller is_active = true & foto penyelesaian HANYA Ketua RW
-- -----------------------------------------------------------------------------
ALTER POLICY "storage_upload_laporan" ON storage.objects
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND (storage.foldername(name))[1] = 'laporan'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(objects.name))[2]
        AND t.user_id = auth.uid()
        AND t.status IN ('draft', 'terkirim')
    )
  );

ALTER POLICY "storage_upload_penyelesaian" ON storage.objects
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND (storage.foldername(name))[1] = 'penyelesaian'
    AND (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'ketua_rw'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(objects.name))[2]
        AND t.status = 'diproses_rw'
    )
  );

ALTER POLICY "storage_read" ON storage.objects
  USING (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(objects.name))[2]
      AND CASE (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role'))
            WHEN 'warga'    THEN auth.uid() = t.user_id
            WHEN 'ketua_rt' THEN t.status <> 'draft' AND t.region_id = (SELECT region_id FROM public.profiles WHERE id = auth.uid())
            WHEN 'ketua_rw' THEN t.status <> 'draft'
            WHEN 'admin'    THEN true
            ELSE false
          end
    )
  );

ALTER POLICY "storage_delete" ON storage.objects
  USING (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND (storage.foldername(name))[1] = 'laporan'
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(objects.name))[2]
        AND t.user_id = auth.uid()
        AND t.status = 'draft'
    )
  );
