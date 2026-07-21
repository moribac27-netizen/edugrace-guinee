import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Sparkles, CreditCard, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/audit";

type Plan = {
  id: string; code: string; name: string; description: string | null;
  price_monthly: number; price_yearly: number; currency: string;
  student_limit: number | null; features: string[]; is_popular: boolean;
};
type Sub = {
  id: string; plan_id: string; status: string;
  trial_ends_at: string | null; current_period_start: string; current_period_end: string;
  billing_cycle: string; payment_provider: string | null;
  plan: Plan | null;
};

export const Route = createFileRoute("/_authenticated/souscription")({
  validateSearch: (s: Record<string, unknown>) => ({ plan: (s.plan as string) || undefined }),
  head: () => ({ meta: [{ title: "Abonnement — MBGEduGuinée" }] }),
  component: SubscriptionPage,
});

const PROVIDERS = [
  { id: "orange_money", label: "Orange Money", icon: Smartphone, hint: "Paiement mobile Orange" },
  { id: "mobile_money", label: "Mobile Money (MTN/Moov)", icon: Smartphone, hint: "MoMo, Moov Money" },
  { id: "stripe", label: "Carte bancaire (Stripe)", icon: CreditCard, hint: "Visa, Mastercard" },
  { id: "paypal", label: "PayPal", icon: Wallet, hint: "Compte PayPal" },
] as const;

function fmt(v: number) { return new Intl.NumberFormat("fr-FR").format(v); }
function fdate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function SubscriptionPage() {
  const { plan: planParam } = useSearch({ from: "/_authenticated/souscription" });
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<Sub | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [provider, setProvider] = useState<string>("orange_money");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", u.user.id).maybeSingle();
    if (!prof?.school_id) { setLoading(false); return; }
    setSchoolId(prof.school_id);

    const { data: pl } = await (supabase as any)
      .from("subscription_plans").select("*").eq("is_active", true).order("display_order");
    const plansN: Plan[] = (pl ?? []).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] }));
    setPlans(plansN);

    const { data: s } = await (supabase as any)
      .from("school_subscriptions")
      .select("*, plan:subscription_plans(*)")
      .eq("school_id", prof.school_id).maybeSingle();
    if (s?.plan) s.plan.features = Array.isArray(s.plan.features) ? s.plan.features : [];
    setSub(s ?? null);
    if (s?.billing_cycle) setCycle(s.billing_cycle);
    if (s?.payment_provider) setProvider(s.payment_provider);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const selectedFromParam = useMemo(
    () => plans.find((p) => p.code === planParam) ?? null,
    [plans, planParam],
  );

  async function subscribe(plan: Plan) {
    if (!schoolId) return;
    setSaving(true);
    const now = new Date();
    const end = new Date(now);
    if (cycle === "yearly") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    const amount = cycle === "yearly" ? plan.price_yearly : plan.price_monthly;

    // NOTE: architecture prête pour Stripe/PayPal/Orange Money/Mobile Money.
    // Ici on enregistre l'intention et on active l'abonnement (à connecter aux
    // fournisseurs de paiement via une server function + webhook).
    const payload = {
      school_id: schoolId,
      plan_id: plan.id,
      status: "active" as const,
      billing_cycle: cycle,
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      last_payment_at: now.toISOString(),
      last_payment_amount: amount,
      payment_provider: provider,
      metadata: { source: "self-service", intent: "subscribe" },
    };

    let error;
    if (sub) {
      ({ error } = await (supabase as any).from("school_subscriptions").update(payload).eq("id", sub.id));
    } else {
      ({ error } = await (supabase as any).from("school_subscriptions").insert(payload));
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Abonnement ${plan.name} activé`);
    logActivity({ action: "update", entity_type: "school_subscription", entity_id: plan.id, entity_label: plan.name, metadata: { cycle, provider } });
    load();
    navigate({ to: "/souscription", search: {} });
  }

  const currentPlan = sub?.plan ?? null;
  const isTrial = sub?.status === "trial";

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="font-display text-3xl font-bold">Abonnement de l'école</h1>
        <p className="text-muted-foreground mt-1">Gérez votre offre, votre cycle de facturation et votre moyen de paiement.</p>
      </div>

      {/* Current */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnement actuel</CardTitle>
          <CardDescription>Détails et statut de votre offre en cours.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-24 animate-pulse bg-muted rounded" />
          ) : sub ? (
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Offre</div>
                <div className="font-display font-semibold text-lg">{currentPlan?.name ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Statut</div>
                <Badge variant={isTrial ? "secondary" : sub.status === "active" ? "default" : "outline"} className="mt-1 capitalize">
                  {isTrial && <Sparkles className="size-3 mr-1" />}
                  {sub.status}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{isTrial ? "Fin de l'essai" : "Prochaine échéance"}</div>
                <div className="font-medium">{fdate(isTrial ? sub.trial_ends_at : sub.current_period_end)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cycle</div>
                <div className="font-medium capitalize">{sub.billing_cycle === "yearly" ? "Annuel" : "Mensuel"}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Aucun abonnement actif.</div>
          )}
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle>Options de facturation</CardTitle>
          <CardDescription>Choisissez le cycle et le moyen de paiement.</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium mb-2">Cycle</div>
            <Select value={cycle} onValueChange={(v: any) => setCycle(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensuel</SelectItem>
                <SelectItem value="yearly">Annuel (2 mois offerts)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Moyen de paiement</div>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="font-display text-2xl font-bold mb-4">Choisir une offre</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrent = currentPlan?.id === p.id;
            const highlight = selectedFromParam?.id === p.id;
            return (
              <div key={p.id} className={"p-6 rounded-2xl border bg-card relative " + (p.is_popular ? "border-primary ring-1 ring-primary/20 " : "") + (highlight ? "ring-2 ring-accent " : "")}>
                {p.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">Recommandé</div>}
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  {isCurrent && <Badge>Offre actuelle</Badge>}
                </div>
                {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    {fmt(cycle === "yearly" ? p.price_yearly : p.price_monthly)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {p.currency}/{cycle === "yearly" ? "an" : "mois"}
                  </span>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2"><Check className="size-4 text-primary mt-0.5 shrink-0" />{f}</li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-5"
                  variant={isCurrent && !isTrial ? "outline" : p.is_popular ? "default" : "outline"}
                  disabled={saving}
                  onClick={() => subscribe(p)}
                >
                  {isCurrent && !isTrial ? "Renouveler" : isCurrent && isTrial ? "Activer cette offre" : "Choisir cette offre"}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Les paiements Stripe, PayPal, Orange Money et Mobile Money sont en cours d'intégration. Votre abonnement est activé immédiatement et notre équipe vous accompagne pour la première facturation.
        </p>
      </div>
    </div>
  );
}
