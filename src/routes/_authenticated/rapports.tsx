import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Printer, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/rapports")({
  component: RapportsPage,
  head: () => ({ meta: [{ title: "Rapports & Exports — MBGEduGuinée" }] }),
});

type Row = Record<string, any>;

const fmtGNF = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n || 0)) + " GNF";

function toCSV(rows: Row[], headers: { key: string; label: string }[]) {
  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = headers.map((h) => esc(h.label)).join(";");
  const body = rows.map((r) => headers.map((h) => esc(r[h.key])).join(";")).join("\n");
  return "\uFEFF" + head + "\n" + body;
}

function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function RapportsPage() {
  const [tab, setTab] = useState("eleves");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-display font-bold">Rapports & Exports</h1>
          <p className="text-muted-foreground">
            Générez et téléchargez des rapports professionnels (CSV / PDF).
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto print:hidden">
          <TabsTrigger value="eleves">Élèves</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="paiements">Paiements</TabsTrigger>
          <TabsTrigger value="presences">Présences</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="salaires">Salaires</TabsTrigger>
        </TabsList>
        <TabsContent value="eleves"><ElevesReport /></TabsContent>
        <TabsContent value="notes"><NotesReport /></TabsContent>
        <TabsContent value="paiements"><PaiementsReport /></TabsContent>
        <TabsContent value="presences"><PresencesReport /></TabsContent>
        <TabsContent value="finance"><FinanceReport /></TabsContent>
        <TabsContent value="salaires"><SalairesReport /></TabsContent>
      </Tabs>
    </div>
  );
}

function ReportShell({
  title,
  filters,
  onExportCSV,
  rows,
  columns,
  loading,
  extra,
}: {
  title: string;
  filters?: React.ReactNode;
  onExportCSV: () => void;
  rows: Row[];
  columns: { key: string; label: string; render?: (v: any, r: Row) => React.ReactNode }[];
  loading?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="print:hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4 mr-2" /> Imprimer / PDF
            </Button>
            <Button onClick={onExportCSV} disabled={!rows.length}>
              <FileSpreadsheet className="size-4 mr-2" /> Exporter CSV
            </Button>
          </div>
        </div>
        {filters && <div className="grid gap-3 md:grid-cols-4 mt-4">{filters}</div>}
      </CardHeader>
      <CardContent>
        <div className="print:block hidden mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">
            Généré le {new Date().toLocaleString("fr-FR")}
          </p>
        </div>
        {extra}
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Aucune donnée.</div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="text-left px-3 py-2 font-medium">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2">
                        {c.render ? c.render(r[c.key], r) : r[c.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-xs text-muted-foreground">{rows.length} ligne(s)</div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Élèves ---------------- */
function ElevesReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [classId, setClassId] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("students")
        .select("first_name,last_name,gender,birth_date,matricule,status,classes(name)")
        .order("last_name");
      if (classId !== "all") q = q.eq("class_id", classId);
      const { data } = await q;
      setRows(
        (data || []).map((s: any) => ({
          matricule: s.matricule,
          nom: s.last_name,
          prenom: s.first_name,
          genre: s.gender,
          naissance: s.birth_date,
          classe: s.classes?.name,
          statut: s.status,
        })),
      );
      setLoading(false);
    })();
  }, [classId]);

  const columns = [
    { key: "matricule", label: "Matricule" },
    { key: "nom", label: "Nom" },
    { key: "prenom", label: "Prénom" },
    { key: "genre", label: "Genre" },
    { key: "naissance", label: "Naissance" },
    { key: "classe", label: "Classe" },
    { key: "statut", label: "Statut" },
  ];

  return (
    <ReportShell
      title="Liste des élèves"
      loading={loading}
      rows={rows}
      columns={columns}
      onExportCSV={() => downloadCSV("eleves.csv", toCSV(rows, columns))}
      filters={
        <div>
          <Label>Classe</Label>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}

/* ---------------- Notes ---------------- */
function NotesReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [classId, setClassId] = useState<string>("all");
  const [term, setTerm] = useState<string>("all");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("grades")
        .select("score,max_score,period,evaluation_type,students(first_name,last_name,class_id,classes(name)),subjects(name)")
        .order("created_at", { ascending: false });
      if (term !== "all") q = q.eq("period", term);
      const { data } = await q;
      let mapped = (data || []).map((g: any) => ({
        eleve: `${g.students?.last_name ?? ""} ${g.students?.first_name ?? ""}`.trim(),
        classe: g.students?.classes?.name,
        classId: g.students?.class_id,
        matiere: g.subjects?.name,
        type: g.evaluation_type,
        periode: g.period,
        note: g.score,
        max: g.max_score,
      }));
      if (classId !== "all") mapped = mapped.filter((r) => r.classId === classId);
      setRows(mapped);
      setLoading(false);
    })();
  }, [classId, term]);

  const columns = [
    { key: "eleve", label: "Élève" },
    { key: "classe", label: "Classe" },
    { key: "matiere", label: "Matière" },
    { key: "type", label: "Type" },
    { key: "periode", label: "Période" },
    { key: "note", label: "Note" },
    { key: "max", label: "Max" },
  ];

  return (
    <ReportShell
      title="Rapport des notes"
      loading={loading}
      rows={rows}
      columns={columns}
      onExportCSV={() => downloadCSV("notes.csv", toCSV(rows, columns))}
      filters={
        <>
          <div>
            <Label>Classe</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Période</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="T1">Trimestre 1</SelectItem>
                <SelectItem value="T2">Trimestre 2</SelectItem>
                <SelectItem value="T3">Trimestre 3</SelectItem>
                <SelectItem value="S1">Semestre 1</SelectItem>
                <SelectItem value="S2">Semestre 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      }
    />
  );
}

