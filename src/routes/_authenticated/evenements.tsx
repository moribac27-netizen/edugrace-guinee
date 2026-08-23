import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { canPublishEvents } from "@/lib/access";
import { getSchoolId } from "@/lib/school";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarDays, MapPin, Plus, Pencil, Trash2, Globe2, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/evenements")({
  head: () => ({
    meta: [
      { title: "Événements des écoles — MBGEduGuinée" },
      { name: "description", content: "Espace partagé où chaque établissement publie ses événements et découvre ceux des autres écoles de la plateforme." },
      { property: "og:title", content: "Événements des écoles — MBGEduGuinée" },
      { property: "og:description", content: "Espace partagé des événements scolaires entre établissements." },
    ],
  }),
  component: EvenementsPage,
});

const EVENT_TYPES = [
  { v: "ceremonie", l: "Cérémonie" },
  { v: "competition", l: "Compétition" },
  { v: "journee_portes_ouvertes", l: "Portes ouvertes" },
  { v: "conference", l: "Conférence" },
  { v: "sortie", l: "Sortie / Excursion" },
  { v: "examen", l: "Examen" },
  { v: "autre", l: "Autre" },
];

const emptyForm = {
  id: "",
  title: "",
  description: "",
  event_type: "autre",
  starts_at: "",
  ends_at: "",
  location: "",
  contact: "",
  published: true,
  image_url: "" as string | null,
};

function EvenementsPage() {
  const qc = useQueryClient();
  const { roles } = useRoles();
  const { isSuperAdmin } = useSuperAdmin();
  const canPublish = canPublishEvents(roles, isSuperAdmin);

  const [scope, setScope] = useState<"all" | "mine">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const { data: mySchoolId } = useQuery({ queryKey: ["my-school-id"], queryFn: () => getSchoolId() });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["school-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_events")
        .select("*, schools(name, city, logo_url)")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const visible = useMemo(
    () => (scope === "mine" ? events.filter((e: any) => e.school_id === mySchoolId) : events),
    [events, scope, mySchoolId],
  );

  function openCreate() {
    setForm({ ...emptyForm });
    setFile(null);
    setOpen(true);
  }

  function openEdit(e: any) {
    setForm({
      id: e.id,
      title: e.title ?? "",
      description: e.description ?? "",
      event_type: e.event_type ?? "autre",
      starts_at: e.starts_at ? new Date(e.starts_at).toISOString().slice(0, 16) : "",
      ends_at: e.ends_at ? new Date(e.ends_at).toISOString().slice(0, 16) : "",
      location: e.location ?? "",
      contact: e.contact ?? "",
      published: !!e.published,
      image_url: e.image_url ?? "",
    });
    setFile(null);
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim()) return toast.error("Le titre est obligatoire");
    if (!form.starts_at) return toast.error("La date de l'événement est obligatoire");
    setSaving(true);
    try {
      const schoolId = await getSchoolId();
      if (!schoolId) throw new Error("Établissement introuvable");

      let imagePath = form.image_url || null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${schoolId}/events/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("school-assets").upload(path, file, { upsert: true });
        if (upErr) throw upErr;
        imagePath = path;
      }

      const payload = {
        school_id: schoolId,
        title: form.title.trim(),
        description: form.description || null,
        event_type: form.event_type,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        location: form.location || null,
        contact: form.contact || null,
        published: form.published,
        image_url: imagePath,
      };

      const { error } = form.id
        ? await supabase.from("school_events").update(payload).eq("id", form.id)
        : await supabase.from("school_events").insert(payload as any);
      if (error) throw error;

      toast.success(form.id ? "Événement mis à jour" : "Événement publié");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["school-events"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("school_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Événement supprimé");
    qc.invalidateQueries({ queryKey: ["school-events"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Globe2 className="size-7" /> Événements des écoles
          </h1>
          <p className="text-muted-foreground mt-1">
            Espace partagé : publiez les événements de votre établissement et découvrez ceux des autres écoles.
          </p>
        </div>
        {canPublish && (
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="size-4" /> Publier un événement
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant={scope === "all" ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setScope("all")}>
          <Globe2 className="size-4" /> Toutes les écoles
        </Button>
        <Button variant={scope === "mine" ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setScope("mine")}>
          <Building2 className="size-4" /> Mon école
        </Button>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : visible.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">Aucun événement pour le moment.</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((e: any) => (
            <EventCard
              key={e.id}
              event={e}
              owned={e.school_id === mySchoolId && canPublish}
              onEdit={() => openEdit(e)}
              onDelete={() => remove(e.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Modifier l'événement" : "Publier un événement"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(ev) => setForm({ ...form, title: ev.target.value })} placeholder="Journée culturelle" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={form.description} onChange={(ev) => setForm({ ...form, description: ev.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lieu</Label>
                <Input value={form.location} onChange={(ev) => setForm({ ...form, location: ev.target.value })} />
              </div>
              <div>
                <Label>Début *</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(ev) => setForm({ ...form, starts_at: ev.target.value })} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(ev) => setForm({ ...form, ends_at: ev.target.value })} />
              </div>
            </div>
            <div>
              <Label>Contact</Label>
              <Input value={form.contact} onChange={(ev) => setForm({ ...form, contact: ev.target.value })} placeholder="Téléphone ou e-mail" />
            </div>
            <div>
              <Label>Image (optionnelle)</Label>
              <Input type="file" accept="image/*" onChange={(ev) => setFile(ev.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event, owned, onEdit, onDelete }: { event: any; owned: boolean; onEdit: () => void; onDelete: () => void }) {
  const img = useSignedUrl(event.image_url);
  const type = EVENT_TYPES.find((t) => t.v === event.event_type)?.l ?? event.event_type;
  return (
    <Card className="overflow-hidden flex flex-col">
      {img && <img src={img} alt={event.title} className="h-40 w-full object-cover" loading="lazy" />}
      <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="secondary">{type}</Badge>
          {owned && <Badge>Mon école</Badge>}
        </div>
        <h2 className="font-semibold leading-tight">{event.title}</h2>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <CalendarDays className="size-3.5" />
          {new Date(event.starts_at).toLocaleString("fr-FR")}
        </div>
        {event.location && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="size-3.5" /> {event.location}
          </div>
        )}
        {event.description && <p className="text-sm text-muted-foreground line-clamp-4">{event.description}</p>}
        <div className="mt-auto pt-2 border-t text-xs text-muted-foreground flex items-center justify-between gap-2">
          <span className="truncate">{event.schools?.name ?? "École"}{event.schools?.city ? ` · ${event.schools.city}` : ""}</span>
          {owned && (
            <span className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}><Pencil className="size-3.5" /></Button>
              <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={onDelete}><Trash2 className="size-3.5" /></Button>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
