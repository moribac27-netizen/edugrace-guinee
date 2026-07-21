
-- Messages 1-1
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL DEFAULT public.current_school_id() REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "msg_participants_read" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "msg_sender_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND school_id = public.current_school_id());

CREATE POLICY "msg_recipient_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "msg_participants_delete" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE INDEX idx_messages_recipient ON public.messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id, created_at DESC);

-- Diffusions
CREATE TABLE public.message_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL DEFAULT public.current_school_id() REFERENCES public.schools(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app', -- in_app, email, sms
  target_role app_role,
  target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_broadcasts TO authenticated;
GRANT ALL ON public.message_broadcasts TO service_role;
ALTER TABLE public.message_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bcast_same_school_read" ON public.message_broadcasts
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR school_id = public.current_school_id());

CREATE POLICY "bcast_staff_manage" ON public.message_broadcasts
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id()))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (public.is_staff(auth.uid()) AND school_id = public.current_school_id() AND author_id = auth.uid()));

CREATE INDEX idx_bcast_school ON public.message_broadcasts(school_id, created_at DESC);