/* ---------------- Paiements ---------------- */
function PaiementsReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("payments")
        .select("amount,paid_at,payment_method,status,receipt_number,payment_type,students(first_name,last_name,classes(name))")
        .gte("paid_at", from)
        .lte("paid_at", to + "T23:59:59")
        .order("paid_at", { ascending: false });
      setRows(
        (data || []).map((p: any) => ({
          date: p.paid_at?.slice(0, 10),
          reference: p.receipt_number,
          eleve: `${p.students?.last_name ?? ""} ${p.students?.first_name ?? ""}`.trim(),
          classe: p.students?.classes?.name,
          type: p.payment_type,
          methode: p.payment_method,
          statut: p.status,
          montant: p.amount,
        })),
      );
      setLoading(false);
    })();
  }, [from, to]);

  const total = rows.reduce((s, r) => s + Number(r.montant || 0), 0);

  const columns = [
    { key: "date", label: "Date" },
    { key: "reference", label: "Référence" },
    { key: "eleve", label: "Élève" },
    { key: "classe", label: "Classe" },
    { key: "type", label: "Type" },
    { key: "methode", label: "Méthode" },
    { key: "statut", label: "Statut" },
    { key: "montant", label: "Montant", render: (v: number) => fmtGNF(v) },
  ];

  return (
    <ReportShell
      title="Rapport des paiements"
      loading={loading}
      rows={rows}
      columns={columns}
      onExportCSV={() => downloadCSV("paiements.csv", toCSV(rows, columns))}
      filters={
        <>
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </>
      }
      extra={
        <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm">
          <strong>Total encaissé :</strong> {fmtGNF(total)}
        </div>
      }
    />
  );
}

/* ---------------- Présences ---------------- */
function PresencesReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<Row[]>([]);
  const [classId, setClassId] = useState<string>("all");
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from("classes").select("id,name").order("name").then(({ data }) => setClasses(data || []));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("student_attendance")
        .select("date,status,students(first_name,last_name,class_id,classes(name))")
        .gte("date", from)
        .lte("date", to)
        .order("date", { ascending: false });
      const { data } = await q;
      let mapped = (data || []).map((a: any) => ({
        date: a.date,
        eleve: `${a.students?.last_name ?? ""} ${a.students?.first_name ?? ""}`.trim(),
        classId: a.students?.class_id,
        classe: a.students?.classes?.name,
        statut: a.status,
      }));
      if (classId !== "all") mapped = mapped.filter((r) => r.classId === classId);
      setRows(mapped);
      setLoading(false);
    })();
  }, [classId, from, to]);

  const stats = useMemo(() => {
    const total = rows.length || 1;
    const present = rows.filter((r) => r.statut === "present").length;
    const absent = rows.filter((r) => r.statut === "absent").length;
    const retard = rows.filter((r) => r.statut === "late").length;
    return { present, absent, retard, taux: ((present / total) * 100).toFixed(1) };
  }, [rows]);

  const columns = [
    { key: "date", label: "Date" },
    { key: "eleve", label: "Élève" },
    { key: "classe", label: "Classe" },
    { key: "statut", label: "Statut" },
  ];

  return (
    <ReportShell
      title="Rapport des présences"
      loading={loading}
      rows={rows}
      columns={columns}
      onExportCSV={() => downloadCSV("presences.csv", toCSV(rows, columns))}
      filters={
        <>
          <div>
            <Label>Classe</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </>
      }
      extra={
        <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-sm">Présents : <strong>{stats.present}</strong></div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-sm">Absents : <strong>{stats.absent}</strong></div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 text-sm">Retards : <strong>{stats.retard}</strong></div>
          <div className="p-3 rounded-lg bg-muted text-sm">Taux présence : <strong>{stats.taux}%</strong></div>
        </div>
      }
    />
  );
}

