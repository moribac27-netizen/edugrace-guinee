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
import { Plus, BookOpen, Undo2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/bibliotheque")({
  head: () => ({ meta: [{ title: "Bibliothèque — MBGEduGuinée" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const qc = useQueryClient();

  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: async () => (await supabase.from("library_books").select("*, library_categories(name)").order("title")).data ?? [],
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["book-cats"],
    queryFn: async () => (await supabase.from("library_categories").select("*").order("name")).data ?? [],
  });
  const { data: loans = [] } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => (await supabase.from("library_loans").select("*, library_books(title)").order("loan_date", { ascending: false })).data ?? [],
  });

  const active = useMemo(() => (loans as any[]).filter((l) => !l.return_date), [loans]);
  const overdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return active.filter((l: any) => l.due_date < today);
  }, [active]);

  async function returnBook(loan: any) {
    const today = new Date().toISOString().slice(0, 10);
    const days = Math.max(0, Math.round((new Date(today).getTime() - new Date(loan.due_date).getTime()) / 86400000));
    const penalty = days * 5000;
    const { error } = await supabase.from("library_loans").update({ return_date: today, penalty }).eq("id", loan.id);
    if (error) return toast.error(error.message);
    if (error) return toast.error(error.message);
    const book = (books as any[]).find((b) => b.id === loan.book_id);
    if (book) await supabase.from("library_books").update({ available_copies: book.available_copies + 1 }).eq("id", book.id);
    toast.success(penalty > 0 ? `Retour enregistré. Pénalité : ${penalty} GNF` : "Retour enregistré");
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["books"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Bibliothèque</h1>
          <p className="text-muted-foreground mt-1">{books.length} livres · {active.length} emprunts en cours · {overdue.length} en retard</p>
        </div>
      </div>

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Livres</TabsTrigger>
          <TabsTrigger value="loans">Emprunts</TabsTrigger>
          <TabsTrigger value="categories">Catégories</TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="space-y-4">
          <div className="flex justify-end"><BookDialog categories={categories} onSaved={() => qc.invalidateQueries({ queryKey: ["books"] })} /></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Titre</TableHead><TableHead>Auteur</TableHead><TableHead>Catégorie</TableHead><TableHead>ISBN</TableHead><TableHead className="text-center">Disponibles</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(books as any[]).map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.title}</TableCell>
                    <TableCell>{b.author}</TableCell>
                    <TableCell>{b.library_categories?.name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{b.isbn}</TableCell>
                    <TableCell className="text-center"><Badge variant={b.available_copies > 0 ? "default" : "secondary"}>{b.available_copies}/{b.total_copies}</Badge></TableCell>
                    <TableCell><LoanDialog book={b} onSaved={() => { qc.invalidateQueries({ queryKey: ["loans"] }); qc.invalidateQueries({ queryKey: ["books"] }); }} /></TableCell>
                  </TableRow>
                ))}
                {books.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucun livre.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="loans">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Livre</TableHead><TableHead>Emprunteur</TableHead><TableHead>Date emprunt</TableHead><TableHead>À rendre le</TableHead><TableHead>Retour</TableHead><TableHead>Pénalité</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {(loans as any[]).map((l) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const late = !l.return_date && l.due_date < today;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.library_books?.title}</TableCell>
                      <TableCell>{l.borrower_name}</TableCell>
                      <TableCell>{new Date(l.loan_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className={late ? "text-destructive font-medium" : ""}>{new Date(l.due_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>{l.return_date ? new Date(l.return_date).toLocaleDateString("fr-FR") : <Badge variant={late ? "destructive" : "outline"}>{late ? "En retard" : "En cours"}</Badge>}</TableCell>
                      <TableCell>{Number(l.penalty) > 0 ? `${Number(l.penalty).toLocaleString("fr-FR")} GNF` : "—"}</TableCell>
                      <TableCell>{!l.return_date && <Button size="sm" variant="outline" onClick={() => returnBook(l)} className="gap-1"><Undo2 className="size-3.5" />Retour</Button>}</TableCell>
                    </TableRow>
                  );
                })}
                {loans.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun emprunt.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end"><CategoryDialog onSaved={() => qc.invalidateQueries({ queryKey: ["book-cats"] })} /></div>
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className="text-right">Livres</TableHead></TableRow></TableHeader>
              <TableBody>
                {(categories as any[]).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right">{(books as any[]).filter((b) => b.category_id === c.id).length}</TableCell>
                  </TableRow>
                ))}
                {categories.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Aucune catégorie.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookDialog({ categories, onSaved }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", author: "", isbn: "", category_id: "", total_copies: 1 });
  async function save() {
    if (!form.title) return toast.error("Titre requis");
    const payload = { ...form, category_id: form.category_id || null, available_copies: form.total_copies };
    const { error } = await supabase.from("library_books").insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success("Livre ajouté"); setOpen(false); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Ajouter un livre</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouveau livre</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Titre</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Auteur</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></div>
            <div><Label>ISBN</Label><Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Catégorie</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Exemplaires</Label><Input type="number" min={1} value={form.total_copies} onChange={(e) => setForm({ ...form, total_copies: Number(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Ajouter</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoanDialog({ book, onSaved }: any) {
  const [open, setOpen] = useState(false);
  const due = new Date(); due.setDate(due.getDate() + 14);
  const [form, setForm] = useState<any>({ borrower_name: "", loan_date: new Date().toISOString().slice(0, 10), due_date: due.toISOString().slice(0, 10) });
  async function save() {
    if (book.available_copies < 1) return toast.error("Aucun exemplaire disponible");
    if (!form.borrower_name) return toast.error("Nom de l'emprunteur requis");
    const { error } = await supabase.from("library_loans").insert({ ...form, book_id: book.id } as any);
    if (error) return toast.error(error.message);
    await supabase.from("library_books").update({ available_copies: book.available_copies - 1 }).eq("id", book.id);
    toast.success("Emprunt enregistré"); setOpen(false); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline" disabled={book.available_copies < 1} className="gap-1"><BookOpen className="size-3.5" />Emprunter</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Emprunter : {book.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Emprunteur</Label><Input value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} placeholder="Nom complet" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date emprunt</Label><Input type="date" value={form.loan_date} onChange={(e) => setForm({ ...form, loan_date: e.target.value })} /></div>
            <div><Label>À rendre le</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Emprunter</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ onSaved }: any) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  async function save() {
    if (!name) return;
    const { error } = await supabase.from("library_categories").insert({ name } as any);
    if (error) return toast.error(error.message);
    toast.success("Catégorie créée"); setName(""); setOpen(false); onSaved();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Nouvelle catégorie</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvelle catégorie</DialogTitle></DialogHeader>
        <div><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <DialogFooter><Button onClick={save}>Créer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
