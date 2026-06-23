import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Printer, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/paiements")({
  head: () => ({ meta: [{ title: "Paiements — EduGuinée" }] }),
  component: PaymentsPage,
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function PaymentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "late">("all");

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await supabase.from("payments").select("*, students(full_name, matricule, class_id, classes(name, annual_fee))").order("paid_at", { ascending: false })).data ?? [],
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students-payments"],
    queryFn: async () => (await supabase.from("students").select("id, full_name, matricule, classes(name, annual_fee), payments(amount)")).data ?? [],
  });

  const totalRevenue = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const lateStudents = students
    .map((s: any) => {
      const paid = (s.payments ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const due = Number(s.classes?.annual_fee ?? 0);
      return { ...s, paid, due, remaining: due - paid, pct: due > 0 ? (paid / due) * 100 : 0 };
    })
    .filter((s: any) => s.due > 0 && s.pct < 50);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Paiements</h1>
          <p className="text-muted-foreground mt-1">Revenus totaux : <span className="font-semibold text-foreground">{fmt(totalRevenue)} GNF</span></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Nouveau paiement</Button></DialogTrigger>
          <PaymentDialog students={students} onClose={() => { setOpen(false); qc.invalidateQueries(); }} />
        </Dialog>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setTab("all")} className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === "all" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground")}>Historique ({payments.length})</button>
        <button onClick={() => setTab("late")} className={"px-4 py-2 text-sm border-b-2 -mb-px " + (tab === "late" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground")}>Retards ({lateStudents.length})</button>
      </div>

      <Card>
        <CardContent className="p-4 overflow-x-auto">
          {tab === "all" ? (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Reçu</TableHead><TableHead>Élève</TableHead><TableHead>Type</TableHead><TableHead>Montant</TableHead><TableHead>Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun paiement</TableCell></TableRow>}
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.paid_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="font-mono text-xs">{p.receipt_number ?? "—"}</TableCell>
                    <TableCell><div className="font-medium">{p.students?.full_name}</div><div className="text-xs text-muted-foreground">{p.students?.classes?.name}</div></TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{p.payment_type}</Badge></TableCell>
                    <TableCell className="font-semibold">{fmt(p.amount)} GNF</TableCell>
                    <TableCell><Badge variant={p.status === "payé" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => printReceipt(p)}><Printer className="size-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Élève</TableHead><TableHead>Classe</TableHead><TableHead>Payé</TableHead><TableHead>Reste à payer</TableHead><TableHead>Progression</TableHead></TableRow></TableHeader>
              <TableBody>
                {lateStudents.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun retard</TableCell></TableRow>}
                {lateStudents.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" /><span className="font-medium">{s.full_name}</span></div></TableCell>
                    <TableCell>{s.classes?.name ?? "—"}</TableCell>
                    <TableCell>{fmt(s.paid)} GNF</TableCell>
                    <TableCell className="font-semibold text-destructive">{fmt(s.remaining)} GNF</TableCell>
                    <TableCell>
                      <div className="h-2 bg-muted rounded-full overflow-hidden w-32">
                        <div className="h-full bg-destructive" style={{ width: `${Math.min(100, s.pct)}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{s.pct.toFixed(0)}%</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentDialog({ students, onClose }: any) {
  const [form, setForm] = useState({
    student_id: "",
    amount: 0,
    payment_type: "scolarite",
    period: "",
    payment_method: "espèces",
    receipt_number: "REC-" + Date.now().toString().slice(-6),
    notes: "",
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.student_id) return;
    const { error } = await supabase.from("payments").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Paiement enregistré");
    onClose();
  }
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Élève</Label>
          <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.matricule}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Montant (GNF)</Label><Input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.payment_type} onValueChange={(v) => setForm({ ...form, payment_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["inscription","scolarite","cantine","transport","autre"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Période</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="ex. Octobre 2025" /></div>
          <div>
            <Label>Méthode</Label>
            <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["espèces","Orange Money","MTN MoMo","virement","chèque"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div><Label>N° de reçu</Label><Input value={form.receipt_number} onChange={(e) => setForm({ ...form, receipt_number: e.target.value })} /></div>
        <DialogFooter><Button type="submit">Enregistrer</Button></DialogFooter>
      </form>
    </DialogContent>
  );
}

function printReceipt(p: any) {
  const w = window.open("", "_blank", "width=600,height=800");
  if (!w) return;
  w.document.write(`
    <html><head><title>Reçu ${p.receipt_number}</title>
    <style>body{font-family:system-ui;padding:40px;color:#222}h1{margin:0;color:#2a5a3e}.box{border:2px solid #2a5a3e;padding:24px;border-radius:12px;margin-top:20px}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}strong{color:#444}</style>
    </head><body>
    <h1>EduGuinée</h1><div style="color:#666">Reçu de paiement</div>
    <div class="box">
    <div class="row"><strong>N° reçu</strong><span>${p.receipt_number ?? "-"}</span></div>
    <div class="row"><strong>Date</strong><span>${new Date(p.paid_at).toLocaleDateString("fr-FR")}</span></div>
    <div class="row"><strong>Élève</strong><span>${p.students?.full_name ?? ""}</span></div>
    <div class="row"><strong>Classe</strong><span>${p.students?.classes?.name ?? "-"}</span></div>
    <div class="row"><strong>Type</strong><span>${p.payment_type}</span></div>
    <div class="row"><strong>Période</strong><span>${p.period ?? "-"}</span></div>
    <div class="row"><strong>Méthode</strong><span>${p.payment_method}</span></div>
    <div class="row" style="font-size:1.4em;border:none;margin-top:16px"><strong>Total payé</strong><strong style="color:#2a5a3e">${fmt(p.amount)} GNF</strong></div>
    </div>
    <p style="margin-top:40px;color:#666;font-size:.85em">Merci pour votre confiance. — EduGuinée, Conakry.</p>
    <script>window.print()</script>
    </body></html>
  `);
  w.document.close();
}
