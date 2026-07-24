-- 1) Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  entity_type text,
  entity_id uuid,
  link text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id) WHERE read_at IS NULL;

-- 2) Grants
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 3) RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_notifications_select" ON public.notifications;
CREATE POLICY "own_notifications_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_notifications_update" ON public.notifications;
CREATE POLICY "own_notifications_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own_notifications_delete" ON public.notifications;
CREATE POLICY "own_notifications_delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4) Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;

-- 5) Helper: recipients for a given student (parents + student user)
CREATE OR REPLACE FUNCTION public.student_recipient_users(_student_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT u FROM (
    SELECT sp.parent_user_id AS u
      FROM public.student_parents sp WHERE sp.student_id = _student_id AND sp.parent_user_id IS NOT NULL
    UNION
    SELECT s.parent_user_id FROM public.students s WHERE s.id = _student_id AND s.parent_user_id IS NOT NULL
    UNION
    SELECT s.student_user_id FROM public.students s WHERE s.id = _student_id AND s.student_user_id IS NOT NULL
  ) x WHERE u IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.student_recipient_users(uuid) FROM PUBLIC, authenticated;

-- 6) Trigger: paiement validé
CREATE OR REPLACE FUNCTION public.notify_payment_validated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _label text; _student_name text;
BEGIN
  IF NEW.validation_status <> 'validé' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.validation_status = 'validé' THEN RETURN NEW; END IF;
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;

  SELECT full_name INTO _student_name FROM public.students WHERE id = NEW.student_id;
  _label := 'Paiement validé' || COALESCE(' — ' || _student_name, '');

  INSERT INTO public.notifications (user_id, school_id, type, title, body, entity_type, entity_id, link)
  SELECT r.user_id, NEW.school_id, 'payment_validated', _label,
         COALESCE(NEW.receipt_number, '') || ' · ' || NEW.amount::text || ' GNF',
         'payment', NEW.id, '/paiements'
  FROM public.student_recipient_users(NEW.student_id) r;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_payment_validated ON public.payments;
CREATE TRIGGER trg_notify_payment_validated
AFTER INSERT OR UPDATE OF validation_status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_validated();

-- 7) Trigger: nouvelle note
CREATE OR REPLACE FUNCTION public.notify_grade_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _subject text; _student_name text;
BEGIN
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;
  SELECT name INTO _subject FROM public.subjects WHERE id = NEW.subject_id;
  SELECT full_name INTO _student_name FROM public.students WHERE id = NEW.student_id;

  INSERT INTO public.notifications (user_id, school_id, type, title, body, entity_type, entity_id, link)
  SELECT r.user_id, NEW.school_id, 'grade_created',
         'Nouvelle note' || COALESCE(' — ' || _student_name, ''),
         COALESCE(_subject, 'Matière') || ' : ' || NEW.score::text,
         'grade', NEW.id, '/notes'
  FROM public.student_recipient_users(NEW.student_id) r;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_grade_created ON public.grades;
CREATE TRIGGER trg_notify_grade_created
AFTER INSERT ON public.grades
FOR EACH ROW EXECUTE FUNCTION public.notify_grade_created();

-- 8) Trigger: absence / retard
CREATE OR REPLACE FUNCTION public.notify_attendance_issue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _student_name text; _label text;
BEGIN
  IF NEW.status NOT IN ('absent','retard') THEN RETURN NEW; END IF;
  IF NEW.student_id IS NULL THEN RETURN NEW; END IF;
  SELECT full_name INTO _student_name FROM public.students WHERE id = NEW.student_id;
  _label := CASE WHEN NEW.status = 'absent' THEN 'Absence' ELSE 'Retard' END
            || COALESCE(' — ' || _student_name, '');

  INSERT INTO public.notifications (user_id, school_id, type, title, body, entity_type, entity_id, link)
  SELECT r.user_id, NEW.school_id, 'attendance_' || NEW.status, _label,
         'Le ' || to_char(NEW.date, 'DD/MM/YYYY'),
         'attendance', NEW.id, '/presences'
  FROM public.student_recipient_users(NEW.student_id) r;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_attendance_issue ON public.student_attendance;
CREATE TRIGGER trg_notify_attendance_issue
AFTER INSERT ON public.student_attendance
FOR EACH ROW EXECUTE FUNCTION public.notify_attendance_issue();

-- 9) Trigger: nouveau message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _sender_name text;
BEGIN
  IF NEW.recipient_id IS NULL THEN RETURN NEW; END IF;
  SELECT full_name INTO _sender_name FROM public.profiles WHERE id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, body, entity_type, entity_id, link)
  VALUES (NEW.recipient_id, 'message_received',
          'Nouveau message' || COALESCE(' — ' || _sender_name, ''),
          COALESCE(NEW.subject, ''), 'message', NEW.id, '/messagerie');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();