
-- Calendar events table
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'event', -- event, exam, holiday, meeting, deadline
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  all_day boolean NOT NULL DEFAULT false,
  location text,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  visible_roles text[] NOT NULL DEFAULT ARRAY['admin','directeur','enseignant','parent','eleve','comptable'],
  color text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Anyone in the same school with a matching role can view
CREATE POLICY "calendar_select_school_role" ON public.calendar_events
FOR SELECT TO authenticated
USING (
  public.same_school(school_id)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role::text = ANY(calendar_events.visible_roles)
  )
);

-- Staff can insert/update/delete
CREATE POLICY "calendar_insert_staff" ON public.calendar_events
FOR INSERT TO authenticated
WITH CHECK (public.same_school(school_id) AND public.is_staff(auth.uid()));

CREATE POLICY "calendar_update_staff" ON public.calendar_events
FOR UPDATE TO authenticated
USING (public.same_school(school_id) AND public.is_staff(auth.uid()))
WITH CHECK (public.same_school(school_id) AND public.is_staff(auth.uid()));

CREATE POLICY "calendar_delete_staff" ON public.calendar_events
FOR DELETE TO authenticated
USING (public.same_school(school_id) AND public.is_staff(auth.uid()));

CREATE TRIGGER calendar_events_touch_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;

-- Notification trigger on new calendar event
CREATE OR REPLACE FUNCTION public.notify_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, school_id, type, title, body, entity_type, entity_id, link)
  SELECT p.id, NEW.school_id, 'calendar_event',
         'Nouvel événement : ' || NEW.title,
         COALESCE(to_char(NEW.starts_at, 'DD/MM/YYYY HH24:MI'), '') ||
           COALESCE(' — ' || NEW.location, ''),
         'calendar', NEW.id, '/calendrier'
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.school_id = NEW.school_id
    AND ur.role::text = ANY(NEW.visible_roles);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_calendar_event
AFTER INSERT ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.notify_calendar_event();

-- Attachments on messages (array of {name,url,size,type})
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;
