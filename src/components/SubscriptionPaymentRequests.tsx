import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatGNF, ORANGE_MONEY } from "@/lib/orange-money";

type Row = {
  id: string; school_id: string; billing_cycle: string; amount: number;
  status: string; transaction_id: string | null; payer_phone: string | null;
  payer_name: string | null; rejection_reason: string | null; created_at: string;
  plan: { name: string } | null;
  school: { name: string } | null;
};

function fdate(v: string) {
  return new Date(v).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SubscriptionPaymentRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("subscription_payment_requests")
      .select("*, plan:subscription_plans(name), school:schools(name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function review(id: string, approve: boolean) {
    setBusy(id);
    const { error } = await (supabase as any).rpc("review_subscription_payment_request", {
      p_request_id: id,
      p_approve: approve,
      p_reason: approve ? null : (reason[id] || "Paiement non retrouvé"),
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Paiement validé, abonnement activé." : "Demande rejetée.");
    load();
  }

  const pending = rows.filter((r) => r.status === "pending");

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Paiements Orange Money des abonnements</CardTitle>
          <CardDescription>
            Compte bénéficiaire : {ORANGE_MONEY.number} — {ORANGE_MONEY.holder} · {pending.length} en attente
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={"size-4 mr-2 " + (loading ? "animate-spin" : "")} /> Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="h-24 animate-pulse bg-muted rounded" />
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground text-sm">Aucune demande de paiement.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="border rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {r.school?.name ?? "École"} — {r.plan?.name ?? "Offre"} ({r.billing_cycle === "yearly" ? "Annuel" : "Mensuel"})
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fdate(r.created_at)} · Transaction {r.transaction_id ?? "—"}
                    {r.payer_phone ? ` · ${r.payer_phone}` : ""}{r.payer_name ? ` · ${r.payer_name}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatGNF(r.amount)}</span>
                  {r.status === "validated" ? (
                    <Badge className="gap-1"><CheckCircle2 className="size-3" /> Validé</Badge>
                  ) : r.status === "rejected" ? (
                    <Badge variant="destructive" className="gap-1"><XCircle className="size-3" /> Rejeté</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1"><Clock className="size-3" /> En attente</Badge>
                  )}
                </div>
              </div>

              {r.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="max-w-xs"
                    placeholder="Motif de rejet (optionnel)"
                    value={reason[r.id] ?? ""}
                    onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                  />
                  <Button size="sm" onClick={() => review(r.id, true)} disabled={busy === r.id}>
                    {busy === r.id && <Loader2 className="size-4 mr-2 animate-spin" />} Valider & activer
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => review(r.id, false)} disabled={busy === r.id}>
                    Rejeter
                  </Button>
                </div>
              )}
              {r.rejection_reason && (
                <div className="text-xs text-destructive">Motif : {r.rejection_reason}</div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
