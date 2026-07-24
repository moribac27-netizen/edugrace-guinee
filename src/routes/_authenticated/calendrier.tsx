import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CalendarDays, Plus, MapPin, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useRoles, primaryRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/calendrier")({
  head: () => ({ meta: [{ title: "Calendrier scolaire — MBGEduGuinée" }] }),
  component: CalendrierPage,
});

type Ev = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  class_id: string | null;
  visible_roles: string[];
  color: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  event: "Événement",
  exam: "Examen",
  holiday: "Congé",
  meeting: "Réunion",
  deadline: "Échéance",
};

const TYPE_COLOR: Record<string, string> = {
  event: "bg-primary/10 text-primary border-primary/30",
  exam: "bg-destructive/10 text-destructive border-destructive/30",
  holiday: "bg-success/10 text-success border-success/30",
  meeting: "bg-accent/10 text-accent border-accent/30",
  deadline: "bg-warning/10 text-warning border-warning/30",
};

function CalendrierPage() {
  const qc = useQueryClient();
  const { roles } = useRoles();
  const role = primaryRole(roles);
  const canEdit = ["admin", "directeur"].includes(role ?? "");
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const monthStart = new Date(cursor);
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", cursor.toISOString().slice(0, 7)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .gte("starts_at", monthStart.toISOString())
        .lte("starts_at", monthEnd.toISOString())
        .order("starts_at");
      if (error) throw error;
      return (data ?? []) as Ev[];
    },
  });

  // Realtime : rafraîchir dès qu'un événement change
  useEffect(() => {
    const ch = supabase
      .channel("calendar-events-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" },
        () => qc.invalidateQueries({ queryKey: ["calendar-events"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const days = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const eventsByDay = useMemo(() => {
    const map = new Map<string, Ev[]>();
    for (const e of events) {
      const k = new Date(e.starts_at).toDateString();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [events]);

  async function remove(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Événement supprimé");
    qc.invalidateQueries({ queryKey: ["calendar-events"] });
  }

  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const upcoming = events.filter((e) => new Date(e.starts_at) >= new Date()).slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="size-7 text-primary" /> Calendrier scolaire
          </h1>
          <p className="text-muted-foreground mt-1">Événements, examens et échéances de votre école.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="min-w-40 text-center font-medium capitalize">{monthLabel}</div>
          <Button variant="outline" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="size-4" />
          </Button>
          {canEdit && <NewEventDialog onCreated={() => qc.invalidateQueries({ queryKey: ["calendar-events"] })} />}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-7 text-xs font-medium text-muted-foreground mb-2">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="px-2 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d, i) => {
                const isCurMonth = d.getMonth() === cursor.getMonth();
                const isToday = d.toDateString() === new Date().toDateString();
                const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
                return (
                  <div
                    key={i}
                    className={
                      "min-h-24 rounded-md border p-1.5 text-xs flex flex-col gap-1 " +
                      (isCurMonth ? "bg-card" : "bg-muted/30 text-muted-foreground") +
                      (isToday ? " ring-2 ring-primary" : "")
                    }
                  >
                    <div className="font-medium">{d.getDate()}</div>
                    {dayEvents.slice(0, 3).map((e) => (
                      <div
                        key={e.id}
                        className={"truncate rounded px-1 py-0.5 border " + (TYPE_COLOR[e.event_type] ?? TYPE_COLOR.event)}
                        title={e.title}
                      >
                        {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-muted-foreground">+{dayEvents.length - 3}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Prochains événements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && <div className="text-sm text-muted-foreground">Aucun événement à venir.</div>}
            {upcoming.map((e) => (
              <div key={e.id} className="p-3 rounded-md border space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm">{e.title}</div>
                  <Badge variant="outline" className={"text-[10px] " + (TYPE_COLOR[e.event_type] ?? "")}>
                    {TYPE_LABEL[e.event_type] ?? e.event_type}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.starts_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: e.all_day ? undefined : "short" })}
                </div>
                {e.location && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" /> {e.location}
                  </div>
                )}
                {canEdit && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => remove(e.id)}>
                    <Trash2 className="size-3" /> Supprimer
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function buildMonthGrid(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7; // lundi=0
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

const ROLES = ["admin", "directeur", "enseignant", "parent", "eleve", "comptable"];

function NewEventDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("event");
  const [startsAt, setStartsAt] = useState(new Date(Date.now() + 3600_000).toISOString().slice(0, 16));
  const [endsAt, setEndsAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [classId, setClassId] = useState<string>("all");
  const [visRoles, setVisRoles] = useState<string[]>(ROLES);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-list-cal"],
    enabled: open,
    queryFn: async () => (await supabase.from("classes").select("id, name").order("name")).data ?? [],
  });

  async function save() {
    if (!title.trim()) return toast.error("Titre requis");
    const { data: prof } = await supabase.from("profiles").select("school_id").eq("id", (await supabase.auth.getUser()).data.user!.id).single();
    if (!prof?.school_id) return toast.error("École introuvable");
    const { error } = await supabase.from("calendar_events").insert({
      school_id: prof.school_id,
      title: title.trim(),
      description: description.trim() || null,
      event_type: type,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      all_day: allDay,
      location: location.trim() || null,
      class_id: classId === "all" ? null : classId,
      visible_roles: visRoles.length > 0 ? visRoles : ROLES,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Événement créé — notifications envoyées");
    setOpen(false);
    setTitle(""); setDescription(""); setLocation(""); setType("event");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="size-4" /> Nouvel événement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nouvel événement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classe (optionnel)</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toute l'école</SelectItem>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Début</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Fin (optionnel)</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="allday" checked={allDay} onCheckedChange={(c) => setAllDay(c === true)} />
            <Label htmlFor="allday">Toute la journée</Label>
          </div>
          <div>
            <Label>Lieu</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Visible par</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={visRoles.includes(r)}
                    onCheckedChange={(c) => {
                      setVisRoles((prev) => (c === true ? [...prev, r] : prev.filter((x) => x !== r)));
                    }}
                  />
                  <span className="capitalize">{r}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={save}>Créer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
