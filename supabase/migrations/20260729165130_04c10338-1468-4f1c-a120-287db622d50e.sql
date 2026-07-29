-- =========================
-- INFIRMERIE
-- =========================
CREATE TABLE public.medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  blood_type text,
  allergies text,
  chronic_conditions text,
  medications text,
  emergency_contact_name text,
  emergency_contact_phone text,
  doctor_name text,
  doctor_phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_records TO authenticated;
GRANT ALL ON public.medical_records TO service_role;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_records_staff_all" ON public.medical_records FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "medical_records_family_read" ON public.medical_records FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE TABLE public.medical_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL,
  symptoms text,
  diagnosis text,
  outcome text NOT NULL DEFAULT 'retour_en_classe',
  temperature numeric,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_visits TO authenticated;
GRANT ALL ON public.medical_visits TO service_role;
ALTER TABLE public.medical_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_visits_staff_all" ON public.medical_visits FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "medical_visits_family_read" ON public.medical_visits FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE TABLE public.medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  form text,
  quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'unité',
  alert_threshold integer NOT NULL DEFAULT 5,
  expiry_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medicines_staff_all" ON public.medicines FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE TABLE public.treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES public.medical_visits(id) ON DELETE SET NULL,
  medicine_id uuid REFERENCES public.medicines(id) ON DELETE SET NULL,
  medicine_name text NOT NULL,
  dosage text,
  frequency text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'en_cours',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatments TO authenticated;
GRANT ALL ON public.treatments TO service_role;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treatments_staff_all" ON public.treatments FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "treatments_family_read" ON public.treatments FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE TABLE public.accidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  location text,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'leger',
  witnesses text,
  actions_taken text,
  parents_notified boolean NOT NULL DEFAULT false,
  hospital_transfer boolean NOT NULL DEFAULT false,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.accidents TO authenticated;
GRANT ALL ON public.accidents TO service_role;
ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "accidents_staff_all" ON public.accidents FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "accidents_family_read" ON public.accidents FOR SELECT TO authenticated
  USING (student_id IS NOT NULL AND public.is_parent_of_student(auth.uid(), student_id));

-- =========================
-- TRANSPORT
-- =========================
CREATE TABLE public.transport_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  license_number text,
  license_expiry date,
  hire_date date,
  status text NOT NULL DEFAULT 'actif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_drivers TO authenticated;
GRANT ALL ON public.transport_drivers TO service_role;
ALTER TABLE public.transport_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transport_drivers_read" ON public.transport_drivers FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "transport_drivers_write" ON public.transport_drivers FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE TABLE public.transport_buses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  plate_number text NOT NULL,
  capacity integer NOT NULL DEFAULT 30,
  model text,
  year integer,
  status text NOT NULL DEFAULT 'en_service',
  driver_id uuid REFERENCES public.transport_drivers(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_buses TO authenticated;
GRANT ALL ON public.transport_buses TO service_role;
ALTER TABLE public.transport_buses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transport_buses_read" ON public.transport_buses FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "transport_buses_write" ON public.transport_buses FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE TABLE public.transport_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  bus_id uuid REFERENCES public.transport_buses(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.transport_drivers(id) ON DELETE SET NULL,
  monthly_fee numeric NOT NULL DEFAULT 0,
  departure_time time,
  return_time time,
  status text NOT NULL DEFAULT 'actif',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_routes TO authenticated;
GRANT ALL ON public.transport_routes TO service_role;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transport_routes_read" ON public.transport_routes FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "transport_routes_write" ON public.transport_routes FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE TABLE public.transport_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id uuid NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  stop_name text,
  direction text NOT NULL DEFAULT 'aller_retour',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  monthly_fee numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'actif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_subscriptions TO authenticated;
GRANT ALL ON public.transport_subscriptions TO service_role;
ALTER TABLE public.transport_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transport_subs_manage" ON public.transport_subscriptions FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "transport_subs_family_read" ON public.transport_subscriptions FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE TABLE public.transport_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.transport_subscriptions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  route_id uuid REFERENCES public.transport_routes(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  direction text NOT NULL DEFAULT 'aller',
  status text NOT NULL DEFAULT 'present',
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, direction)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transport_attendance TO authenticated;
GRANT ALL ON public.transport_attendance TO service_role;
ALTER TABLE public.transport_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transport_att_staff" ON public.transport_attendance FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "transport_att_family_read" ON public.transport_attendance FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

-- =========================
-- CANTINE
-- =========================
CREATE TABLE public.canteen_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  menu_date date NOT NULL,
  meal_type text NOT NULL DEFAULT 'dejeuner',
  starter text,
  main_dish text NOT NULL,
  dessert text,
  drink text,
  price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, menu_date, meal_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canteen_menus TO authenticated;
