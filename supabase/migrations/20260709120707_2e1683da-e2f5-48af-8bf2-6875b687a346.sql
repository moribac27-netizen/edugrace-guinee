
-- Helper: is_finance = admin, directeur ou comptable
CREATE OR REPLACE FUNCTION public.is_finance(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','directeur','comptable'))
$$;

-- ============ FINANCIAL_ACCOUNTS ============
DROP POLICY IF EXISTS "authenticated read accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "staff manages accounts" ON public.financial_accounts;
CREATE POLICY "finance read accounts" ON public.financial_accounts FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance manages accounts" ON public.financial_accounts FOR ALL TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));

-- ============ REVENUES ============
DROP POLICY IF EXISTS "authenticated read revenues" ON public.revenues;
DROP POLICY IF EXISTS "staff manages revenues" ON public.revenues;
CREATE POLICY "finance read revenues" ON public.revenues FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance manages revenues" ON public.revenues FOR ALL TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));

-- ============ EXPENSES ============
DROP POLICY IF EXISTS "authenticated read expenses" ON public.expenses;
DROP POLICY IF EXISTS "staff manages expenses" ON public.expenses;
CREATE POLICY "finance read expenses" ON public.expenses FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance manages expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));

-- ============ EMPLOYEE_CONTRACTS ============
DROP POLICY IF EXISTS "authenticated read contracts" ON public.employee_contracts;
DROP POLICY IF EXISTS "staff manages contracts" ON public.employee_contracts;
CREATE POLICY "finance read contracts" ON public.employee_contracts FOR SELECT TO authenticated
  USING (public.is_finance(auth.uid()) OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = employee_contracts.teacher_id AND t.user_id = auth.uid()));
CREATE POLICY "finance manages contracts" ON public.employee_contracts FOR ALL TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));

-- ============ EMPLOYEE_LEAVES ============
DROP POLICY IF EXISTS "authenticated read leaves" ON public.employee_leaves;
DROP POLICY IF EXISTS "staff manages leaves" ON public.employee_leaves;
CREATE POLICY "finance read leaves" ON public.employee_leaves FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance manages leaves" ON public.employee_leaves FOR ALL TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));

-- ============ PAYSLIPS ============
DROP POLICY IF EXISTS "authenticated read payslips" ON public.payslips;
DROP POLICY IF EXISTS "staff manages payslips" ON public.payslips;
CREATE POLICY "finance read payslips" ON public.payslips FOR SELECT TO authenticated USING (public.is_finance(auth.uid()));
CREATE POLICY "finance manages payslips" ON public.payslips FOR ALL TO authenticated USING (public.is_finance(auth.uid())) WITH CHECK (public.is_finance(auth.uid()));

-- ============ TEACHERS ============
DROP POLICY IF EXISTS "Teachers lecture" ON public.teachers;
CREATE POLICY "Teachers lecture restreinte" ON public.teachers FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR user_id = auth.uid());

-- ============ STUDENT_ATTENDANCE ============
DROP POLICY IF EXISTS "auth read student att" ON public.student_attendance;
CREATE POLICY "read student att restreint" ON public.student_attendance FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR public.has_role(auth.uid(), 'enseignant')
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_attendance.student_id AND s.parent_user_id = auth.uid())
  );

-- ============ TEACHER_ATTENDANCE ============
DROP POLICY IF EXISTS "auth read teacher att" ON public.teacher_attendance;
CREATE POLICY "read teacher att restreint" ON public.teacher_attendance FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = teacher_attendance.teacher_id AND t.user_id = auth.uid())
  );

-- ============ LIBRARY_LOANS ============
DROP POLICY IF EXISTS "authenticated read loans" ON public.library_loans;
CREATE POLICY "read loans restreint" ON public.library_loans FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = library_loans.student_id AND s.parent_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = library_loans.teacher_id AND t.user_id = auth.uid())
  );

-- ============ PROFILES ============
DROP POLICY IF EXISTS "Profils visibles par tous les authentifiés" ON public.profiles;
CREATE POLICY "Profil visible par soi ou staff" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