/* ---------------- Finance ---------------- */
function FinanceReport() {
  const [revenues, setRevenues] = useState<Row[]>([]);
  const [expenses, setExpenses] = useState<Row[]>([]);
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: rev }, { data: exp }] = await Promise.all([
        supabase.from("revenues").select("amount,type,occurred_at,description")
          .gte("occurred_at", from).lte("occurred_at", to + "T23:59:59"),
        supabase.from("expenses").select("amount,type,occurred_at,description")
          .gte("occurred_at", from).lte("occurred_at", to + "T23:59:59"),
      ]);
      setRevenues((rev || []).map((r: any) => ({ date: r.occurred_at?.slice(0, 10), category: r.type, description: r.description, amount: r.amount })));
      setExpenses((exp || []).map((r: any) => ({ date: r.occurred_at?.slice(0, 10), category: r.type, description: r.description, amount: r.amount })));
      setLoading(false);
    })();
  }, [from, to]);

  const totalR = revenues.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalE = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const net = totalR - totalE;

  const rows = [
    ...revenues.map((r) => ({ ...r, sens: "Recette" })),
    ...expenses.map((r) => ({ ...r, sens: "Dépense" })),
  ].sort((a: any, b: any) => (a.date < b.date ? 1 : -1));

  const columns = [
    { key: "date", label: "Date" },
    { key: "sens", label: "Type" },
    { key: "category", label: "Catégorie" },
    { key: "description", label: "Description" },
    { key: "amount", label: "Montant", render: (v: number, r: Row) => (
      <span className={r.sens === "Recette" ? "text-emerald-600" : "text-red-600"}>
        {r.sens === "Recette" ? "+" : "−"} {fmtGNF(v)}
      </span>
    )},
  ];

  return (
    <ReportShell
      title="Rapport financier"
      loading={loading}
      rows={rows}
      columns={columns}
      onExportCSV={() =>
        downloadCSV("finance.csv", toCSV(rows, [
          { key: "date", label: "Date" },
          { key: "sens", label: "Type" },
          { key: "category", label: "Catégorie" },
          { key: "description", label: "Description" },
          { key: "amount", label: "Montant" },
        ]))
      }
      filters={
        <>
          <div><Label>Du</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Au</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </>
      }
      extra={
        <div className="mb-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-sm">Recettes : <strong>{fmtGNF(totalR)}</strong></div>
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-sm">Dépenses : <strong>{fmtGNF(totalE)}</strong></div>
          <div className={`p-3 rounded-lg text-sm ${net >= 0 ? "bg-emerald-50 dark:bg-emerald-950" : "bg-red-50 dark:bg-red-950"}`}>Résultat net : <strong>{fmtGNF(net)}</strong></div>
        </div>
      }
    />
  );
}

/* ---------------- Salaires ---------------- */
function SalairesReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [y, m] = month.split("-").map(Number);
      const { data, error } = await supabase
        .from("payslips")
        .select("period_year,period_month,base_salary,bonuses,advances,overtime_amount,deductions,net_pay,paid,employee_contracts(full_name,position)")
        .eq("period_year", y)
        .eq("period_month", m);
      if (error) toast.error(error.message);
      setRows(
        (data || []).map((p: any) => ({
          periode: `${String(p.period_month).padStart(2, "0")}/${p.period_year}`,
          employe: p.employee_contracts?.full_name ?? "—",
          poste: p.employee_contracts?.position ?? "—",
          base: p.base_salary,
          primes: p.bonuses,
          avances: p.advances,
          net: p.net_pay,
          statut: p.paid ? "Payé" : "En attente",
        })),
      );
      setLoading(false);
    })();
  }, [month]);

  const total = rows.reduce((s, r) => s + Number(r.net || 0), 0);

  const columns = [
    { key: "periode", label: "Période" },
    { key: "employe", label: "Employé" },
    { key: "poste", label: "Poste" },
    { key: "base", label: "Salaire base", render: (v: number) => fmtGNF(v) },
    { key: "primes", label: "Primes", render: (v: number) => fmtGNF(v) },
    { key: "avances", label: "Avances", render: (v: number) => fmtGNF(v) },
    { key: "net", label: "Net à payer", render: (v: number) => <strong>{fmtGNF(v)}</strong> },
    { key: "statut", label: "Statut" },
  ];

  return (
    <ReportShell
      title="Rapport de paie"
      loading={loading}
      rows={rows}
      columns={columns}
      onExportCSV={() => downloadCSV(`paie-${month}.csv`, toCSV(rows, columns))}
      filters={
        <div>
          <Label>Mois</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
      }
      extra={
        <div className="mb-3 p-3 rounded-lg bg-muted/50 text-sm">
          <strong>Masse salariale nette :</strong> {fmtGNF(total)}
        </div>
      }
    />
  );
}
