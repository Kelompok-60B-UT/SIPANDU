-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 0005_admin_rls_and_delete.sql
-- 1. Izinkan Admin & Ketua RW mengunggah foto bukti penyelesaian pada ticket_attachments & storage.objects
-- 2. Izinkan Admin & Ketua RW menghapus foto bukti penyelesaian
-- 3. Izinkan Admin menghapus tiket (tickets_admin_delete)
-- =============================================================================

-- 1. Perbarui policy attachments_insert_penyelesaian agar Admin juga diizinkan
ALTER POLICY "attachments_insert_penyelesaian" ON public.ticket_attachments
  WITH CHECK (
    public._is_caller_active()
    AND type = 'penyelesaian'
    AND (SELECT auth.uid()) = uploaded_by
    AND (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) IN ('ketua_rw', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND t.status <> 'draft'
    )
  );

-- 2. Perbarui policy attachments_delete agar Admin & Ketua RW dapat menghapus lampiran penyelesaian
ALTER POLICY "attachments_delete" ON public.ticket_attachments
  USING (
    public._is_caller_active()
    AND (
      (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'admin'
      OR (
        (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'ketua_rw'
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

-- 3. Perbarui policy storage_upload_penyelesaian agar Admin juga diizinkan
ALTER POLICY "storage_upload_penyelesaian" ON storage.objects
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND (storage.foldername(name))[1] = 'penyelesaian'
    AND (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) IN ('ketua_rw', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(objects.name))[2]
        AND t.status <> 'draft'
    )
  );

-- 4. Perbarui policy storage_delete agar Admin & Ketua RW dapat menghapus file bukti penyelesaian
ALTER POLICY "storage_delete" ON storage.objects
  USING (
    bucket_id = 'ticket-attachments'
    AND public._is_caller_active()
    AND (
      (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'admin'
      OR (
        (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'ketua_rw'
        AND (storage.foldername(name))[1] = 'penyelesaian'
      )
      OR (
        (storage.foldername(name))[1] = 'laporan'
        AND EXISTS (
          SELECT 1 FROM public.tickets t
          WHERE t.id::text = (storage.foldername(objects.name))[2]
            AND t.user_id = auth.uid()
            AND t.status = 'draft'
        )
      )
    )
  );

-- 5. Tambah policy tickets_admin_delete agar Admin dapat menghapus tiket
DROP POLICY IF EXISTS "tickets_admin_delete" ON public.tickets;
CREATE POLICY "tickets_admin_delete" ON public.tickets
  FOR DELETE TO authenticated
  USING (
    public._is_caller_active()
    AND (SELECT (auth.jwt()->'app_metadata'->>'sipandu_role')) = 'admin'
  );
