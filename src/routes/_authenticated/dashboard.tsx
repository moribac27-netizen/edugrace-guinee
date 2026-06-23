import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, CreditCard, AlertTriangle, ArrowRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord — EduGuinée" }] }),
  component: Dashboard,
});

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [students, teachers, classes, payments, latePayments] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("teachers").select("id", { count: "exact", head: true }),
        supabase.from("classes").select("id, name, annual_fee"),
        supabase.from("payments").select("amount, paid_at, payment_type"),
        supabase.from("students").select("id, full_name, class_id, classes(name, annual_fee), payments(amount)"),
      ]);
      const totalRevenue = (payments.data ?? []).reduce((s, p: any) => s + Number(p.amount), 0);
      const late = (latePayments.data ?? []).filter((s: any) => {
        const paid = (s.payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        const due = Number(s.classes?.annual_fee ?? 0);
        return due > 0 && paid < due * 0.5;
      });
      // Revenus par mois (6 derniers)
      const now = new Date();
      const months: { label: string; total: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("fr-FR", { month: "short" });
        const total = (payments.data ?? [])
          .filter((p: any) => {
            const pd = new Date(p.paid_at);
            return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
          })
          .reduce((s, p: any) => s + Number(p.amount), 0);
        months.push({ label, total });
      }
      return {
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        classes: (classes.data ?? []).length,
        revenue: totalRevenue,
        late: late.length,
        months,
      };
    },
  });

  const cards = [
    { label: "Élèves inscrits", value: stats?.students ?? 0, icon: Users, color: "text-primary bg-primary/10", to: "/eleves" as const },
    { label: "Enseignants", value: stats?.teachers ?? 0, icon: GraduationCap, color: "text-chart-2 bg-chart-2/10", to: "/enseignants" as const },
    { label: "Revenus (GNF)", value: fmt(stats?.revenue ?? 0), icon: CreditCard, color: "text-success bg-success/10", to: "/paiements" as const },
    { label: "Retards paiement", value: stats?.late ?? 0, icon: AlertTriangle, color: "text-destructive bg-destructive/10", to: "/paiements" as const },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de votre établissement.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} to={c.to}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <CardContent className="p-5">
                  <div className={"size-10 rounded-lg flex items-center justify-center mb-3 " + c.color}><Icon className="size-5" /></div>
                  <div className="text-2xl font-bold font-display">{c.value}</div>
                  <div className="text-sm text-muted-foreground mt-1 flex items-center justify-between">
                    {c.label}
                    <ArrowRight className="size-3.5 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenus des 6 derniers mois</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.months ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => fmt(v)} width={80} />
              <Tooltip formatter={(v: number) => fmt(v) + " GNF"} />
              <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
