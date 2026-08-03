import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { History, Loader2, RefreshCw } from "lucide-react";

type Row = {
  id: string;
  action: string;
  billing_cycle: string;
  amount: number | null;
  currency: string | null;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  new_plan: { name: string } | null;
  previous_plan: { name: string } | null;
};

const ACTION_LABEL: Record<string, string> = {
  subscribe: "Souscription",
  renew: "Renouvellement",
  change_plan: "Changement d'offre",
  renew_or_change: "Mise à jour",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtAmount(v: number | null, c: string | null) {
  if (v == null) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(v)} ${c ?? "GNF"}`;
}

export function SubscriptionHistory({
  schoolId,
  refreshKey = 0,
}: {
  schoolId: string | null;
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await (supabase as any)
        .from("subscription_history")
        .select(
          "id,action,billing_cycle,amount,currency,period_start,period_end,status,created_at,new_plan:subscription_plans!subscription_history_new_plan_id_fkey(name),previous_plan:subscription_plans!subscription_history_previous_plan_id_fkey(name)",
        )
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setError(e?.message || "Impossible de charger l'historique.");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!schoolId) return null;

  return (
    <div className="mt-6 rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h3 className="font-display font-semibold">Historique des abonnements</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      </div>

      {error && (
        <div className="text-sm text-destructive flex items-center gap-3">
          {error}
          <Button size="sm" variant="outline" onClick={load}>Réessayer</Button>
        </div>
      )}

      {!error && loading && rows.length === 0 && (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      )}

      {!error && !loading && rows.length === 0 && (
        <div className="text-sm text-muted-foreground">Aucun renouvellement enregistré pour le moment.</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="text-left">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Offre</th>
                <th className="py-2 pr-4 font-medium">Cycle</th>
                <th className="py-2 pr-4 font-medium">Montant</th>
                <th className="py-2 pr-4 font-medium">Période</th>
                <th className="py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="py-2 pr-4">{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td className="py-2 pr-4">
                    {r.previous_plan?.name && r.previous_plan.name !== r.new_plan?.name
                      ? `${r.previous_plan.name} → ${r.new_plan?.name ?? "—"}`
                      : r.new_plan?.name ?? "—"}
                  </td>
                  <td className="py-2 pr-4">{r.billing_cycle === "yearly" ? "Annuel" : "Mensuel"}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">{fmtAmount(r.amount, r.currency)}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {fmtDate(r.period_start)} — {fmtDate(r.period_end)}
                  </td>
                  <td className="py-2">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary uppercase">
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SubscriptionHistory;
