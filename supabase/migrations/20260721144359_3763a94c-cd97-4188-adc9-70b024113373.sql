
-- Remplace l'ancien index par un index unique complet incluant school_id
DROP INDEX IF EXISTS public.tca_unique_assignment;

CREATE UNIQUE INDEX tca_unique_assignment
  ON public.teacher_class_assignments (
    school_id,
    teacher_id,
    class_id,
    COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    academic_year
  );

-- Index de recherche
CREATE INDEX IF NOT EXISTS tca_school_year_idx
  ON public.teacher_class_assignments (school_id, academic_year);
CREATE INDEX IF NOT EXISTS tca_teacher_idx
  ON public.teacher_class_assignments (teacher_id);
CREATE INDEX IF NOT EXISTS tca_class_idx
  ON public.teacher_class_assignments (class_id);
CREATE INDEX IF NOT EXISTS tca_subject_idx
  ON public.teacher_class_assignments (subject_id);
