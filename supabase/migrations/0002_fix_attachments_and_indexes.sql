-- =============================================================================
-- Migration: 0002_fix_attachments_and_indexes.sql
-- 1. Helper function for counting attachments without RLS recursion
-- 2. Foreign key indexes recommended by linter
-- =============================================================================

CREATE OR REPLACE FUNCTION public._count_laporan_attachments(p_ticket_id bigint)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*) FROM public.ticket_attachments WHERE ticket_id = p_ticket_id AND type = 'laporan';
$$;

ALTER POLICY "attachments_insert_laporan" ON public.ticket_attachments
  WITH CHECK (
    type = 'laporan'
    AND (SELECT auth.uid()) = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND t.user_id = (SELECT auth.uid())
        AND t.status IN ('draft', 'terkirim')
    )
    AND public._count_laporan_attachments(ticket_attachments.ticket_id) < 3
  );

CREATE INDEX IF NOT EXISTS notifications_ticket_id_idx ON public.notifications(ticket_id);
CREATE INDEX IF NOT EXISTS profiles_region_id_idx ON public.profiles(region_id);
CREATE INDEX IF NOT EXISTS ticket_attachments_uploaded_by_idx ON public.ticket_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS ticket_timeline_actor_id_idx ON public.ticket_timeline(actor_id);
CREATE INDEX IF NOT EXISTS tickets_category_id_idx ON public.tickets(category_id);
CREATE INDEX IF NOT EXISTS tickets_handler_rt_id_idx ON public.tickets(handler_rt_id);
CREATE INDEX IF NOT EXISTS tickets_handler_rw_id_idx ON public.tickets(handler_rw_id);
