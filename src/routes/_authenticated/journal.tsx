import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileSpreadsheet, Printer, History, Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/journal")({
  component: JournalPage,
  head: () => ({ meta: [{ title: "Journal d'activité — MBGEduGuinée" }] }),
});

type Log = {
  id: string;
  created_at: string;
  user_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  login: "Connexion", logout: "Déconnexion",
  create: "Création", update: "Modification", delete: "Suppression",
  export: "Export", print: "Impression", view: "Consultation",
  upload: "Téléversement", download: "Téléchargement",
  send: "Envoi", publish: "Publication",
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800 border-emerald-200",
  update: "bg-amber-100 text-amber-800 border-amber-200",
  delete: "bg-red-100 text-red-800 border-red-200",
  login: "bg-blue-100 text-blue-800 border-blue-200",
  logout: "bg-slate-100 text-slate-800 border-slate-200",
  export: "bg-purple-100 text-purple-800 border-purple-200",
  print: "bg-purple-100 text-purple-800 border-purple-200",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

function toCSV(rows: Log[]) {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ["Date", "Utilisateur", "Rôle", "Action", "Entité", "Référence", "Détails"];
  const head = headers.join(";");
  const body = rows.map((r) => [
    fmtDate(r.created_at),
    r.actor_name ?? "",
    r.actor_role ?? "",
    ACTION_LABELS[r.action] ?? r.action,
    r.entity_type,
    r.entity_label ?? r.entity_id ?? "",
    r.metadata ? JSON.stringify(r.metadata) : "",
  ].map(esc).join(";")).join("\n");
  return "\uFEFF" + head + "\n" + body;
}

function JournalPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  async function load() {
    setLoading(true);
    let q = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    const { data, error } = await q;
    if (error) toast.error("Erreur de chargement : " + error.message);
    setLogs((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const entityTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entity_type))).sort(),
    [logs],
  );
  const actionTypes = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs],
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      if (!s) return true;
      return (
        (l.actor_name ?? "").toLowerCase().includes(s) ||
        (l.entity_label ?? "").toLowerCase().includes(s) ||
        (l.entity_type ?? "").toLowerCase().includes(s) ||
        (l.action ?? "").toLowerCase().includes(s)
      );
    });
  }, [logs, search, actionFilter, entityFilter]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t = today.getTime();
    return {
      total: filtered.length,
      today: filtered.filter((l) => new Date(l.created_at).getTime() >= t).length,
      users: new Set(filtered.map((l) => l.user_id).filter(Boolean)).size,
      deletions: filtered.filter((l) => l.action === "delete").length,
    };
  }, [filtered]);

  function exportCSV() {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-activite-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <History className="size-8 text-primary" />
            Journal d'activité
          </h1>
          <p className="text-muted-foreground">
            Historique complet des actions effectuées dans votre établissement.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}><RefreshCw className="size-4 mr-2" />Actualiser</Button>
          <Button variant="outline" onClick={exportCSV}><FileSpreadsheet className="size-4 mr-2" />CSV</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4 mr-2" />Imprimer</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Événements affichés</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Aujourd'hui</div>
          <div className="text-2xl font-bold">{stats.today}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Utilisateurs actifs</div>
          <div className="text-2xl font-bold">{stats.users}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Suppressions</div>
          <div className="text-2xl font-bold text-red-600">{stats.deletions}</div>
        </CardContent></Card>
      </div>

      <Card className="print:hidden">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Recherche</Label>
            <div className="relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Utilisateur, entité, référence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Action</Label>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {actionTypes.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABELS[a] ?? a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Entité</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {entityTypes.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Du</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Au</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filtered.length} événement{filtered.length > 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              Aucune activité enregistrée pour ces critères.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Date & heure</th>
                    <th className="text-left p-3">Utilisateur</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Entité</th>
                    <th className="text-left p-3">Référence</th>
                    <th className="text-left p-3 print:hidden">Détails</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-t hover:bg-muted/30">
                      <td className="p-3 whitespace-nowrap font-mono text-xs">{fmtDate(l.created_at)}</td>
                      <td className="p-3">
                        <div className="font-medium">{l.actor_name ?? "—"}</div>
                        {l.actor_role && (
                          <div className="text-xs text-muted-foreground capitalize">{l.actor_role}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className={ACTION_COLORS[l.action] ?? ""}>
                          {ACTION_LABELS[l.action] ?? l.action}
                        </Badge>
                      </td>
                      <td className="p-3 capitalize">{l.entity_type}</td>
                      <td className="p-3 text-muted-foreground">
                        {l.entity_label ?? (l.entity_id ? l.entity_id.slice(0, 8) + "…" : "—")}
                      </td>
                      <td className="p-3 print:hidden">
                        {l.metadata && Object.keys(l.metadata).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-primary">Voir</summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded max-w-md overflow-auto">
                              {JSON.stringify(l.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
