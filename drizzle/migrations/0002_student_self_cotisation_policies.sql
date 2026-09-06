DROP POLICY IF EXISTS spp_select ON public.student_plan_payments;
CREATE POLICY spp_select ON public.student_plan_payments
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.same_school(school_id)
    OR public.is_parent_of_student(auth.uid(), student_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.student_user_id = auth.uid())
  );

DROP POLICY IF EXISTS spp_write ON public.student_plan_payments;
CREATE POLICY spp_write ON public.student_plan_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.same_school(school_id) AND (public.is_direction(auth.uid()) OR public.is_finance(auth.uid())))
    OR public.is_parent_of_student(auth.uid(), student_id)
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.student_user_id = auth.uid())
  );