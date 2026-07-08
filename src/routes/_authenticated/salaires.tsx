import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, FileText } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/salaires")({
  head: () => ({ meta: [{ title: "Salaires — MBGEduGuinée" }] }),
  component: PayrollPage,
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function PayrollPage() {
  const qc = useQueryClient();
  const [printing, setPrinting] = useState<any>(null);

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => (await supabase.from("employee_contracts").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: payslips = [] } = useQuery({
    queryKey: ["payslips"],
    queryFn: async () => (await supabase.from("payslips").select("*, employee_contracts(full_name, position)").order("period_year", { ascending: false }).order("period_month", { ascending: false })).data ?? [],
  });
  const { data: leaves = [] } = useQuery({
    queryKey: ["leaves"],
    queryFn: async () => (await supabase.from("employee_leaves").select("*, employee_contracts(full_name)").order("start_date", { ascending: false })).data ?? [],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Salaires & RH</h1>
          <p className="text-muted-foreground mt-1">Contrats, bulletins de paie et congés.</p>
        </div>
      </div>

      <Tabs defaultValue="contracts">
        <TabsList>
          <TabsTrigger value="contracts">Contrats ({contracts.length})</TabsTrigger>
          <TabsTrigger value="payslips">Bulletins ({payslips.length})</TabsTrigger>
          <TabsTrigger value="leaves">Congés ({leaves.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-end"><ContractDialog onSaved={() => qc.invalidateQueries({ queryKey: ["contracts"] })} /></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Poste</TableHead><TableHead>Salaire de base</TableHead><TableHead>Début</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {(contracts as any[]).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell>{c.position}</TableCell>
                    <TableCell>{fmt(Number(c.base_salary))} GNF</TableCell>
                    <TableCell>{new Date(c.start_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell><Badge variant={c.status === "actif" ? "default" : "secondary"} className="capitalize">{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {contracts.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Aucun contrat.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payslips" className="space-y-4">
          <div className="flex justify-end"><PayslipDialog contracts={contracts} onSaved={() => qc.invalidateQueries({ queryKey: ["payslips"] })} /></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Employé</TableHead><TableHead>Période</TableHead><TableHead>Base</TableHead><TableHead>Primes</TableHead><TableHead>Retenues</TableHead><TableHead className="text-right">Net à payer</TableHead><TableHead>Statut</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(payslips as any[]).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employee_contracts?.full_name}</TableCell>
                    <TableCell>{MONTHS[p.period_month - 1]} {p.period_year}</TableCell>
                    <TableCell>{fmt(Number(p.base_salary))}</TableCell>
                    <TableCell className="text-success">+{fmt(Number(p.bonuses) + Number(p.overtime_amount))}</TableCell>
                    <TableCell className="text-destructive">-{fmt(Number(p.advances) + Number(p.deductions))}</TableCell>
                    <TableCell className="text-right font-bold">{fmt(Number(p.net_pay))} GNF</TableCell>
                    <TableCell><Badge variant={p.paid ? "default" : "outline"}>{p.paid ? "Payé" : "En attente"}</Badge></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setPrinting(p)}><FileText className="size-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {payslips.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun bulletin.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <div className="flex justify-end"><LeaveDialog contracts={contracts} onSaved={() => qc.invalidateQueries({ queryKey: ["leaves"] })} /></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Employé</TableHead><TableHead>Type</TableHead><TableHead>Du</TableHead><TableHead>Au</TableHead><TableHead>Motif</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {(leaves as any[]).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.employee_contracts?.full_name}</TableCell>
                    <TableCell className="capitalize">{l.type.replace("_"," ")}</TableCell>
                    <TableCell>{new Date(l.start_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell>{new Date(l.end_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="max-w-xs truncate">{l.reason}</TableCell>
                    <TableCell><Badge variant={l.status === "approuve" ? "default" : l.status === "refuse" ? "destructive" : "outline"}>{l.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {leaves.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun congé.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {printing && <PayslipPrint payslip={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}

function ContractDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ full_name: "", position: "", base_salary: 0, start_date: new Date().toISOString().slice(0, 10), status: "actif" });
  async function save() {
    const { error } = await supabase.from("employee_contracts").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Contrat créé"); setOpen(false); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Nouveau contrat</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau contrat</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom complet</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><Label>Poste</Label><Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Enseignant, Comptable..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Salaire base (GNF)</Label><Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })} /></div>
            <div><Label>Date début</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Créer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayslipDialog({ contracts, onSaved }: { contracts: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState<any>({
    contract_id: "", period_month: now.getMonth() + 1, period_year: now.getFullYear(),
    base_salary: 0, bonuses: 0, overtime_hours: 0, overtime_amount: 0, advances: 0, deductions: 0, paid: false,
  });
  const net = useMemo(() => Number(form.base_salary) + Number(form.bonuses) + Number(form.overtime_amount) - Number(form.advances) - Number(form.deductions), [form]);

  function onContract(id: string) {
    const c = contracts.find((x: any) => x.id === id);
    setForm((f: any) => ({ ...f, contract_id: id, base_salary: c ? Number(c.base_salary) : 0 }));
  }
  async function save() {
    if (!form.contract_id) return toast.error("Choisissez un contrat");
    const { error } = await supabase.from("payslips").insert({ ...form, net_pay: net } as any);
    if (error) return toast.error(error.message);
    toast.success("Bulletin créé"); setOpen(false); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Nouveau bulletin</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bulletin de paie</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Employé</Label>
            <Select value={form.contract_id} onValueChange={onContract}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>{contracts.filter((c: any) => c.status === "actif").map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.position}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Mois</Label>
              <Select value={String(form.period_month)} onValueChange={(v) => setForm({ ...form, period_month: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Année</Label><Input type="number" value={form.period_year} onChange={(e) => setForm({ ...form, period_year: Number(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Salaire base</Label><Input type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: Number(e.target.value) })} /></div>
            <div><Label>Primes</Label><Input type="number" value={form.bonuses} onChange={(e) => setForm({ ...form, bonuses: Number(e.target.value) })} /></div>
            <div><Label>Heures sup (h)</Label><Input type="number" value={form.overtime_hours} onChange={(e) => setForm({ ...form, overtime_hours: Number(e.target.value) })} /></div>
            <div><Label>Montant heures sup</Label><Input type="number" value={form.overtime_amount} onChange={(e) => setForm({ ...form, overtime_amount: Number(e.target.value) })} /></div>
            <div><Label>Avances</Label><Input type="number" value={form.advances} onChange={(e) => setForm({ ...form, advances: Number(e.target.value) })} /></div>
            <div><Label>Retenues</Label><Input type="number" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} /></div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <span className="font-semibold">Net à payer</span>
            <span className="font-bold text-lg">{fmt(net)} GNF</span>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> Marquer comme payé</label>
        </div>
        <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaveDialog({ contracts, onSaved }: { contracts: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ contract_id: "", type: "annuel", start_date: "", end_date: "", reason: "", status: "en_attente" });
  async function save() {
    if (!form.contract_id || !form.start_date || !form.end_date) return toast.error("Champs requis");
    const { error } = await supabase.from("employee_leaves").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Congé enregistré"); setOpen(false); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Nouveau congé</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau congé</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Employé</Label>
            <Select value={form.contract_id} onValueChange={(v) => setForm({ ...form, contract_id: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>{contracts.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["annuel","maladie","maternite","sans_solde","autre"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["en_attente","approuve","refuse"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Du</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>Au</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div><Label>Motif</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayslipPrint({ payslip, onClose }: { payslip: any; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="no-print">Bulletin de paie</DialogTitle></DialogHeader>
        <div className="bulletin p-6 border rounded-lg space-y-4 print:border-0">
          <div className="text-center border-b pb-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">République de Guinée</div>
            <div className="font-display font-bold text-xl mt-1">MBGEduGuinée</div>
            <div className="text-sm mt-2">Bulletin de paie</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">Employé :</span> <span className="font-medium">{payslip.employee_contracts?.full_name}</span></div>
            <div><span className="text-muted-foreground">Poste :</span> <span className="font-medium">{payslip.employee_contracts?.position}</span></div>
            <div><span className="text-muted-foreground">Période :</span> <span className="font-medium">{MONTHS[payslip.period_month - 1]} {payslip.period_year}</span></div>
            <div><span className="text-muted-foreground">Statut :</span> <span className="font-medium">{payslip.paid ? "Payé" : "En attente"}</span></div>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="py-2">Salaire de base</td><td className="text-right">{fmt(Number(payslip.base_salary))} GNF</td></tr>
              <tr className="border-b"><td className="py-2">Primes</td><td className="text-right text-success">+{fmt(Number(payslip.bonuses))} GNF</td></tr>
              <tr className="border-b"><td className="py-2">Heures supplémentaires ({payslip.overtime_hours}h)</td><td className="text-right text-success">+{fmt(Number(payslip.overtime_amount))} GNF</td></tr>
              <tr className="border-b"><td className="py-2">Avances</td><td className="text-right text-destructive">-{fmt(Number(payslip.advances))} GNF</td></tr>
              <tr className="border-b"><td className="py-2">Retenues</td><td className="text-right text-destructive">-{fmt(Number(payslip.deductions))} GNF</td></tr>
              <tr className="border-t-2 font-bold text-lg"><td className="py-3">Net à payer</td><td className="text-right">{fmt(Number(payslip.net_pay))} GNF</td></tr>
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-4 pt-8 text-sm">
            <div className="text-center"><div className="border-t pt-2">Signature Employé</div></div>
            <div className="text-center"><div className="border-t pt-2">Signature Directeur</div></div>
          </div>
        </div>
        <DialogFooter className="no-print"><Button onClick={() => window.print()} className="gap-2"><Printer className="size-4" />Imprimer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
