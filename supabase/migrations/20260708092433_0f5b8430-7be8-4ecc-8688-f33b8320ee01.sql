
-- ============ COMPTABILITÉ ============
CREATE TYPE public.account_type AS ENUM ('caisse','banque','mobile_money','orange_money','autre');
CREATE TYPE public.revenue_type AS ENUM ('inscription','reinscription','scolarite','transport','cantine','uniforme','examens','autres');
CREATE TYPE public.expense_type AS ENUM ('salaires','fournitures','eau','electricite','internet','entretien','carburant','autres');
CREATE TYPE public.payment_method AS ENUM ('especes','cheque','virement','mobile_money','orange_money','autre');

CREATE TABLE public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type account_type NOT NULL,
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GNF',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT ALL ON public.financial_accounts TO service_role;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages accounts" ON public.financial_accounts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read accounts" ON public.financial_accounts FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_fa_updated BEFORE UPDATE ON public.financial_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  type revenue_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL DEFAULT 'especes',
  reference TEXT,
  description TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenues TO authenticated;
GRANT ALL ON public.revenues TO service_role;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages revenues" ON public.revenues FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read revenues" ON public.revenues FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_rev_updated BEFORE UPDATE ON public.revenues FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX ON public.revenues (account_id, occurred_at);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
  type expense_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL DEFAULT 'especes',
  reference TEXT,
  description TEXT,
  beneficiary TEXT,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages expenses" ON public.expenses FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_exp_updated BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX ON public.expenses (account_id, occurred_at);

-- ============ SALAIRES ============
CREATE TYPE public.contract_status AS ENUM ('actif','suspendu','termine');
CREATE TYPE public.leave_type AS ENUM ('annuel','maladie','maternite','sans_solde','autre');
CREATE TYPE public.leave_status AS ENUM ('en_attente','approuve','refuse');

CREATE TABLE public.employee_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status contract_status NOT NULL DEFAULT 'actif',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_contracts TO authenticated;
GRANT ALL ON public.employee_contracts TO service_role;
ALTER TABLE public.employee_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages contracts" ON public.employee_contracts FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read contracts" ON public.employee_contracts FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_ec_updated BEFORE UPDATE ON public.employee_contracts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.employee_contracts(id) ON DELETE CASCADE,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INT NOT NULL,
  base_salary NUMERIC(14,2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(14,2) NOT NULL DEFAULT 0,
  overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  overtime_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  advances NUMERIC(14,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_pay NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contract_id, period_year, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payslips TO authenticated;
GRANT ALL ON public.payslips TO service_role;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages payslips" ON public.payslips FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read payslips" ON public.payslips FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_ps_updated BEFORE UPDATE ON public.payslips FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.employee_leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.employee_contracts(id) ON DELETE CASCADE,
  type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'en_attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_leaves TO authenticated;
GRANT ALL ON public.employee_leaves TO service_role;
ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages leaves" ON public.employee_leaves FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read leaves" ON public.employee_leaves FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_el_updated BEFORE UPDATE ON public.employee_leaves FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ EXAMENS ============
CREATE TYPE public.exam_type AS ENUM ('composition','devoir','controle','examen');

CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type exam_type NOT NULL DEFAULT 'devoir',
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TIME,
  duration_minutes INT NOT NULL DEFAULT 60,
  coefficient NUMERIC(4,2) NOT NULL DEFAULT 1,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages exams" ON public.exams FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read exams" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_exm_updated BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ BIBLIOTHÈQUE ============
CREATE TABLE public.library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_categories TO authenticated;
GRANT ALL ON public.library_categories TO service_role;
ALTER TABLE public.library_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read categories" ON public.library_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manages categories" ON public.library_categories FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  isbn TEXT,
  category_id UUID REFERENCES public.library_categories(id) ON DELETE SET NULL,
  total_copies INT NOT NULL DEFAULT 1 CHECK (total_copies >= 0),
  available_copies INT NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_books TO authenticated;
GRANT ALL ON public.library_books TO service_role;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read books" ON public.library_books FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manages books" ON public.library_books FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_lb_updated BEFORE UPDATE ON public.library_books FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.library_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  borrower_name TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  return_date DATE,
  penalty NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_loans TO authenticated;
GRANT ALL ON public.library_loans TO service_role;
ALTER TABLE public.library_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manages loans" ON public.library_loans FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "authenticated read loans" ON public.library_loans FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_ll_updated BEFORE UPDATE ON public.library_loans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
