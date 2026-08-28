-- ============ MODULE MATERNELLE (additif) ============

CREATE TABLE public.nursery_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  age_range text,
  capacity integer,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursery_sections TO authenticated;
GRANT ALL ON public.nursery_sections TO service_role;
ALTER TABLE public.nursery_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nursery_sections_read" ON public.nursery_sections FOR SELECT TO authenticated USING (public.same_school(school_id));
CREATE POLICY "nursery_sections_write" ON public.nursery_sections FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')))
  WITH CHECK (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')));
CREATE TRIGGER t_nursery_sections_u BEFORE UPDATE ON public.nursery_sections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nursery_children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.nursery_sections(id) ON DELETE SET NULL,
  pickup_person text,
  pickup_phone text,
  allergies text,
  medical_notes text,
  nap_needed boolean NOT NULL DEFAULT true,
  toilet_trained boolean NOT NULL DEFAULT false,
  special_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursery_children TO authenticated;
GRANT ALL ON public.nursery_children TO service_role;
ALTER TABLE public.nursery_children ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nursery_children_staff_read" ON public.nursery_children FOR SELECT TO authenticated USING (public.same_school(school_id));
CREATE POLICY "nursery_children_parent_read" ON public.nursery_children FOR SELECT TO authenticated USING (public.is_parent_of_student(auth.uid(), student_id));
CREATE POLICY "nursery_children_write" ON public.nursery_children FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')))
  WITH CHECK (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')));
CREATE TRIGGER t_nursery_children_u BEFORE UPDATE ON public.nursery_children FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nursery_daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  section_id uuid REFERENCES public.nursery_sections(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  mood text,
  meal text,
  nap text,
  toilet text,
  activities text,
  incidents text,
  parent_comment text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursery_daily_logs TO authenticated;
GRANT ALL ON public.nursery_daily_logs TO service_role;
ALTER TABLE public.nursery_daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nursery_logs_staff_read" ON public.nursery_daily_logs FOR SELECT TO authenticated USING (public.same_school(school_id));
CREATE POLICY "nursery_logs_family_read" ON public.nursery_daily_logs FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id)
      OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.student_user_id = auth.uid()));
CREATE POLICY "nursery_logs_write" ON public.nursery_daily_logs FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')))
  WITH CHECK (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')));
CREATE TRIGGER t_nursery_daily_logs_u BEFORE UPDATE ON public.nursery_daily_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nursery_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  domain text NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursery_competencies TO authenticated;
GRANT ALL ON public.nursery_competencies TO service_role;
ALTER TABLE public.nursery_competencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nursery_comp_read" ON public.nursery_competencies FOR SELECT TO authenticated USING (public.same_school(school_id));
CREATE POLICY "nursery_comp_write" ON public.nursery_competencies FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')))
  WITH CHECK (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')));
CREATE TRIGGER t_nursery_competencies_u BEFORE UPDATE ON public.nursery_competencies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.nursery_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.nursery_competencies(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT 'Trimestre 1',
  level text NOT NULL DEFAULT 'en_cours',
  comment text,
  evaluated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, competency_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nursery_evaluations TO authenticated;
GRANT ALL ON public.nursery_evaluations TO service_role;
ALTER TABLE public.nursery_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nursery_eval_staff_read" ON public.nursery_evaluations FOR SELECT TO authenticated USING (public.same_school(school_id));
CREATE POLICY "nursery_eval_family_read" ON public.nursery_evaluations FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id)
      OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.student_user_id = auth.uid()));
CREATE POLICY "nursery_eval_write" ON public.nursery_evaluations FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')))
  WITH CHECK (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.has_role(auth.uid(),'enseignant')));
CREATE TRIGGER t_nursery_evaluations_u BEFORE UPDATE ON public.nursery_evaluations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_nursery_children_section ON public.nursery_children(section_id);
CREATE INDEX idx_nursery_logs_date ON public.nursery_daily_logs(school_id, date);
CREATE INDEX idx_nursery_eval_student ON public.nursery_evaluations(student_id, period);