import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Plan = {
  id: string; code: string; name: string; description: string | null;
  price_monthly: number; price_yearly: number; currency: string;
  student_limit: number | null; features: string[];
  is_popular: boolean; is_active: boolean; display_order: number;
};

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [{ title: "Gestion des offres — MBGEduGuinée" }] }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: sa } = await supabase.from("super_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (!sa) throw redirect({ to: "/dashboard" });
  },
  component: PlansAdmin,
});

const empty: Plan = {
  id: "", code: "", name: "", description: "",
  price_monthly: 0, price_yearly: 0, currency: "GNF",
  student_limit: null, features: [], is_popular: false, is_active: true, display_order: 0,
};

function PlansAdmin() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Plan>(empty);
  const [featuresText, setFeaturesText] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).from("subscription_plans").select("*").order("display_order");
    setPlans((data ?? []).map((p: any) => ({ ...p, features: Array.isArray(p.features) ? p.features : [] })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setForm({ ...empty, display_order: plans.length + 1 });
    setFeaturesText("");
    setOpen(true);
  }
  function openEdit(p: Plan) {
    setForm(p);
    setFeaturesText(p.features.join("\n"));
    setOpen(true);
  }

  async function save() {
    const features = featuresText.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = { ...form, features, student_limit: form.student_limit || null };
    const { id, ...rest } = payload;
    let error;
    if (id) {
      ({ error } = await (supabase as any).from("subscription_plans").update(rest).eq("id", id));
    } else {
      ({ error } = await (supabase as any).from("subscription_plans").insert(rest));
    }
    if (error) return toast.error(error.message);
    toast.success("Offre enregistrée");
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette offre ?")) return;
    const { error } = await (supabase as any).from("subscription_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Offre supprimée");
    load();
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Offres d'abonnement</h1>
          <p className="text-muted-foreground mt-1">Modifiez les prix, limites, fonctionnalités et descriptions sans toucher au code.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="size-4 mr-1" />Nouvelle offre</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{form.id ? "Modifier l'offre" : "Nouvelle offre"}</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="basic" /></div>
              <div><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Description</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Prix mensuel</Label><Input type="number" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: Number(e.target.value) })} /></div>
              <div><Label>Prix annuel</Label><Input type="number" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: Number(e.target.value) })} /></div>
              <div><Label>Devise</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
              <div><Label>Limite d'élèves (vide = illimité)</Label><Input type="number" value={form.student_limit ?? ""} onChange={(e) => setForm({ ...form, student_limit: e.target.value ? Number(e.target.value) : null })} /></div>
              <div><Label>Ordre d'affichage</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.is_popular} onCheckedChange={(v) => setForm({ ...form, is_popular: v })} /><Label>Recommandé</Label></div>
              <div className="flex items-center gap-3 pt-6"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Actif</Label></div>
              <div className="sm:col-span-2">
                <Label>Fonctionnalités (une par ligne)</Label>
                <textarea
                  className="w-full min-h-32 rounded-md border bg-background p-2 text-sm"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  placeholder={"Jusqu'à 200 élèves\nGestion élèves & classes\n..."}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={save}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Catalogue</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 animate-pulse bg-muted rounded" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Prix / mois</TableHead>
                  <TableHead>Élèves max</TableHead>
                  <TableHead>Fonctionnalités</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name} {p.is_popular && <Badge className="ml-2">Recommandé</Badge>}</TableCell>
                    <TableCell>{new Intl.NumberFormat("fr-FR").format(p.price_monthly)} {p.currency}</TableCell>
                    <TableCell>{p.student_limit ?? "Illimité"}</TableCell>
                    <TableCell>{p.features.length}</TableCell>
                    <TableCell>{p.is_active ? <Badge variant="default">Actif</Badge> : <Badge variant="secondary">Inactif</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="size-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {plans.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucune offre.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
