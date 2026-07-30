import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy, Mail, Save } from "lucide-react";
import { toast } from "sonner";
import { logActivity } from "@/lib/audit";

type Audience = "enseignants" | "custom";

export function EmailsPanel({ uid }: { uid: string | null }) {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<Audience>("enseignants");
  const [custom, setCustom] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const { data: teachers = [] } = useQuery({
    queryKey: ["teacher-emails"],
    queryFn: async () => {
      const { data } = await supabase.from("teachers").select("full_name, email").not("email", "is", null);
      return (data ?? []) as any[];
    },
    staleTime: 5 * 60_000,
  });

  const recipients = useMemo(() => {
    const list =
      audience === "enseignants"
        ? teachers.map((t: any) => t.email)
        : custom.split(/[\s,;\n]+/);
    return Array.from(new Set(list.map((e: string) => (e ?? "").trim()).filter((e) => /.+@.+\..+/.test(e))));
  }, [audience, teachers, custom]);

  const { data: history = [] } = useQuery({
    queryKey: ["email-campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("message_broadcasts")
        .select("id, subject, body, created_at")
        .eq("channel", "email")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as any[];
    },
  });

  function copyAddresses() {
    if (recipients.length === 0) return toast.error("Aucune adresse valide.");
    navigator.clipboard.writeText(recipients.join(", "));
    toast.success(`${recipients.length} adresse(s) copiée(s)`);
  }

  function openMailClient() {
    if (recipients.length === 0) return toast.error("Aucune adresse valide.");
    if (!subject.trim()) return toast.error("Le sujet est obligatoire.");
    const url = `mailto:?bcc=${encodeURIComponent(recipients.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank");
  }

  async function saveCampaign() {
    if (!uid) return toast.error("Session expirée.");
    if (!subject.trim() || !body.trim()) return toast.error("Sujet et message obligatoires.");
    const { error } = await supabase.from("message_broadcasts").insert({
      author_id: uid,
      subject: subject.trim(),
      body: body.trim(),
      channel: "email",
    } as any);
    if (error) return toast.error(error.message);
    void logActivity({ action: "send", entity_type: "email_campaign", entity_label: subject.trim() });
    toast.success("Campagne enregistrée dans l'historique");
    setSubject(""); setBody("");
    qc.invalidateQueries({ queryKey: ["email-campaigns"] });
    qc.invalidateQueries({ queryKey: ["broadcasts"] });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Nouvel email groupé</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Destinataires</Label>
              <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enseignants">Tous les enseignants</SelectItem>
                  <SelectItem value="custom">Liste personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="secondary">{recipients.length} adresse(s) valide(s)</Badge>
            </div>
          </div>

          {audience === "custom" && (
            <div>
              <Label className="mb-1.5 block">Adresses (séparées par virgule ou retour à la ligne)</Label>
              <Textarea rows={3} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="parent1@exemple.com, parent2@exemple.com" />
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">Sujet</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label className="mb-1.5 block">Message</Label>
            <Textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={openMailClient}><Mail className="size-4" /> Ouvrir dans la messagerie</Button>
            <Button variant="outline" className="gap-2" onClick={copyAddresses}><Copy className="size-4" /> Copier les adresses</Button>
            <Button variant="outline" className="gap-2" onClick={saveCampaign}><Save className="size-4" /> Enregistrer la campagne</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            L'envoi utilise votre logiciel de messagerie (copie cachée). Un envoi automatisé depuis l'application nécessite la
            configuration d'un domaine d'expédition.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Historique des campagnes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 && <p className="text-sm text-muted-foreground">Aucune campagne enregistrée.</p>}
          {history.map((h: any) => (
            <div key={h.id} className="border rounded-lg p-3">
              <div className="font-medium text-sm">{h.subject}</div>
              <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("fr-FR")}</div>
              <p className="text-xs mt-1 line-clamp-3 whitespace-pre-wrap">{h.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
