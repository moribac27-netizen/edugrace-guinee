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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Inbox, Send, Megaphone, MailPlus, Trash2, MailOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/messagerie")({
  head: () => ({ meta: [{ title: "Messagerie — MBGEduGuinée" }] }),
  component: MessageriePage,
});

type Attachment = { name: string; url: string };
type Msg = {
  id: string;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  attachments?: Attachment[];
};

type Broadcast = {
  id: string;
  subject: string;
  body: string;
  channel: string;
  target_role: string | null;
  target_class_id: string | null;
  created_at: string;
  author_id: string;
  classes?: { name: string } | null;
};


function MessageriePage() {
  const qc = useQueryClient();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const { data: profileMap = {} } = useQuery({
    queryKey: ["profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name");
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => { map[p.id] = p.full_name ?? "—"; });
      return map;
    },
  });

  const { data: inbox = [] } = useQuery({
    queryKey: ["messages", "inbox", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("recipient_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const { data: sent = [] } = useQuery({
    queryKey: ["messages", "sent", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", uid!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
  });

  const { data: broadcasts = [] } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_broadcasts")
        .select("*, classes(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Broadcast[];
    },
  });


  const unread = inbox.filter((m) => !m.read_at).length;

  async function markRead(id: string) {
    const { error } = await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", id);
    if (!error) qc.invalidateQueries({ queryKey: ["messages"] });
  }

  async function remove(id: string) {
    if (!confirm("Supprimer ce message ?")) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Message supprimé");
    qc.invalidateQueries({ queryKey: ["messages"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Centre de communication</h1>
          <p className="text-muted-foreground mt-1">Messages internes et diffusions vers votre communauté.</p>
        </div>
        <div className="flex gap-2">
          <NewMessageDialog uid={uid} />
          <NewBroadcastDialog uid={uid} />
        </div>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Inbox className="size-4" /> Boîte de réception
            {unread > 0 && <Badge className="ml-1">{unread}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2"><Send className="size-4" /> Envoyés</TabsTrigger>
          <TabsTrigger value="broadcasts" className="gap-2"><Megaphone className="size-4" /> Diffusions</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {inbox.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Aucun message reçu.</div>
              ) : (
                <ul className="divide-y">
                  {inbox.map((m) => (
                    <li key={m.id} className={"p-4 hover:bg-muted/40 " + (m.read_at ? "" : "bg-primary/5")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{m.subject}</span>
                            {!m.read_at && <Badge variant="secondary" className="text-xs">Nouveau</Badge>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            De {profileMap[m.sender_id] ?? "—"} · {new Date(m.created_at).toLocaleString("fr-FR")}
                          </div>
                          <p className="text-sm mt-2 whitespace-pre-wrap">{m.body}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {!m.read_at && (
                            <Button variant="ghost" size="icon" onClick={() => markRead(m.id)} title="Marquer lu">
                              <MailOpen className="size-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => remove(m.id)} title="Supprimer">
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {sent.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Aucun message envoyé.</div>
              ) : (
                <ul className="divide-y">
                  {sent.map((m) => (
                    <li key={m.id} className="p-4 hover:bg-muted/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">{m.subject}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            À {profileMap[m.recipient_id] ?? "—"} · {new Date(m.created_at).toLocaleString("fr-FR")}
                            {m.read_at && <span className="ml-2 text-success">· Lu</span>}
                          </div>
                          <p className="text-sm mt-2 whitespace-pre-wrap">{m.body}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => remove(m.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcasts" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {broadcasts.length === 0 && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Aucune diffusion.</CardContent></Card>
            )}
            {broadcasts.map((b) => (
              <Card key={b.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{b.subject}</CardTitle>
                    <Badge variant="outline">{b.channel}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
                    <span>{profileMap[b.author_id] ?? "—"}</span>
                    <span>·</span>
                    <span>{new Date(b.created_at).toLocaleString("fr-FR")}</span>
                    {b.target_role && <Badge variant="secondary" className="text-xs">Rôle: {b.target_role}</Badge>}
                    {b.classes?.name && <Badge variant="secondary" className="text-xs">Classe: {b.classes.name}</Badge>}
                    {!b.target_role && !b.classes?.name && <Badge variant="secondary" className="text-xs">Tous</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap">{b.body}</CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewMessageDialog({ uid }: { uid: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [q, setQ] = useState("");

  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => contacts.filter((c: any) => c.id !== uid && (c.full_name ?? "").toLowerCase().includes(q.toLowerCase())).slice(0, 50),
    [contacts, q, uid],
  );

  async function send() {
    if (!uid || !recipientId || !subject.trim() || !body.trim()) {
      toast.error("Destinataire, sujet et message requis");
      return;
    }
    const { error } = await supabase.from("messages").insert({
      sender_id: uid,
      recipient_id: recipientId,
      subject: subject.trim(),
      body: body.trim(),
    });
    if (error) return toast.error(error.message);
    toast.success("Message envoyé");
    setOpen(false);
    setRecipientId(""); setSubject(""); setBody(""); setQ("");
    qc.invalidateQueries({ queryKey: ["messages"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><MailPlus className="size-4" /> Nouveau message</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Envoyer un message</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Destinataire</Label>
            <Input placeholder="Rechercher un utilisateur..." value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="mt-2 max-h-40 overflow-auto border rounded-md divide-y">
              {filtered.map((c: any) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setRecipientId(c.id)}
                  className={"w-full text-left px-3 py-2 text-sm hover:bg-muted " + (recipientId === c.id ? "bg-primary/10" : "")}
                >
                  {c.full_name ?? "(sans nom)"}
                </button>
              ))}
              {filtered.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">Aucun contact</div>}
            </div>
          </div>
          <div>
            <Label>Sujet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={send}>Envoyer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewBroadcastDialog({ uid }: { uid: string | null }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("in_app");
  const [role, setRole] = useState<string>("all");
  const [classId, setClassId] = useState<string>("all");

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-list"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase.from("classes").select("id, name").order("name");
      return data ?? [];
    },
  });

  async function send() {
    if (!uid || !subject.trim() || !body.trim()) {
      toast.error("Sujet et message requis");
      return;
    }
    const { error } = await supabase.from("message_broadcasts").insert({
      author_id: uid,
      subject: subject.trim(),
      body: body.trim(),
      channel,
      target_role: role === "all" ? null : (role as any),
      target_class_id: classId === "all" ? null : classId,
    });
    if (error) return toast.error(error.message);
    toast.success("Diffusion publiée");
    setOpen(false);
    setSubject(""); setBody(""); setChannel("in_app"); setRole("all"); setClassId("all");
    qc.invalidateQueries({ queryKey: ["broadcasts"] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Megaphone className="size-4" /> Nouvelle diffusion</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nouvelle diffusion</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Sujet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Canal</Label>
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">Application</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rôle cible</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="parent">Parents</SelectItem>
                  <SelectItem value="eleve">Élèves</SelectItem>
                  <SelectItem value="enseignant">Enseignants</SelectItem>
                  <SelectItem value="directeur">Directeurs</SelectItem>
                  <SelectItem value="comptable">Comptables</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Classe</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  {classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Les canaux Email et SMS enregistrent la diffusion ; l'envoi externe nécessitera une intégration dédiée.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={send}>Publier</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
