
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles','students','teachers','classes','subjects','rooms',
    'schedule_slots','exams','grades','student_attendance','teacher_attendance',
    'announcements','financial_accounts','revenues','expenses','payments',
    'payslips','employee_contracts','employee_leaves',
    'library_books','library_categories','library_loans',
    'teacher_class_assignments'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN school_id SET DEFAULT public.current_school_id()',
      t
    );
  END LOOP;
END $$;
