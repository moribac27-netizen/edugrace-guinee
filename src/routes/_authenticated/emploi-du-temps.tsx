import { Fragment } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Printer, DoorOpen, CalendarDays, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/emploi-du-temps")({
  head: () => ({ meta: [{ title: "Emploi du temps — MBGEduGuinée" }] }),
  component: SchedulePage,
});

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 08h → 18h

function t(hhmm: string) { return hhmm.slice(0, 5); }
function overlaps(aS: string, aE: string, bS: string, bE: string) {
  return aS < bE && bS < aE;
}

function SchedulePage() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState<string>("");
  const [openSlot, setOpenSlot] = useState(false);
  const [openRoom, setOpenRoom] = useState(false);
  const [slot, setSlot] = useState({
    class_id: "", subject_id: "", teacher_id: "", room_id: "",
    day_of_week: 1, start_time: "08:00", end_time: "09:00",
  });
  const [room, setRoom] = useState({ name: "", capacity: 30, building: "" });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-lite"],
    queryFn: async () => (await supabase.from("classes").select("id,name,level").order("name")).data ?? [],
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-lite"],
    queryFn: async () => (await supabase.from("subjects").select("id,name").order("name")).data ?? [],
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers-lite"],
    queryFn: async () => (await supabase.from("teachers").select("id,full_name").order("full_name")).data ?? [],
  });
  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => (await supabase.from("rooms").select("*").order("name")).data ?? [],
  });
  const { data: slots = [] } = useQuery({
    queryKey: ["slots"],
    queryFn: async () => (await supabase.from("schedule_slots").select("*")).data ?? [],
  });

  const activeClassId = classId || classes[0]?.id || "";
  const classSlots = useMemo(
    () => (slots as any[]).filter((s) => s.class_id === activeClassId),
    [slots, activeClassId],
  );

  const conflicts = useMemo(() => {
    const list: string[] = [];
    const all = slots as any[];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        if (a.day_of_week !== b.day_of_week) continue;
        if (!overlaps(a.start_time, a.end_time, b.start_time, b.end_time)) continue;
        if (a.teacher_id && a.teacher_id === b.teacher_id) list.push(`Enseignant en double – ${DAYS[a.day_of_week - 1]} ${t(a.start_time)}`);
        if (a.room_id && a.room_id === b.room_id) list.push(`Salle en double – ${DAYS[a.day_of_week - 1]} ${t(a.start_time)}`);
        if (a.class_id === b.class_id) list.push(`Classe en double – ${DAYS[a.day_of_week - 1]} ${t(a.start_time)}`);
      }
    }
    return Array.from(new Set(list));
  }, [slots]);

  async function submitSlot(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...slot, class_id: slot.class_id || activeClassId };
    if (!payload.class_id) return toast.error("Sélectionnez une classe");
    // check conflict
    const all = slots as any[];
    const conflict = all.find((s) =>
      s.day_of_week === payload.day_of_week &&
      overlaps(s.start_time, s.end_time, payload.start_time, payload.end_time) &&
      (s.class_id === payload.class_id ||
        (payload.teacher_id && s.teacher_id === payload.teacher_id) ||
        (payload.room_id && s.room_id === payload.room_id)),
    );
    if (conflict) return toast.error("Conflit détecté avec un créneau existant");
    const { error } = await supabase.from("schedule_slots").insert({
      class_id: payload.class_id,
      subject_id: payload.subject_id || null,
      teacher_id: payload.teacher_id || null,
      room_id: payload.room_id || null,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      end_time: payload.end_time,
    });
    if (error) return toast.error(error.message);
    toast.success("Créneau ajouté");
    setOpenSlot(false);
    qc.invalidateQueries({ queryKey: ["slots"] });
  }

  async function deleteSlot(id: string) {
    if (!confirm("Supprimer ce créneau ?")) return;
    const { error } = await supabase.from("schedule_slots").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["slots"] });
  }

  async function submitRoom(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("rooms").insert(room);
    if (error) return toast.error(error.message);
    toast.success("Salle créée");
    setOpenRoom(false);
    setRoom({ name: "", capacity: 30, building: "" });
    qc.invalidateQueries({ queryKey: ["rooms"] });
  }

  async function deleteRoom(id: string) {
    if (!confirm("Supprimer cette salle ?")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["rooms"] });
  }

  const subjectById = new Map((subjects as any[]).map((s) => [s.id, s]));
  const teacherById = new Map((teachers as any[]).map((s) => [s.id, s]));
  const roomById = new Map((rooms as any[]).map((s) => [s.id, s]));
  const classById = new Map((classes as any[]).map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <style>{`@media print { .no-print{display:none!important} @page{size:A4 landscape;margin:10mm} body{background:#fff} }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h1 className="font-display text-3xl font-bold">Emploi du temps</h1>
          <p className="text-muted-foreground mt-1">Horaires, salles, enseignants</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="size-4" />Imprimer PDF</Button>
        </div>
      </div>

      {conflicts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 no-print">
          <CardContent className="p-4 flex gap-3">
            <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-destructive mb-1">{conflicts.length} conflit(s) détecté(s)</div>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {conflicts.slice(0, 5).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="no-print">
          <TabsTrigger value="grid" className="gap-2"><CalendarDays className="size-4" />Grille</TabsTrigger>
          <TabsTrigger value="rooms" className="gap-2"><DoorOpen className="size-4" />Salles</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end no-print">
            <div className="min-w-[220px]">
              <Label>Classe</Label>
              <Select value={activeClassId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
                <SelectContent>
                  {(classes as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.level}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={openSlot} onOpenChange={setOpenSlot}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Ajouter un créneau</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nouveau créneau</DialogTitle></DialogHeader>
                <form onSubmit={submitSlot} className="space-y-3">
                  <div>
                    <Label>Classe</Label>
                    <Select value={slot.class_id || activeClassId} onValueChange={(v) => setSlot({ ...slot, class_id: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{(classes as any[]).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Jour</Label>
                      <Select value={String(slot.day_of_week)} onValueChange={(v) => setSlot({ ...slot, day_of_week: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{DAYS.map((d, i) => <SelectItem key={d} value={String(i + 1)}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Matière</Label>
                      <Select value={slot.subject_id} onValueChange={(v) => setSlot({ ...slot, subject_id: v })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{(subjects as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Début</Label><Input type="time" value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} required /></div>
                    <div><Label>Fin</Label><Input type="time" value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} required /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Enseignant</Label>
                      <Select value={slot.teacher_id} onValueChange={(v) => setSlot({ ...slot, teacher_id: v })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{(teachers as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Salle</Label>
                      <Select value={slot.room_id} onValueChange={(v) => setSlot({ ...slot, room_id: v })}>
                        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{(rooms as any[]).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter><Button type="submit">Ajouter</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {classById.get(activeClassId)?.name ?? "—"} · {classSlots.length} créneaux
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-auto">
              <div className="min-w-[900px] grid" style={{ gridTemplateColumns: `70px repeat(${DAYS.length}, 1fr)` }}>
                <div className="border-b border-r p-2 text-xs font-medium text-muted-foreground bg-muted/40">Heure</div>
                {DAYS.map((d) => (
                  <div key={d} className="border-b p-2 text-xs font-medium text-center bg-muted/40">{d}</div>
                ))}
                {HOURS.map((h) => (
                  <Fragment key={`row-${h}`}>

                    <div key={`h-${h}`} className="border-r border-b p-2 text-xs text-muted-foreground text-right">{String(h).padStart(2, "0")}h</div>
                    {DAYS.map((_, di) => {
                      const day = di + 1;
                      const cell = classSlots.filter((s: any) => {
                        const sh = Number(s.start_time.slice(0, 2));
                        return s.day_of_week === day && sh === h;
                      });
                      return (
                        <div key={`c-${h}-${di}`} className="border-b border-r/0 min-h-[56px] p-1 space-y-1">
                          {cell.map((s: any) => (
                            <div key={s.id} className="rounded-md bg-primary/10 border border-primary/20 p-1.5 text-[11px] leading-tight">
                              <div className="font-medium truncate">{subjectById.get(s.subject_id)?.name ?? "Matière"}</div>
                              <div className="text-muted-foreground truncate">{t(s.start_time)}–{t(s.end_time)}</div>
                              <div className="text-muted-foreground truncate">{teacherById.get(s.teacher_id)?.full_name ?? ""}</div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground truncate">{roomById.get(s.room_id)?.name ?? ""}</span>
                                <button className="no-print text-destructive" onClick={() => deleteSlot(s.id)}><Trash2 className="size-3" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rooms" className="space-y-4">
          <div className="flex justify-end no-print">
            <Dialog open={openRoom} onOpenChange={setOpenRoom}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="size-4" />Nouvelle salle</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Créer une salle</DialogTitle></DialogHeader>
                <form onSubmit={submitRoom} className="space-y-3">
                  <div><Label>Nom</Label><Input required value={room.name} onChange={(e) => setRoom({ ...room, name: e.target.value })} placeholder="ex. Salle 12" /></div>
                  <div><Label>Bâtiment</Label><Input value={room.building} onChange={(e) => setRoom({ ...room, building: e.target.value })} /></div>
                  <div><Label>Capacité</Label><Input type="number" value={room.capacity} onChange={(e) => setRoom({ ...room, capacity: Number(e.target.value) })} /></div>
                  <DialogFooter><Button type="submit">Créer</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(rooms as any[]).map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-sm text-muted-foreground">{r.building || "—"} · {r.capacity} places</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteRoom(r.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
            {rooms.length === 0 && <div className="text-sm text-muted-foreground">Aucune salle. Créez-en une pour commencer.</div>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
