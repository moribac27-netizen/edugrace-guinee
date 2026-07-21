import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Building2, Users, GraduationCap, CreditCard, TrendingUp, ShieldCheck, Package, Activity, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super-admin")({
  head: () => ({ meta: [{ title: "Super Admin — MBGEduGuinée" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: sa } = await supabase.from("super_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (!sa) throw redirect({ to: "/dashboard" });
  },
  component: SuperAdminDashboard,
});

type Plan = { id: string; code: string; name: string; price_monthly: number };
type Sub = {
  id: string; school_id: string; plan_id: string; status: string;
  trial_ends_at: string | null; current_period_end: string;
  last_payment_at: string | null; last_payment_amount: number | null;
};
type School = {
  id: string; name: string; email: string | null; phone: string | null;
  created_at: string; academic_year: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  trial: "bg-amber-100 text-amber-800 border-amber-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  past_due: "bg-orange-100 text-orange-800 border-orange-200",
  canceled: "bg-rose-100 text-rose-800 border-rose-200",
  expired: "bg-slate-200 text-slate-700 border-slate-300",
};

const CHART_COLORS = ["#2a5a3e", "#c8791f", "#8b5a2b", "#d4a574"];

function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [counts, setCounts] = useState<Record<string, { students: number; teachers: number; users: number; revenue: number }>>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<{ school: School; sub: Sub } | null>(null);

  async function load() {
    setLoading(true);
    const [sRes, subRes, pRes, stuRes, teaRes, payRes, actRes, profRes] = await Promise.all([
      supabase.from("schools").select("id,name,email,phone,created_at,academic_year").order("created_at", { ascending: false }),
      (supabase as any).from("school_subscriptions").select("*"),
      (supabase as any).from("subscription_plans").select("id,code,name,price_monthly"),
      supabase.from("students").select("school_id"),
      supabase.from("teachers").select("school_id"),
      supabase.from("payments").select("school_id,amount,validation_status,paid_at"),
      (supabase as any).from("activity_logs").select("id,school_id,action,entity_type,created_at,user_id").order("created_at", { ascending: false }).limit(30),
      supabase.from("profiles").select("school_id"),
    ]);
    setSchools((sRes.data ?? []) as School[]);
    setSubs((subRes.data ?? []) as Sub[]);
    setPlans((pRes.data ?? []) as Plan[]);
    setActivity(actRes.data ?? []);

    const c: Record<string, { students: number; teachers: number; users: number; revenue: number }> = {};
    const ensure = (id: string) => (c[id] ??= { students: 0, teachers: 0, users: 0, revenue: 0 });
    (stuRes.data ?? []).forEach((r: any) => ensure(r.school_id).students++);
    (teaRes.data ?? []).forEach((r: any) => ensure(r.school_id).teachers++);
    (profRes.data ?? []).forEach((r: any) => r.school_id && ensure(r.school_id).users++);
    (payRes.data ?? []).forEach((r: any) => { if (r.validation_status === "validé") ensure(r.school_id).revenue += Number(r.amount || 0); });
    setCounts(c);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const planById = useMemo(() => Object.fromEntries(plans.map(p => [p.id, p])), [plans]);
  const subBySchool = useMemo(() => Object.fromEntries(subs.map(s => [s.school_id, s])), [subs]);

  const totals = useMemo(() => {
    const totalStudents = Object.values(counts).reduce((a, b) => a + b.students, 0);
    const totalTeachers = Object.values(counts).reduce((a, b) => a + b.teachers, 0);
    const totalUsers = Object.values(counts).reduce((a, b) => a + b.users, 0);
    const totalRevenue = Object.values(counts).reduce((a, b) => a + b.revenue, 0);
    const mrr = subs.filter(s => s.status === "active").reduce((a, s) => a + (planById[s.plan_id]?.price_monthly ?? 0), 0);
    return { totalStudents, totalTeachers, totalUsers, totalRevenue, mrr };
  }, [counts, subs, planById]);

  const statusData = useMemo(() => {
    const g: Record<string, number> = {};
    subs.forEach(s => { g[s.status] = (g[s.status] ?? 0) + 1; });
    return Object.entries(g).map(([name, value]) => ({ name, value }));
  }, [subs]);

  const planData = useMemo(() => {
    const g: Record<string, number> = {};
    subs.forEach(s => { const n = planById[s.plan_id]?.name ?? "—"; g[n] = (g[n] ?? 0) + 1; });
    return Object.entries(g).map(([name, value]) => ({ name, value }));
  }, [subs, planById]);

  const growthData = useMemo(() => {
    const g: Record<string, number> = {};
    schools.forEach(s => {
      const m = s.created_at.slice(0, 7);
      g[m] = (g[m] ?? 0) + 1;
    });
    return Object.entries(g).sort().slice(-6).map(([month, count]) => ({ month, count }));
  }, [schools]);

  const filtered = useMemo(() => {
    return schools.filter(s => {
      const sub = subBySchool[s.id];
      if (statusFilter !== "all" && sub?.status !== statusFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [schools, subBySchool, search, statusFilter]);

  async function extendTrial(sub: Sub, days: number) {
    const base = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date();
    const target = new Date(Math.max(base.getTime(), Date.now()) + days * 86400000).toISOString();
    const { error } = await (supabase as any).from("school_subscriptions").update({
      trial_ends_at: target, current_period_end: target, status: "trial",
    }).eq("id", sub.id);
    if (error) return toast.error(error.message);
    toast.success(`Essai prolongé de ${days} jours`);
    load();
  }
  async function setStatus(sub: Sub, status: string) {
    const { error } = await (supabase as any).from("school_subscriptions").update({ status }).eq("id", sub.id);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    load();
  }
  async function changePlan(sub: Sub, plan_id: string) {
    const { error } = await (supabase as any).from("school_subscriptions").update({ plan_id }).eq("id", sub.id);
    if (error) return toast.error(error.message);
    toast.success("Offre modifiée");
    load();
  }

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <ShieldCheck className="size-7 text-primary" /> Super Administrateur
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Supervision globale de la plateforme MBGEduGuinée</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="size-4 mr-2" />Actualiser</Button>
          <Button asChild variant="outline"><Link to="/plans"><Package className="size-4 mr-2" />Gérer les offres</Link></Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi icon={<Building2 className="size-5" />} label="Écoles" value={schools.length} />
        <Kpi icon={<Users className="size-5" />} label="Élèves" value={totals.totalStudents} />
        <Kpi icon={<GraduationCap className="size-5" />} label="Enseignants" value={totals.totalTeachers} />
        <Kpi icon={<Activity className="size-5" />} label="Utilisateurs" value={totals.totalUsers} />
        <Kpi icon={<TrendingUp className="size-5" />} label="MRR (GNF)" value={totals.mrr.toLocaleString("fr-FR")} />
        <Kpi icon={<CreditCard className="size-5" />} label="Recettes (GNF)" value={totals.totalRevenue.toLocaleString("fr-FR")} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Abonnements par statut</CardTitle></CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Répartition par offre</CardTitle></CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={planData}>
                <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                <Bar dataKey="value" fill="#2a5a3e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Croissance (6 derniers mois)</CardTitle></CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={growthData}>
                <XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                <Bar dataKey="count" fill="#c8791f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Schools table */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">Établissements ({filtered.length})</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="w-48" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="trial">Essai</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="past_due">En retard</SelectItem>
                <SelectItem value="canceled">Annulé</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>École</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Fin de période</TableHead>
                <TableHead className="text-right">Élèves</TableHead>
                <TableHead className="text-right">Enseignants</TableHead>
                <TableHead className="text-right">Recettes (GNF)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const sub = subBySchool[s.id];
                const plan = sub ? planById[sub.plan_id] : null;
                const cnt = counts[s.id] ?? { students: 0, teachers: 0, users: 0, revenue: 0 };
                const status = sub?.status ?? "—";
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email ?? "—"} · {s.academic_year ?? "—"}</div>
                    </TableCell>
                    <TableCell>{plan?.name ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_COLORS[status] ?? ""}>{status}</Badge></TableCell>
                    <TableCell className="text-sm">{sub ? new Date(sub.current_period_end).toLocaleDateString("fr-FR") : "—"}</TableCell>
                    <TableCell className="text-right">{cnt.students}</TableCell>
                    <TableCell className="text-right">{cnt.teachers}</TableCell>
                    <TableCell className="text-right">{cnt.revenue.toLocaleString("fr-FR")}</TableCell>
                    <TableCell>
                      {sub && (
                        <Button size="sm" variant="outline" onClick={() => setEditing({ school: s, sub })}>Gérer</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun établissement</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Activity feed */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="size-4" />Activité récente (toutes écoles)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activity.map((a: any) => {
              const school = schools.find(s => s.id === a.school_id);
              return (
                <div key={a.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <div>
                    <span className="font-medium">{a.action}</span>
                    <span className="text-muted-foreground"> · {a.entity_type}</span>
                    <span className="text-muted-foreground"> · {school?.name ?? "—"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("fr-FR")}</span>
                </div>
              );
            })}
            {activity.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Aucune activité</p>}
          </div>
        </CardContent>
      </Card>

      {/* Manage dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gérer l'abonnement — {editing?.school.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Offre</label>
                <Select value={editing.sub.plan_id} onValueChange={(v) => changePlan(editing.sub, v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {p.price_monthly.toLocaleString("fr-FR")} GNF</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Statut</label>
                <div className="flex flex-wrap gap-2">
                  {["trial", "active", "past_due", "canceled", "expired"].map(st => (
                    <Button key={st} size="sm" variant={editing.sub.status === st ? "default" : "outline"} onClick={() => setStatus(editing.sub, st)}>{st}</Button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Prolonger l'essai</label>
                <div className="flex gap-2">
                  {[7, 15, 30, 60, 90].map(d => (
                    <Button key={d} size="sm" variant="outline" onClick={() => extendTrial(editing.sub, d)}>+{d} j</Button>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-3">
                Créé le {new Date(editing.school.created_at).toLocaleDateString("fr-FR")} · Période fin: {new Date(editing.sub.current_period_end).toLocaleDateString("fr-FR")}
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditing(null)}>Fermer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">{icon}{label}</div>
        <div className="text-xl md:text-2xl font-bold font-display">{value}</div>
      </CardContent>
    </Card>
  );
}
