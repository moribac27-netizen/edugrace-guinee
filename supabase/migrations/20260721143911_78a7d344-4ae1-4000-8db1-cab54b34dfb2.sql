
ALTER TABLE public.teacher_class_assignments
  ADD COLUMN IF NOT EXISTS academic_year text NOT NULL DEFAULT '2025-2026';

CREATE UNIQUE INDEX IF NOT EXISTS tca_unique_assignment
  ON public.teacher_class_assignments (teacher_id, class_id, COALESCE(subject_id, '00000000-0000-0000-0000-000000000000'::uuid), academic_year);
