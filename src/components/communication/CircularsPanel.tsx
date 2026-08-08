import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CrudSection } from "@/components/CrudSection";
import { useClassOptions } from "@/hooks/useOptions";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/reports";

const ROLES = ["admin", "directeur", "enseignant", "surveillant", "comptable", "parent", "eleve"];

export function CircularsPanel({ uid }: { uid: string | null }) {
  const { options: classOptions } = useClassOptions();

  const { data: reads = [] } = useQuery({
    queryKey: ["circular-reads"],
    queryFn: async () => {
      const { data } = await supabase.from("circular_reads").select("circular_id");
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });
  const readCount = (id: string) => reads.filter((r: any) => r.circular_id === id).length;

  return (
    <CrudSection
      table="circulars"
      title="Circulaires"
      singular="Circulaire"
      queryKey={["circulars"]}
      select="*, classes(name)"
      orderBy={{ column: "published_at", ascending: false }}
      searchKeys={["title", "reference", "content"]}
      extraInsert={uid ? { author_id: uid } : undefined}
      fields={[
        { name: "title", label: "Titre", required: true, full: true },
        { name: "reference", label: "Référence", placeholder: "Ex. CIRC-2026-001" },
        { name: "published_at", label: "Date de publication", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
        { name: "content", label: "Contenu", type: "textarea", required: true },
        {
          name: "target_roles",
          label: "Rôles ciblés",
          help: "Séparés par une virgule. Laisser vide pour cibler tout le monde.",
          full: true,
          placeholder: ROLES.join(", "),
          serialize: (v: any) => (Array.isArray(v) ? v.join(", ") : ""),
          parse: (v: any) =>
            String(v ?? "")
              .split(",")
              .map((s) => s.trim().toLowerCase())
              .filter((s) => ROLES.includes(s)),
        },
        { name: "target_class_id", label: "Classe ciblée", type: "select", options: classOptions },
        { name: "attachment_url", label: "Pièce jointe (URL)", full: true },
        { name: "published", label: "Publier immédiatement", type: "checkbox", default: true },
      ]}
      columns={[
        { key: "published_at", label: "Date", render: (r) => fmtDate(r.published_at), exportFormat: (r) => fmtDate(r.published_at) },
        { key: "reference", label: "Réf." },
        { key: "title", label: "Titre" },
        {
          key: "target_roles",
          label: "Cibles",
          render: (r) => (
            <div className="flex flex-wrap gap-1">
              {(r.target_roles ?? []).length === 0 && <Badge variant="secondary">Tous</Badge>}
              {(r.target_roles ?? []).map((x: string) => <Badge key={x} variant="secondary">{x}</Badge>)}
              {r.classes?.name && <Badge variant="outline">{r.classes.name}</Badge>}
            </div>
          ),
          exportFormat: (r) => ((r.target_roles ?? []).join(", ") || "Tous") + (r.classes?.name ? ` / ${r.classes.name}` : ""),
        },
        { key: "reads", label: "Accusés de lecture", render: (r) => readCount(r.id), exportFormat: (r) => readCount(r.id) },
        {
          key: "published",
          label: "Statut",
          render: (r) => <Badge variant={r.published ? "default" : "outline"}>{r.published ? "Publiée" : "Brouillon"}</Badge>,
          exportFormat: (r) => (r.published ? "Publiée" : "Brouillon"),
        },
      ]}
      emptyHint="Aucune circulaire. Créez-en une pour informer votre communauté."
    />
  );
}
