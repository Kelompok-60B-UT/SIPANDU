-- =============================================================================
-- SIPANDU (Sistem Informasi Layanan Publik dan Pengaduan Warga RW 06)
-- Migration: 20261109000002_storage_and_privilege_hardening.sql
-- 1. Master Data Invariant: Ensure RT 09 is present in public.regions
-- 2. Storage Security: Explicit idempotent definition for avatars bucket policies
-- 3. Schema Security: Revoke CREATE on schema public (Anti-Hijacking)
-- 4. Table-Level Least Privilege Access Control (PoLP)
-- 5. Sequence Privileges
-- 6. Routine Privileges & Legacy Cleanup
-- 7. Hardened RLS Helper: Scoped _count_laporan_attachments (Anti-Enumeration)
-- 8. SECURITY DEFINER Search Path Protection (Append pg_temp defensively)
-- 9. PostgreSQL Default Privileges Hardening (Global & Per-Schema for postgres)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Master Data Completion (RT 09 RW 06)
-- -----------------------------------------------------------------------------
INSERT INTO public.regions (name, rw)
VALUES ('RT 09', '06')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Storage Policies for Avatars Bucket (Explicit Idempotent Definition)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2.1 Public read access for profile avatars
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 2.2 Authenticated user can upload only to their own folder (folder name matches auth.uid)
DROP POLICY IF EXISTS "avatars_user_insert" ON storage.objects;
CREATE POLICY "avatars_user_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2.3 Authenticated user can update only files in their own folder (handles upsert: true)
DROP POLICY IF EXISTS "avatars_user_update" ON storage.objects;
CREATE POLICY "avatars_user_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2.4 Authenticated user can delete only files in their own folder
DROP POLICY IF EXISTS "avatars_user_delete" ON storage.objects;
CREATE POLICY "avatars_user_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 3. Schema Security & Anti-Hijacking
-- -----------------------------------------------------------------------------
-- Prevent untrusted users from creating objects or shadowing names in schema public
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 4. Table Privileges (Strict Principle of Least Privilege)
-- -----------------------------------------------------------------------------
-- Superuser & service_role retain administrative access
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;

-- Revoke all table privileges from client roles to ensure clean baseline
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Anon role receives SELECT ONLY on public catalogue tables (regions & categories)
GRANT SELECT ON TABLE public.regions, public.categories TO anon;

-- Authenticated roles receive strictly per-table required privileges (governed by RLS)
-- 4.1 regions: SELECT for all; INSERT, UPDATE, DELETE for Admin
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.regions TO authenticated;

-- 4.2 categories: SELECT for all; INSERT, UPDATE, DELETE for Admin
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categories TO authenticated;

-- 4.3 tickets: SELECT, INSERT, UPDATE (draft/flow), DELETE (Admin only)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tickets TO authenticated;

-- 4.4 ticket_attachments: SELECT, INSERT (laporan/penyelesaian), DELETE (draft/Admin). NO UPDATE (immutable)
GRANT SELECT, INSERT, DELETE ON TABLE public.ticket_attachments TO authenticated;

-- 4.5 profiles: SELECT (own/staff), UPDATE (own profile). NO INSERT (auto-created by auth trigger), NO DELETE (cascade/service_role only)
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;

-- 4.6 ticket_timeline: SELECT ONLY (read-only audit trail). NO INSERT/UPDATE/DELETE (system/trigger/service_role only)
GRANT SELECT ON TABLE public.ticket_timeline TO authenticated;

-- 4.7 notifications: SELECT (own), UPDATE (mark as read). NO INSERT (system trigger only), NO DELETE
GRANT SELECT, UPDATE ON TABLE public.notifications TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Sequence Privileges
-- -----------------------------------------------------------------------------
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;

-- -----------------------------------------------------------------------------
-- 6. Routine Privileges & Legacy Cleanup
-- -----------------------------------------------------------------------------
-- Clean up legacy overloads if lingering
DROP FUNCTION IF EXISTS public.verify_resident(uuid, bigint);

-- Revoke all routines from PUBLIC and anon by default
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Public aggregate RPC for landing page (safe aggregate)
GRANT EXECUTE ON FUNCTION public.public_stats() TO anon, authenticated, service_role;

-- Authenticated Action & Helper RPCs
GRANT EXECUTE ON FUNCTION public.submit_ticket(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_ticket(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_ticket(bigint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_ticket(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_ticket(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rate_ticket(bigint, smallint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_resident(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._count_laporan_attachments(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._is_caller_active() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._is_caller_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._get_caller_role() TO authenticated;

-- Ensure internal triggers and helpers cannot be invoked directly by client roles
REVOKE EXECUTE ON FUNCTION public._get_actor_info() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._notify_users(bigint, text, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_ticket_number(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_app_metadata() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_profile_guards() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_last_admin() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. Hardened RLS Helper: Scoped _count_laporan_attachments (Anti-Enumeration)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._count_laporan_attachments(p_ticket_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)
  FROM public.ticket_attachments ta
  WHERE ta.ticket_id = p_ticket_id
    AND ta.type = 'laporan'
    AND public._is_caller_active()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND t.user_id = (SELECT auth.uid())
    );
$$;

-- -----------------------------------------------------------------------------
-- 8. SECURITY DEFINER Search Path Protection (Defense-in-Depth)
-- -----------------------------------------------------------------------------
-- Ensure public functions explicitly place pg_temp at the end to prevent temporary table shadowing
ALTER FUNCTION public._count_laporan_attachments(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public._is_caller_active() SET search_path = public, pg_temp;
ALTER FUNCTION public.public_stats() SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_ticket(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.verify_ticket(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.reject_ticket(bigint, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.process_ticket(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.complete_ticket(bigint) SET search_path = public, pg_temp;
ALTER FUNCTION public.rate_ticket(bigint, smallint, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.verify_resident(uuid, boolean) SET search_path = pg_catalog, pg_temp;
ALTER FUNCTION public._get_actor_info() SET search_path = public, pg_temp;
ALTER FUNCTION public._notify_users(bigint, text, uuid[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_ticket_number(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_app_metadata() SET search_path = public, pg_temp;
ALTER FUNCTION public.check_profile_update() SET search_path = public, pg_temp;

-- -----------------------------------------------------------------------------
-- 9. PostgreSQL Default Privileges Hardening (Global & Per-Schema for postgres)
-- -----------------------------------------------------------------------------
-- In PostgreSQL, per-schema REVOKE on default privileges does NOT override global defaults.
-- Therefore, EXECUTE on routines must be revoked at the GLOBAL level first for role postgres.

-- 9.1 Global Default Privileges for role postgres
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON ROUTINES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres GRANT EXECUTE ON ROUTINES TO postgres, service_role;

-- 9.2 Per-Schema Default Privileges for role postgres in schema public
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON ROUTINES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT EXECUTE ON ROUTINES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon;
