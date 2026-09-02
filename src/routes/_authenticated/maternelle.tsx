import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CrudSection } from "@/components/CrudSection";
import { useStudentOptions, useClassOptions, useTableOptions } from "@/hooks/useOptions";
import { useRoles } from "@/hooks/useAuth";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { usePdfMeta } from "@/hooks/usePdfMeta";
import { fmtDate } from "@/lib/reports";
import { printNurseryBulletin, printDailyLog, dailyLogMessage } from "@/lib/nursery-print";
import { toast } from "sonner";
import { Baby, FileText, Printer, Share2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/maternelle")({
  head: () => ({
    meta: [
      { title: "Maternelle — MBGEduGuinée" },
      { name: "description", content: "Sections maternelle, fiches enfants, suivi quotidien et évaluation par compétences." },
      { property: "og:title", content: "Maternelle — MBGEduGuinée" },
      { property: "og:description", content: "Gérez les sections, les fiches enfants, le suivi quotidien et les compétences des tout-petits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Maternelle,
});

const MOODS = [
  { value: "joyeux", label: "Joyeux" },
  { value: "calme", label: "Calme" },
  { value: "fatigue", label: "Fatigué" },
  { value: "agite", label: "Agité" },
  { value: "triste", label: "Triste" },
];
const SCALE = [
  { value: "tout", label: "Tout mangé" },
  { value: "moitie", label: "La moitié" },
  { value: "peu", label: "Très peu" },
  { value: "rien", label: "Rien" },
];
const NAPS = [
  { value: "bien", label: "A bien dormi" },
  { value: "court", label: "Sieste courte" },
  { value: "aucune", label: "Pas de sieste" },
];
const TOILET = [
  { value: "autonome", label: "Autonome" },
  { value: "aide", label: "Avec aide" },
  { value: "couches", label: "Couches" },
];
const DOMAINS = [
  { value: "langage", label: "Langage" },
  { value: "motricite", label: "Motricité" },
  { value: "socialisation", label: "Socialisation" },
  { value: "autonomie", label: "Autonomie" },
  { value: "eveil", label: "Éveil / créativité" },
];
const LEVELS = [
  { value: "acquis", label: "Acquis" },
  { value: "en_cours", label: "En cours d'acquisition" },
  { value: "a_travailler", label: "À travailler" },
];
const PERIODS = [
  { value: "Trimestre 1", label: "Trimestre 1" },
  { value: "Trimestre 2", label: "Trimestre 2" },
  { value: "Trimestre 3", label: "Trimestre 3" },
];
const ATTENDANCE = [
  { value: "present", label: "Présent" },
  { value: "absent", label: "Absent" },
  { value: "retard", label: "Retard" },
];
const HYGIENE = [
  { value: "sec", label: "Sec" },
  { value: "accident", label: "Accident" },
  { value: "apprentissage", label: "En apprentissage" },
];
const ACTIVITIES = [
  { value: "accueil", label: "Accueil" },
  { value: "motricite", label: "Motricité" },
  { value: "ateliers", label: "Ateliers" },
  { value: "collation", label: "Collation" },
  { value: "repas", label: "Repas" },
  { value: "sieste", label: "Sieste" },
  { value: "jeux", label: "Jeux libres" },
  { value: "sortie", label: "Sortie" },
];
const DAYS = [
  { value: "1", label: "Lundi" },
  { value: "2", label: "Mardi" },
  { value: "3", label: "Mercredi" },
  { value: "4", label: "Jeudi" },
  { value: "5", label: "Vendredi" },
  { value: "6", label: "Samedi" },
];

const label = (opts: { value: string; label: string }[], v: any) =>
  opts.find((o) => o.value === v)?.label ?? v ?? "—";
const studentName = (r: any) => r?.students?.full_name ?? "—";
const today = () => new Date().toISOString().slice(0, 10);

function levelBadge(v: string) {
  const variant = v === "acquis" ? "default" : v === "a_travailler" ? "destructive" : "secondary";
  return <Badge variant={variant as any}>{label(LEVELS, v)}</Badge>;
}

function Maternelle() {
  const { roles } = useRoles();
  const { isSuperAdmin } = useSuperAdmin();
  const canWrite =
    isSuperAdmin ||
    roles.some((r) => ["admin", "directeur", "directeur_etudes", "proviseur", "enseignant"].includes(r));

  const { options: studentOptions } = useStudentOptions();
  const { options: classOptions } = useClassOptions();
  const { options: teacherOptions } = useTableOptions("teachers", "full_name");
  const { options: sectionOptions } = useTableOptions("nursery_sections", "name");

  const { data: competencies = [] } = useQuery({
    queryKey: ["opt-nursery-competencies"],
    queryFn: async () => {
      const { data } = await supabase
        .from("nursery_competencies" as any)
        .select("id, label, domain")
        .order("display_order");
      return (data ?? []) as any[];
    },
    staleTime: 60_000,
  });
  const competencyOptions = useMemo(
    () => competencies.map((c: any) => ({ value: c.id, label: `${label(DOMAINS, c.domain)} — ${c.label}` })),
    [competencies],
  );

  const { data: stats } = useQuery({
    queryKey: ["nursery-stats"],
    queryFn: async () => {
      const [sections, children, logs, acquired] = await Promise.all([
        supabase.from("nursery_sections" as any).select("id", { count: "exact", head: true }),
        supabase.from("nursery_children" as any).select("id", { count: "exact", head: true }),
        supabase.from("nursery_daily_logs" as any).select("id", { count: "exact", head: true }).eq("date", today()),
        supabase.from("nursery_evaluations" as any).select("id", { count: "exact", head: true }).eq("level", "acquis"),
      ]);
      return {
        sections: sections.count ?? 0,
        children: children.count ?? 0,
        logsToday: logs.count ?? 0,
        acquired: acquired.count ?? 0,
      };
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-chart-2/10 text-chart-2 flex items-center justify-center">
          <Baby className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Maternelle</h1>
          <p className="text-muted-foreground mt-1">Sections, fiches enfants, suivi quotidien et compétences.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Sections</div>
          <div className="text-2xl font-bold mt-1">{stats?.sections ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Enfants inscrits</div>
          <div className="text-2xl font-bold mt-1">{stats?.children ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Suivis saisis aujourd'hui</div>
          <div className="text-2xl font-bold mt-1">{stats?.logsToday ?? "—"}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Compétences acquises</div>
          <div className="text-2xl font-bold mt-1">{stats?.acquired ?? "—"}</div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="sections">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="enfants">Fiches enfants</TabsTrigger>
          <TabsTrigger value="suivi">Suivi quotidien</TabsTrigger>
          <TabsTrigger value="competences">Compétences</TabsTrigger>
          <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="mt-4">
          <CrudSection
            table="nursery_sections"
            title="Sections maternelle"
            singular="section"
            queryKey={["nursery-sections"]}
            select="*, classes(name), teachers(full_name)"
            orderBy={{ column: "name" }}
            canWrite={canWrite}
            searchKeys={["name", "age_range"]}
            emptyHint="Créez vos sections : Petite, Moyenne et Grande section."
            fields={[
              { name: "name", label: "Nom de la section", required: true, placeholder: "ex. Petite section A" },
              { name: "age_range", label: "Tranche d'âge", placeholder: "ex. 3-4 ans" },
              { name: "capacity", label: "Capacité", type: "number", min: 0 },
              { name: "class_id", label: "Classe rattachée", type: "select", options: classOptions },
              { name: "teacher_id", label: "Enseignant référent", type: "select", options: teacherOptions },
              { name: "notes", label: "Notes", type: "textarea", full: true },
            ]}
            columns={[
              { key: "name", label: "Section" },
              { key: "age_range", label: "Âge" },
              { key: "capacity", label: "Capacité" },
              { key: "class", label: "Classe", render: (r) => r.classes?.name ?? "—", exportFormat: (r) => r.classes?.name ?? "" },
              { key: "teacher", label: "Enseignant", render: (r) => r.teachers?.full_name ?? "—", exportFormat: (r) => r.teachers?.full_name ?? "" },
            ]}
          />
        </TabsContent>

        <TabsContent value="enfants" className="mt-4">
          <CrudSection
            table="nursery_children"
            title="Fiches enfants"
            singular="fiche enfant"
            queryKey={["nursery-children"]}
            select="*, students(full_name, matricule), nursery_sections(name)"
            orderBy={{ column: "created_at", ascending: false }}
            canWrite={canWrite}
            searchKeys={["pickup_person", "allergies"]}
            emptyHint="Rattachez les élèves de maternelle à une section et complétez leur fiche."
            fields={[
              { name: "student_id", label: "Enfant", type: "select", options: studentOptions, required: true },
              { name: "section_id", label: "Section", type: "select", options: sectionOptions },
              { name: "pickup_person", label: "Personne autorisée à récupérer l'enfant" },
              { name: "pickup_phone", label: "Téléphone de cette personne" },
              { name: "allergies", label: "Allergies", type: "textarea", full: true },
              { name: "medical_notes", label: "Informations médicales", type: "textarea", full: true },
              { name: "nap_needed", label: "Fait la sieste", type: "checkbox", default: true },
              { name: "toilet_trained", label: "Propreté acquise", type: "checkbox" },
              { name: "special_notes", label: "Remarques particulières", type: "textarea", full: true },
            ]}
            columns={[
              { key: "student", label: "Enfant", render: studentName, exportFormat: studentName },
              { key: "section", label: "Section", render: (r) => r.nursery_sections?.name ?? "—", exportFormat: (r) => r.nursery_sections?.name ?? "" },
              { key: "pickup_person", label: "Récupéré par" },
              { key: "allergies", label: "Allergies", render: (r) => r.allergies || "—" },
              {
                key: "toilet_trained",
                label: "Propreté",
                render: (r) => <Badge variant={r.toilet_trained ? "default" : "secondary"}>{r.toilet_trained ? "Acquise" : "En cours"}</Badge>,
                exportFormat: (r) => (r.toilet_trained ? "Acquise" : "En cours"),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="suivi" className="mt-4">
          <CrudSection
            table="nursery_daily_logs"
            title="Suivi quotidien"
            singular="suivi"
            queryKey={["nursery-logs"]}
            select="*, students(full_name), nursery_sections(name)"
            orderBy={{ column: "date", ascending: false }}
            canWrite={canWrite}
            searchKeys={["activities", "incidents", "parent_comment"]}
            emptyHint="Saisissez chaque jour l'humeur, les repas, la sieste et les activités de l'enfant."
            fields={[
              { name: "student_id", label: "Enfant", type: "select", options: studentOptions, required: true },
              { name: "section_id", label: "Section", type: "select", options: sectionOptions },
              { name: "date", label: "Date", type: "date", required: true, default: today() },
              { name: "mood", label: "Humeur", type: "select", options: MOODS },
              { name: "meal", label: "Repas", type: "select", options: SCALE },
              { name: "nap", label: "Sieste", type: "select", options: NAPS },
              { name: "toilet", label: "Propreté", type: "select", options: TOILET },
              { name: "activities", label: "Activités de la journée", type: "textarea", full: true },
              { name: "incidents", label: "Incidents / soins", type: "textarea", full: true },
              { name: "parent_comment", label: "Message aux parents", type: "textarea", full: true },
            ]}
            columns={[
              { key: "date", label: "Date", render: (r) => fmtDate(r.date), exportFormat: (r) => fmtDate(r.date) },
              { key: "student", label: "Enfant", render: studentName, exportFormat: studentName },
              { key: "mood", label: "Humeur", render: (r) => label(MOODS, r.mood), exportFormat: (r) => label(MOODS, r.mood) },
              { key: "meal", label: "Repas", render: (r) => label(SCALE, r.meal), exportFormat: (r) => label(SCALE, r.meal) },
              { key: "nap", label: "Sieste", render: (r) => label(NAPS, r.nap), exportFormat: (r) => label(NAPS, r.nap) },
              { key: "parent_comment", label: "Message aux parents", render: (r) => r.parent_comment || "—" },
            ]}
          />
        </TabsContent>

        <TabsContent value="competences" className="mt-4">
          <CrudSection
            table="nursery_competencies"
            title="Référentiel de compétences"
            singular="compétence"
            queryKey={["nursery-competencies"]}
            orderBy={{ column: "display_order" }}
            canWrite={canWrite}
            searchKeys={["label", "domain"]}
            emptyHint="Définissez les compétences par domaine (langage, motricité, socialisation…)."
            fields={[
              { name: "domain", label: "Domaine", type: "select", options: DOMAINS, required: true, default: "langage" },
              { name: "label", label: "Compétence", required: true, placeholder: "ex. Reconnaît son prénom écrit", full: true },
              { name: "display_order", label: "Ordre d'affichage", type: "number", default: 0 },
            ]}
            columns={[
              { key: "domain", label: "Domaine", render: (r) => label(DOMAINS, r.domain), exportFormat: (r) => label(DOMAINS, r.domain) },
              { key: "label", label: "Compétence" },
              { key: "display_order", label: "Ordre" },
            ]}
          />
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4">
          <CrudSection
            table="nursery_evaluations"
            title="Évaluations par compétences"
            singular="évaluation"
            queryKey={["nursery-evaluations"]}
            select="*, students(full_name), nursery_competencies(label, domain)"
            orderBy={{ column: "created_at", ascending: false }}
            canWrite={canWrite}
            searchKeys={["period", "comment"]}
            emptyHint="Évaluez chaque enfant compétence par compétence, par période."
            fields={[
              { name: "student_id", label: "Enfant", type: "select", options: studentOptions, required: true },
              { name: "competency_id", label: "Compétence", type: "select", options: competencyOptions, required: true },
              { name: "period", label: "Période", type: "select", options: PERIODS, required: true, default: "Trimestre 1" },
              { name: "level", label: "Niveau atteint", type: "select", options: LEVELS, required: true, default: "en_cours" },
              { name: "comment", label: "Commentaire", type: "textarea", full: true },
            ]}
            columns={[
              { key: "student", label: "Enfant", render: studentName, exportFormat: studentName },
              {
                key: "competency",
                label: "Compétence",
                render: (r) => r.nursery_competencies?.label ?? "—",
                exportFormat: (r) => r.nursery_competencies?.label ?? "",
              },
              { key: "period", label: "Période" },
              { key: "level", label: "Niveau", render: (r) => levelBadge(r.level), exportFormat: (r) => label(LEVELS, r.level) },
              { key: "comment", label: "Commentaire", render: (r) => r.comment || "—" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
