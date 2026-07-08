import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Printer, Wallet, ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/comptabilite")({
  head: () => ({ meta: [{ title: "Comptabilité — MBGEduGuinée" }] }),
  component: AccountingPage,
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

const REVENUE_TYPES = ["inscription","reinscription","scolarite","transport","cantine","uniforme","examens","autres"] as const;
const EXPENSE_TYPES = ["salaires","fournitures","eau","electricite","internet","entretien","carburant","autres"] as const;
const ACCOUNT_TYPES = ["caisse","banque","mobile_money","orange_money","autre"] as const;
const METHODS = ["especes","cheque","virement","mobile_money","orange_money","autre"] as const;

function AccountingPage() {
  const qc = useQueryClient();

  const { data: accounts = [] } = useQuery({
    queryKey: ["fin-accounts"],
    queryFn: async () => (await supabase.from("financial_accounts").select("*").order("name")).data ?? [],
  });
  const { data: revenues = [] } = useQuery({
    queryKey: ["revenues"],
    queryFn: async () => (await supabase.from("revenues").select("*, financial_accounts(name)").order("occurred_at", { ascending: false })).data ?? [],
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await supabase.from("expenses").select("*, financial_accounts(name)").order("occurred_at", { ascending: false })).data ?? [],
  });

  const totals = useMemo(() => {
    const rev = (revenues as any[]).reduce((s, r) => s + Number(r.amount), 0);
    const exp = (expenses as any[]).reduce((s, e) => s + Number(e.amount), 0);
    const initial = (accounts as any[]).reduce((s, a) => s + Number(a.initial_balance), 0);
    return { rev, exp, net: rev - exp, balance: initial + rev - exp };
  }, [revenues, expenses, accounts]);

  const balances = useMemo(() => {
    return (accounts as any[]).map((a) => {
      const rev = (revenues as any[]).filter((r) => r.account_id === a.id).reduce((s, r) => s + Number(r.amount), 0);
      const exp = (expenses as any[]).filter((e) => e.account_id === a.id).reduce((s, e) => s + Number(e.amount), 0);
      return { ...a, balance: Number(a.initial_balance) + rev - exp };
    });
  }, [accounts, revenues, expenses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Comptabilité</h1>
          <p className="text-muted-foreground mt-1">Comptes, recettes, dépenses et journaux financiers.</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="size-4" />Imprimer</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total recettes" value={fmt(totals.rev) + " GNF"} icon={ArrowDownCircle} color="text-success bg-success/10" />
        <StatCard label="Total dépenses" value={fmt(totals.exp) + " GNF"} icon={ArrowUpCircle} color="text-destructive bg-destructive/10" />
        <StatCard label="Résultat net" value={fmt(totals.net) + " GNF"} icon={Scale} color={totals.net >= 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10"} />
        <StatCard label="Solde consolidé" value={fmt(totals.balance) + " GNF"} icon={Wallet} color="text-primary bg-primary/10" />
      </div>

      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">Comptes</TabsTrigger>
          <TabsTrigger value="revenues">Recettes</TabsTrigger>
          <TabsTrigger value="expenses">Dépenses</TabsTrigger>
          <TabsTrigger value="journal">Journal général</TabsTrigger>
          <TabsTrigger value="report">Compte de résultat</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="flex justify-end">
            <AccountDialog onSaved={() => qc.invalidateQueries({ queryKey: ["fin-accounts"] })} />
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Solde initial</TableHead><TableHead className="text-right">Solde actuel</TableHead></TableRow></TableHeader>
              <TableBody>
                {balances.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="capitalize">{a.type.replace("_"," ")}</TableCell>
                    <TableCell className="text-right">{fmt(Number(a.initial_balance))} GNF</TableCell>
                    <TableCell className="text-right font-semibold">{fmt(a.balance)} GNF</TableCell>
                  </TableRow>
                ))}
                {balances.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun compte. Créez votre caisse principale pour commencer.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="revenues" className="space-y-4">
          <div className="flex justify-end">
            <TxDialog kind="revenue" accounts={accounts} onSaved={() => qc.invalidateQueries({ queryKey: ["revenues"] })} />
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Compte</TableHead><TableHead>Description</TableHead><TableHead>Mode</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>
                {(revenues as any[]).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.occurred_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="capitalize">{r.type}</TableCell>
                    <TableCell>{r.financial_accounts?.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.description}</TableCell>
                    <TableCell className="capitalize">{r.method.replace("_"," ")}</TableCell>
                    <TableCell className="text-right font-medium text-success">+{fmt(Number(r.amount))} GNF</TableCell>
                  </TableRow>
                ))}
                {revenues.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune recette.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <TxDialog kind="expense" accounts={accounts} onSaved={() => qc.invalidateQueries({ queryKey: ["expenses"] })} />
          </div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Compte</TableHead><TableHead>Bénéficiaire</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Montant</TableHead></TableRow></TableHeader>
              <TableBody>
                {(expenses as any[]).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{new Date(e.occurred_at).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="capitalize">{e.type}</TableCell>
                    <TableCell>{e.financial_accounts?.name}</TableCell>
                    <TableCell>{e.beneficiary}</TableCell>
                    <TableCell className="max-w-xs truncate">{e.description}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">-{fmt(Number(e.amount))} GNF</TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune dépense.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="journal">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Libellé</TableHead><TableHead>Compte</TableHead><TableHead className="text-right">Débit</TableHead><TableHead className="text-right">Crédit</TableHead></TableRow></TableHeader>
              <TableBody>
                {[
                  ...(revenues as any[]).map((r) => ({ date: r.occurred_at, label: `Recette ${r.type} — ${r.description ?? ""}`, account: r.financial_accounts?.name, debit: Number(r.amount), credit: 0 })),
                  ...(expenses as any[]).map((e) => ({ date: e.occurred_at, label: `Dépense ${e.type} — ${e.description ?? ""}`, account: e.financial_accounts?.name, debit: 0, credit: Number(e.amount) })),
                ].sort((a, b) => (a.date > b.date ? -1 : 1)).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(row.date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="max-w-md truncate">{row.label}</TableCell>
                    <TableCell>{row.account}</TableCell>
                    <TableCell className="text-right text-success">{row.debit ? fmt(row.debit) : ""}</TableCell>
                    <TableCell className="text-right text-destructive">{row.credit ? fmt(row.credit) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader><CardTitle>Compte de résultat</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Recettes par catégorie</h3>
                {REVENUE_TYPES.map((t) => {
                  const total = (revenues as any[]).filter((r) => r.type === t).reduce((s, r) => s + Number(r.amount), 0);
                  return <div key={t} className="flex justify-between py-1 border-b text-sm"><span className="capitalize">{t}</span><span className="text-success">{fmt(total)} GNF</span></div>;
                })}
                <div className="flex justify-between py-2 font-bold"><span>Total recettes</span><span className="text-success">{fmt(totals.rev)} GNF</span></div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Dépenses par catégorie</h3>
                {EXPENSE_TYPES.map((t) => {
                  const total = (expenses as any[]).filter((e) => e.type === t).reduce((s, e) => s + Number(e.amount), 0);
                  return <div key={t} className="flex justify-between py-1 border-b text-sm"><span className="capitalize">{t}</span><span className="text-destructive">{fmt(total)} GNF</span></div>;
                })}
                <div className="flex justify-between py-2 font-bold"><span>Total dépenses</span><span className="text-destructive">{fmt(totals.exp)} GNF</span></div>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-primary font-bold text-lg">
                <span>Résultat net</span><span className={totals.net >= 0 ? "text-success" : "text-destructive"}>{fmt(totals.net)} GNF</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  return (
    <Card><CardContent className="p-5">
      <div className={"size-10 rounded-lg flex items-center justify-center mb-3 " + color}><Icon className="size-5" /></div>
      <div className="text-2xl font-bold font-display">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </CardContent></Card>
  );
}

function AccountDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "caisse", initial_balance: 0 });
  async function save() {
    const { error } = await supabase.from("financial_accounts").insert(form as any);
    if (error) return toast.error(error.message);
    toast.success("Compte créé"); setOpen(false); setForm({ name: "", type: "caisse", initial_balance: 0 }); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Nouveau compte</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau compte financier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Caisse principale" /></div>
          <div><Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Solde initial (GNF)</Label><Input type="number" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: Number(e.target.value) })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Créer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TxDialog({ kind, accounts, onSaved }: { kind: "revenue" | "expense"; accounts: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const types = kind === "revenue" ? REVENUE_TYPES : EXPENSE_TYPES;
  const [form, setForm] = useState<any>({ account_id: "", type: types[0], amount: 0, method: "especes", description: "", beneficiary: "", occurred_at: new Date().toISOString().slice(0, 10) });
  async function save() {
    if (!form.account_id) return toast.error("Choisissez un compte");
    const table = kind === "revenue" ? "revenues" : "expenses";
    const payload: any = { ...form };
    if (kind === "revenue") delete payload.beneficiary;
    const { error } = await supabase.from(table).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Enregistré"); setOpen(false); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />{kind === "revenue" ? "Nouvelle recette" : "Nouvelle dépense"}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{kind === "revenue" ? "Nouvelle recette" : "Nouvelle dépense"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Compte</Label>
            <Select value={form.account_id} onValueChange={(v) => setForm({ ...form, account_id: v })}>
              <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>{accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Mode</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METHODS.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Montant (GNF)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>Date</Label><Input type="date" value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} /></div>
          </div>
          {kind === "expense" && <div><Label>Bénéficiaire</Label><Input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} /></div>}
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
