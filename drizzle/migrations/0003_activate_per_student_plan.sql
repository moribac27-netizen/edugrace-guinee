-- Convertit la ligne "premium" (jamais souscrite par aucune école, confirmé
-- sans risque de migration de données) en véritable plan par élève :
-- 100 000 GNF / élève / an, dont 15 000 GNF reversés à l'école, seuil
-- d'accès fixé à 20 élèves payés. Basic et Standard restent inchangés.
-- Le code 'premium' est conservé (aucune référence en dur dans le front),
-- pour rester compatible avec le seed initial (ON CONFLICT (code) DO NOTHING).

UPDATE public.subscription_plans
SET
  name = 'Par élève',
  description = 'Facturation à l''élève, sans abonnement mensuel fixe : chaque élève réglé débloque son accès, l''école touche une part par élève.',
  billing_model = 'per_student',
  price_per_student = 100000,
  school_share_per_student = 15000,
  access_threshold_students = 20,
  price_monthly = 0,
price_yearly = 100000,
  student_limit = NULL,
  is_popular = false,
  features = '["Aucun abonnement mensuel fixe","100 000 GNF par élève et par an","15 000 GNF reversés à l''école par élève payé","Accès complet dès 20 élèves payés","Paiement groupé (école) ou individuel (parent/élève)","Reçu imprimable par élève"]'::jsonb
WHERE code = 'premium';