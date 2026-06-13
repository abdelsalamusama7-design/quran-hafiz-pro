CREATE TABLE public.parent_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id uuid NOT NULL,
  family_id uuid NOT NULL,
  child_user_id uuid NOT NULL,
  child_name text NOT NULL DEFAULT '',
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_notifications TO authenticated;
GRANT ALL ON public.parent_notifications TO service_role;

ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent can view own notifications"
ON public.parent_notifications FOR SELECT TO authenticated
USING (parent_user_id = auth.uid());

CREATE POLICY "Family child can create notifications"
ON public.parent_notifications FOR INSERT TO authenticated
WITH CHECK (
  child_user_id = auth.uid()
  AND (is_family_member(family_id, auth.uid()) OR is_family_parent(family_id, auth.uid()))
);

CREATE POLICY "Parent can update own notifications"
ON public.parent_notifications FOR UPDATE TO authenticated
USING (parent_user_id = auth.uid());

CREATE POLICY "Parent can delete own notifications"
ON public.parent_notifications FOR DELETE TO authenticated
USING (parent_user_id = auth.uid());

CREATE INDEX idx_parent_notifications_parent ON public.parent_notifications(parent_user_id, created_at DESC);
CREATE INDEX idx_parent_notifications_unread ON public.parent_notifications(parent_user_id) WHERE read = false;