import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Check, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { formatGNF } from "@/lib/orange-money";
import { usePerStudentPlan } from "@/hooks/usePerStudentPlan";

export const Route = createFileRoute("/_authenticated/abonnement")({
  head: () => ({
    meta: [
      { title: "Réactiver l'abonnement — MBGEduGuinée" },
      { name: "description", content: "Votre période d'essai est terminée : choisissez une offre pour retrouver l'accès à vos élèves, notes et paiements." },
      { property: "og:title", content: "Réactiver l'abonnement — MBGEduGuinée" },
      { property: "og:description", content: "Choisissez un abonnement pour continuer à utiliser MBGEduGuinée." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbonnementPage,
});

type Plan = {
  id: string; code: string; name: string; description: string | null;
  price_monthly: number; price_yearly: number; currency: string;
  student_limit: number | null; features: string[]; is_popular: boolean;
};

function AbonnementPage() {
  const navigate = useNavigate();
  const { subscription, isExpired, loading, refetch } = useSubscriptionStatus();
  const { info: planInfo } = usePerStudentPlan();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [confirm, setConfirm] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
            const { data } = await (supabase as any)
        .from("subscription_plans").select("*").eq("is_active", true).order("display_order");
      setPlans((data ?? [])
        .filter((p: any) => p.billing_model !== "per_student")
        .map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] })));
    })();
  }, []);

  async function apply(plan: Plan) {
    setSaving(true);
    const { data: sid } = await supabase.rpc("current_school_id");
    if (!sid) {
      setSaving(false);
      setConfirm(null);
      return toast.error("Établissement non identifié.");
    }
    const { error } = await (supabase as any).rpc("renew_or_change_subscription", {
      p_school_id: sid,
      p_new_plan_id: plan.id,
      p_billing_cycle: cycle,
    });
    setSaving(false);
    setConfirm(null);
    if (error) {
      toast.error("Activation impossible", { description: error.message });
      return;
    }
    toast.success("Abonnement mis à jour");
    await refetch();
    navigate({ to: "/dashboard" });
  }

  const cotisationBlocked = planInfo.isPerStudent && !planInfo.unlocked;

  return (
    <div className="max-w-6xl space-y-8">
      {cotisationBlocked && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">
              {planInfo.paidCount}/{planInfo.threshold} élèves ont payé leur cotisation
            </CardTitle>
            <CardDescription className="text-foreground/80">
              Votre établissement est au mode de facturation par élève. L'accès complet s'ouvrira dès que{" "}
              {planInfo.threshold} élèves auront réglé leur cotisation annuelle de {formatGNF(planInfo.unitPrice)}.
              Il en manque {Math.max(0, planInfo.threshold - planInfo.paidCount)}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, Math.round((planInfo.paidCount / Math.max(1, planInfo.threshold)) * 100))}%` }}
              />
            </div>
            <Button asChild variant="outline"><Link to="/cotisations">Encaisser les cotisations</Link></Button>
          </CardContent>
        </Card>
      )}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            {isExpired ? "Votre période d'essai gratuit de 30 jours est terminée" : "Abonnement de votre établissement"}
          </CardTitle>
          <CardDescription className="text-foreground/80">
            {isExpired
              ? "Pour continuer à utiliser MBGEduGuinée et accéder à toutes vos données (élèves, notes, paiements…), veuillez choisir un abonnement ci-dessous."
              : "Retrouvez ici les offres disponibles pour votre établissement."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-2 rounded-lg bg-background border px-3 py-2">
            <ShieldCheck className="size-4 text-primary" />
            Aucune donnée n'est perdue : vos informations sont conservées, seul l'accès est suspendu.
          </span>
          {!loading && subscription?.status && (
            <Badge variant="outline" className="capitalize">Statut actuel : {subscription.status}</Badge>
          )}
        </CardContent>
      </Card>

      <div className="max-w-xs">
        <Select value={cycle} onValueChange={(v: any) => setCycle(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Mensuel</SelectItem>
            <SelectItem value="yearly">Annuel (2 mois offerts)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((p) => (
          <div key={p.id} className={"p-6 rounded-2xl border bg-card relative " + (p.is_popular ? "border-primary ring-1 ring-primary/20" : "")}>
            {p.is_popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                Recommandé
              </div>
            )}
            <h3 className="font-display text-xl font-bold">{p.name}</h3>
            {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-3xl font-bold">
                {new Intl.NumberFormat("fr-FR").format(cycle === "yearly" ? p.price_yearly : p.price_monthly)}
              </span>
              <span className="text-muted-foreground text-sm">{p.currency}/{cycle === "yearly" ? "an" : "mois"}</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {p.student_limit ? `Jusqu'à ${p.student_limit} élèves` : "Élèves illimités"}
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2"><Check className="size-4 text-primary mt-0.5 shrink-0" />{f}</li>
              ))}
            </ul>
            <Button className="w-full mt-5" variant={p.is_popular ? "default" : "outline"} onClick={() => setConfirm(p)}>
              Choisir cette offre
            </Button>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-4 text-primary" /> Payer par Orange Money
          </CardTitle>
          <CardDescription>
            Vous préférez régler d'abord par Orange Money puis faire valider votre paiement ?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild><Link to="/souscription">Déclarer un paiement Orange Money</Link></Button>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'offre {confirm?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Cycle {cycle === "yearly" ? "annuel" : "mensuel"} ·{" "}
              {confirm ? formatGNF(cycle === "yearly" ? confirm.price_yearly : confirm.price_monthly) : ""}.
              L'accès à votre établissement sera rétabli immédiatement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => { e.preventDefault(); if (confirm) void apply(confirm); }}
            >
              {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Activation…</> : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
