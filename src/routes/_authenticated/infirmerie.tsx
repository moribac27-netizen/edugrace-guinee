import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CrudSection } from "@/components/CrudSection";
import { useStudentOptions, useTableOptions } from "@/hooks/useOptions";
import { fmtDate, fmtDateTime } from "@/lib/reports";
import { HeartPulse } from "lucide-react";

export const Route = createFileRoute("/_authenticated/infirmerie")({
  head: () => ({
    meta: [
      { title: "Infirmerie — MBGEduGuinée" },
      { name: "description", content: "Dossiers médicaux, visites, traitements, stock de médicaments et accidents scolaires." },
      { property: "og:title", content: "Infirmerie — MBGEduGuinée" },
      { property: "og:description", content: "Suivi médical complet des élèves de votre établissement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Infirmerie,
});

const SEVERITY = [
  { value: "leger", label: "Léger" },
  { value: "modere", label: "Modéré" },
  { value: "grave", label: "Grave" },
];

const OUTCOME = [
  { value: "soigne", label: "Soigné sur place" },
  { value: "repos", label: "Mis au repos" },
  { value: "renvoi_maison", label: "Renvoyé à la maison" },
  { value: "hopital", label: "Transféré à l'hôpital" },
];

const TREATMENT_STATUS = [
  { value: "en_cours", label: "En cours" },
  { value: "termine", label: "Terminé" },
  { value: "interrompu", label: "Interrompu" },
];

function studentName(row: any) {
  return row?.students?.full_name ?? "—";
}

function Infirmerie() {
  const { options: studentOptions } = useStudentOptions();
  const { options: medicineOptions } = useTableOptions("medicines");
  const { rows: medicineRows } = useTableOptions("medicines");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
          <HeartPulse className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Infirmerie</h1>
          <p className="text-muted-foreground mt-1">Dossiers médicaux, visites, traitements, médicaments et accidents.</p>
        </div>
      </div>

      <Tabs defaultValue="dossiers">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dossiers">Dossiers médicaux</TabsTrigger>
          <TabsTrigger value="visites">Visites</TabsTrigger>
          <TabsTrigger value="traitements">Traitements</TabsTrigger>
          <TabsTrigger value="medicaments">Médicaments</TabsTrigger>
          <TabsTrigger value="accidents">Accidents</TabsTrigger>
        </TabsList>

        <TabsContent value="dossiers" className="mt-6">
          <CrudSection
            table="medical_records"
            title="Dossiers médicaux"
            singular="Dossier médical"
            queryKey={["medical_records"]}
            select="*, students(full_name, matricule)"
            orderBy={{ column: "created_at", ascending: false }}
            searchKeys={["students.full_name", "blood_type", "allergies"]}
            fields={[
              { name: "student_id", label: "Élève", type: "select", options: studentOptions, required: true },
              { name: "blood_type", label: "Groupe sanguin", placeholder: "O+, A-, …" },
              { name: "allergies", label: "Allergies", type: "textarea" },
              { name: "chronic_conditions", label: "Maladies chroniques", type: "textarea" },
              { name: "medications", label: "Traitements permanents", type: "textarea" },
              { name: "emergency_contact_name", label: "Contact d'urgence" },
              { name: "emergency_contact_phone", label: "Téléphone d'urgence" },
              { name: "doctor_name", label: "Médecin traitant" },
              { name: "doctor_phone", label: "Téléphone du médecin" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            columns={[
              { key: "student", label: "Élève", render: studentName, exportFormat: studentName },
              { key: "blood_type", label: "Groupe" },
              { key: "allergies", label: "Allergies" },
              { key: "chronic_conditions", label: "Maladies chroniques" },
              { key: "emergency_contact_phone", label: "Urgence" },
            ]}
          />
        </TabsContent>

        <TabsContent value="visites" className="mt-6">
          <CrudSection
            table="medical_visits"
            title="Visites à l'infirmerie"
            singular="Visite"
            queryKey={["medical_visits"]}
            select="*, students(full_name)"
            orderBy={{ column: "visit_date", ascending: false }}
            searchKeys={["students.full_name", "reason", "diagnosis"]}
            fields={[
              { name: "student_id", label: "Élève", type: "select", options: studentOptions, required: true },
              { name: "visit_date", label: "Date et heure", type: "datetime", required: true, default: new Date().toISOString().slice(0, 16) },
              { name: "reason", label: "Motif", required: true },
              { name: "temperature", label: "Température (°C)", type: "number", step: "0.1", min: 30 },
              { name: "symptoms", label: "Symptômes", type: "textarea" },
              { name: "diagnosis", label: "Diagnostic", type: "textarea" },
              { name: "outcome", label: "Suite donnée", type: "select", options: OUTCOME, required: true, default: "soigne" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            columns={[
              { key: "visit_date", label: "Date", render: (r) => fmtDateTime(r.visit_date), exportFormat: (r) => fmtDateTime(r.visit_date) },
              { key: "student", label: "Élève", render: studentName, exportFormat: studentName },
              { key: "reason", label: "Motif" },
              { key: "temperature", label: "T°", render: (r) => (r.temperature ? `${r.temperature} °C` : "—") },
              {
                key: "outcome", label: "Suite",
                render: (r) => <Badge variant="outline">{OUTCOME.find((o) => o.value === r.outcome)?.label ?? r.outcome}</Badge>,
                exportFormat: (r) => OUTCOME.find((o) => o.value === r.outcome)?.label ?? r.outcome,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="traitements" className="mt-6">
          <CrudSection
            table="treatments"
            title="Traitements"
            singular="Traitement"
            queryKey={["treatments"]}
            select="*, students(full_name)"
            orderBy={{ column: "start_date", ascending: false }}
            searchKeys={["students.full_name", "medicine_name"]}
            fields={[
              { name: "student_id", label: "Élève", type: "select", options: studentOptions, required: true },
              { name: "medicine_id", label: "Médicament du stock", type: "select", options: medicineOptions },
              { name: "medicine_name", label: "Nom du médicament", required: true },
              { name: "dosage", label: "Posologie", placeholder: "1 comprimé" },
              { name: "frequency", label: "Fréquence", placeholder: "3 fois par jour" },
              { name: "start_date", label: "Début", type: "date", required: true, default: new Date().toISOString().slice(0, 10) },
              { name: "end_date", label: "Fin", type: "date" },
              { name: "status", label: "Statut", type: "select", options: TREATMENT_STATUS, required: true, default: "en_cours" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            columns={[
              { key: "student", label: "Élève", render: studentName, exportFormat: studentName },
              { key: "medicine_name", label: "Médicament" },
              { key: "dosage", label: "Posologie" },
              { key: "frequency", label: "Fréquence" },
              { key: "start_date", label: "Début", render: (r) => fmtDate(r.start_date), exportFormat: (r) => fmtDate(r.start_date) },
              { key: "end_date", label: "Fin", render: (r) => fmtDate(r.end_date) || "—", exportFormat: (r) => fmtDate(r.end_date) },
              {
                key: "status", label: "Statut",
                render: (r) => <Badge variant={r.status === "en_cours" ? "default" : "outline"}>{TREATMENT_STATUS.find((s) => s.value === r.status)?.label ?? r.status}</Badge>,
                exportFormat: (r) => TREATMENT_STATUS.find((s) => s.value === r.status)?.label ?? r.status,
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="medicaments" className="mt-6">
          <CrudSection
            table="medicines"
            title="Stock de médicaments"
            singular="Médicament"
            queryKey={["medicines"]}
            orderBy={{ column: "name" }}
            searchKeys={["name", "form"]}
            emptyHint="Aucun médicament en stock."
            rowClassName={(r) => (r.quantity <= r.alert_threshold ? "bg-destructive/5" : "")}
            fields={[
              { name: "name", label: "Nom", required: true },
              { name: "form", label: "Forme", placeholder: "Comprimé, sirop, pommade…" },
              { name: "quantity", label: "Quantité", type: "number", min: 0, required: true, default: 0 },
              { name: "unit", label: "Unité", required: true, default: "unité" },
              { name: "alert_threshold", label: "Seuil d'alerte", type: "number", min: 0, required: true, default: 5 },
              { name: "expiry_date", label: "Date de péremption", type: "date" },
              { name: "notes", label: "Notes", type: "textarea" },
            ]}
            columns={[
              { key: "name", label: "Nom" },
              { key: "form", label: "Forme" },
              {
                key: "quantity", label: "Stock",
                render: (r) => (
                  <span className={r.quantity <= r.alert_threshold ? "font-semibold text-destructive" : ""}>
                    {r.quantity} {r.unit}
                  </span>
                ),
                exportFormat: (r) => `${r.quantity} ${r.unit}`,
              },
              { key: "alert_threshold", label: "Seuil" },
              { key: "expiry_date", label: "Péremption", render: (r) => fmtDate(r.expiry_date) || "—", exportFormat: (r) => fmtDate(r.expiry_date) },
            ]}
            filters={
              medicineRows.length > 0 ? (
                <Badge variant="outline" className="h-9 px-3">
                  {medicineRows.filter((m: any) => m.quantity <= m.alert_threshold).length} en alerte
                </Badge>
              ) : null
            }
          />
        </TabsContent>

        <TabsContent value="accidents" className="mt-6">
          <CrudSection
            table="accidents"
            title="Accidents scolaires"
            singular="Accident"
            queryKey={["accidents"]}
            select="*, students(full_name)"
            orderBy={{ column: "occurred_at", ascending: false }}
            searchKeys={["students.full_name", "location", "description"]}
            fields={[
              { name: "student_id", label: "Élève", type: "select", options: studentOptions },
              { name: "occurred_at", label: "Date et heure", type: "datetime", required: true, default: new Date().toISOString().slice(0, 16) },
              { name: "location", label: "Lieu", placeholder: "Cour, salle de classe…" },
              { name: "severity", label: "Gravité", type: "select", options: SEVERITY, required: true, default: "leger" },
              { name: "description", label: "Description", type: "textarea", required: true },
              { name: "witnesses", label: "Témoins", type: "textarea" },
              { name: "actions_taken", label: "Mesures prises", type: "textarea" },
              { name: "parents_notified", label: "Parents informés", type: "checkbox" },
              { name: "hospital_transfer", label: "Transfert à l'hôpital", type: "checkbox" },
            ]}
            columns={[
              { key: "occurred_at", label: "Date", render: (r) => fmtDateTime(r.occurred_at), exportFormat: (r) => fmtDateTime(r.occurred_at) },
              { key: "student", label: "Élève", render: studentName, exportFormat: studentName },
              { key: "location", label: "Lieu" },
              {
                key: "severity", label: "Gravité",
                render: (r) => (
                  <Badge variant={r.severity === "grave" ? "destructive" : r.severity === "modere" ? "default" : "outline"}>
                    {SEVERITY.find((s) => s.value === r.severity)?.label ?? r.severity}
                  </Badge>
                ),
                exportFormat: (r) => SEVERITY.find((s) => s.value === r.severity)?.label ?? r.severity,
              },
              { key: "parents_notified", label: "Parents", render: (r) => (r.parents_notified ? "Oui" : "Non"), exportFormat: (r) => (r.parents_notified ? "Oui" : "Non") },
              { key: "hospital_transfer", label: "Hôpital", render: (r) => (r.hospital_transfer ? "Oui" : "Non"), exportFormat: (r) => (r.hospital_transfer ? "Oui" : "Non") },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
