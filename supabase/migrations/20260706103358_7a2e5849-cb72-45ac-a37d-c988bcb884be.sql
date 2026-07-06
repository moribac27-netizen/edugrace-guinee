
-- Salles
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 30,
  building TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read rooms" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage rooms" ON public.rooms FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER tg_rooms_updated BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Créneaux d'emploi du temps
CREATE TABLE public.schedule_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_slots TO authenticated;
GRANT ALL ON public.schedule_slots TO service_role;
ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read slots" ON public.schedule_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage slots" ON public.schedule_slots FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER tg_slots_updated BEFORE UPDATE ON public.schedule_slots FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_slots_class ON public.schedule_slots(class_id, day_of_week);
CREATE INDEX idx_slots_teacher ON public.schedule_slots(teacher_id, day_of_week);
CREATE INDEX idx_slots_room ON public.schedule_slots(room_id, day_of_week);

-- Présences élèves
CREATE TABLE public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','retard','justifie')),
  minutes_late INTEGER DEFAULT 0,
  justification TEXT,
  justified BOOLEAN NOT NULL DEFAULT false,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attendance TO authenticated;
GRANT ALL ON public.student_attendance TO service_role;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read student att" ON public.student_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage student att" ON public.student_attendance FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'enseignant'))
  WITH CHECK (public.is_staff(auth.uid()) OR public.has_role(auth.uid(),'enseignant'));
CREATE TRIGGER tg_satt_updated BEFORE UPDATE ON public.student_attendance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_satt_date ON public.student_attendance(date);
CREATE INDEX idx_satt_class ON public.student_attendance(class_id, date);

-- Présences enseignants
CREATE TABLE public.teacher_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','retard','justifie')),
  minutes_late INTEGER DEFAULT 0,
  justification TEXT,
  justified BOOLEAN NOT NULL DEFAULT false,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_attendance TO authenticated;
GRANT ALL ON public.teacher_attendance TO service_role;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read teacher att" ON public.teacher_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage teacher att" ON public.teacher_attendance FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER tg_tatt_updated BEFORE UPDATE ON public.teacher_attendance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_tatt_date ON public.teacher_attendance(date);