GRANT ALL ON public.canteen_menus TO service_role;
ALTER TABLE public.canteen_menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canteen_menus_read" ON public.canteen_menus FOR SELECT TO authenticated
  USING (public.same_school(school_id));
CREATE POLICY "canteen_menus_write" ON public.canteen_menus FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE TABLE public.canteen_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'mensuel',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'actif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canteen_subscriptions TO authenticated;
GRANT ALL ON public.canteen_subscriptions TO service_role;
ALTER TABLE public.canteen_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canteen_subs_manage" ON public.canteen_subscriptions FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "canteen_subs_family_read" ON public.canteen_subscriptions FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE TABLE public.canteen_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.canteen_subscriptions(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'especes',
  period text,
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canteen_payments TO authenticated;
GRANT ALL ON public.canteen_payments TO service_role;
ALTER TABLE public.canteen_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canteen_payments_manage" ON public.canteen_payments FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "canteen_payments_family_read" ON public.canteen_payments FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

CREATE TABLE public.canteen_consumption (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  menu_id uuid REFERENCES public.canteen_menus(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL DEFAULT 'dejeuner',
  consumed boolean NOT NULL DEFAULT true,
  amount numeric NOT NULL DEFAULT 0,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date, meal_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.canteen_consumption TO authenticated;
GRANT ALL ON public.canteen_consumption TO service_role;
ALTER TABLE public.canteen_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canteen_cons_staff" ON public.canteen_consumption FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_finance(auth.uid()) OR public.is_super_admin(auth.uid())));
CREATE POLICY "canteen_cons_family_read" ON public.canteen_consumption FOR SELECT TO authenticated
  USING (public.is_parent_of_student(auth.uid(), student_id));

-- =========================
-- CIRCULAIRES
-- =========================
CREATE TABLE public.circulars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  reference text,
  target_roles text[] NOT NULL DEFAULT ARRAY['admin','directeur','enseignant','parent','eleve','comptable'],
  target_class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  attachment_url text,
  published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  author_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.circulars TO authenticated;
GRANT ALL ON public.circulars TO service_role;
ALTER TABLE public.circulars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "circulars_read" ON public.circulars FOR SELECT TO authenticated
  USING (public.same_school(school_id) AND (published = true OR public.is_staff(auth.uid())));
CREATE POLICY "circulars_write" ON public.circulars FOR ALL TO authenticated
  USING (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())))
  WITH CHECK (public.same_school(school_id) AND (public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid())));

CREATE TABLE public.circular_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circular_id uuid NOT NULL REFERENCES public.circulars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circular_id, user_id)
);
GRANT SELECT, INSERT ON public.circular_reads TO authenticated;
GRANT ALL ON public.circular_reads TO service_role;
ALTER TABLE public.circular_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "circular_reads_own_insert" ON public.circular_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "circular_reads_select" ON public.circular_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()) OR public.is_super_admin(auth.uid()));

-- =========================
-- TRIGGERS updated_at
-- =========================
CREATE TRIGGER t_medical_records_u BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_medical_visits_u BEFORE UPDATE ON public.medical_visits FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_medicines_u BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_treatments_u BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_accidents_u BEFORE UPDATE ON public.accidents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_transport_drivers_u BEFORE UPDATE ON public.transport_drivers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_transport_buses_u BEFORE UPDATE ON public.transport_buses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_transport_routes_u BEFORE UPDATE ON public.transport_routes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_transport_subs_u BEFORE UPDATE ON public.transport_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_transport_att_u BEFORE UPDATE ON public.transport_attendance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_canteen_menus_u BEFORE UPDATE ON public.canteen_menus FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_canteen_subs_u BEFORE UPDATE ON public.canteen_subscriptions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_canteen_payments_u BEFORE UPDATE ON public.canteen_payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_canteen_cons_u BEFORE UPDATE ON public.canteen_consumption FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER t_circulars_u BEFORE UPDATE ON public.circulars FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- INDEXES
CREATE INDEX idx_medical_visits_student ON public.medical_visits(student_id, visit_date DESC);
CREATE INDEX idx_treatments_student ON public.treatments(student_id);
CREATE INDEX idx_transport_subs_student ON public.transport_subscriptions(student_id);
CREATE INDEX idx_transport_att_date ON public.transport_attendance(school_id, date);
CREATE INDEX idx_canteen_cons_date ON public.canteen_consumption(school_id, date);
CREATE INDEX idx_canteen_payments_student ON public.canteen_payments(student_id);
CREATE INDEX idx_circulars_school ON public.circulars(school_id, published_at DESC);