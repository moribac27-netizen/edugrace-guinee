import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileDown, School } from "lucide-react";
import { maxScoreForLevel } from "@/lib/grading";
import { StudentPhoto } from "@/components/StudentPhoto";
import { logActivity } from "@/lib/audit";


export const Route = createFileRoute("/_authenticated/bulletins")({
  head: () => ({ meta: [{ title: "Bulletins scolaires — MBGEduGuinée" }] }),
  component: BulletinsPage,
});

const PERIODS = [
  { v: "T1", l: "1er Trimestre" },
  { v: "T2", l: "2ème Trimestre" },
  { v: "T3", l: "3ème Trimestre" },
  { v: "S1", l: "1er Semestre" },
  { v: "S2", l: "2ème Semestre" },
  { v: "ANNUAL", l: "Année complète" },
];

const SCHOOL_YEAR = "2025-2026";

function appreciation(note: number | null, max: 10 | 20 = 20): string {
  if (note == null) return "—";
  const n = max === 10 ? note * 2 : note; // normalise sur 20
  if (n >= 18) return "Excellent";
  if (n >= 16) return "Très Bien";
  if (n >= 14) return "Bien";
  if (n >= 12) return "Assez Bien";
  if (n >= 10) return "Passable";
  if (n >= 8) return "Insuffisant";
  if (n >= 5) return "Médiocre";
  return "Très faible";
}

function decision(avg: number | null, level: string, max: 10 | 20 = 20): string {
  if (avg == null) return "—";
  const n = max === 10 ? avg * 2 : avg;
  const isExam = /terminale|3ème|3eme|cm2/i.test(level);
  if (n >= 10) return "Admis(e) en classe supérieure";
  if (n >= 8.5) return isExam ? "Autorisé(e) à composer" : "Passage conditionnel";
  if (n >= 6) return "Redoublement";
  return "Exclusion / Réorientation";
}

function BulletinsPage() {
  const [classId, setClassId] = useState("");
  const [period, setPeriod] = useState("T1");
  const [studentId, setStudentId] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => (await supabase.from("classes").select("*").order("name")).data ?? [],
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await supabase.from("subjects").select("*").order("name")).data ?? [],
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students-class", classId],
    enabled: !!classId,
    queryFn: async () => (await supabase.from("students").select("*").eq("class_id", classId).order("full_name")).data ?? [],
  });

  const periods = useMemo(() => {
    if (period === "S1") return ["T1", "T2"];
    if (period === "S2") return ["T3"];
    if (period === "ANNUAL") return ["T1", "T2", "T3"];
    return [period];
  }, [period]);

  const studentIds = students.map((s: any) => s.id);
  const { data: allGrades = [] } = useQuery({
    queryKey: ["grades-bulletin", classId, periods.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () =>
      (await supabase.from("grades").select("*").in("student_id", studentIds).in("period", periods)).data ?? [],
  });

  const cls = classes.find((c: any) => c.id === classId);
  const maxScore = maxScoreForLevel(cls?.level);

  const computed = useMemo(() => {
    return students.map((s: any) => {
      const sg = allGrades.filter((g: any) => g.student_id === s.id);
      let totalW = 0, totalC = 0;
      const perSubject = subjects.map((sub: any) => {
        const gs = sg.filter((x: any) => x.subject_id === sub.id);
        const avg = gs.length ? gs.reduce((a: number, g: any) => a + Number(g.score), 0) / gs.length : null;
        if (avg != null) { totalW += avg * Number(sub.coefficient); totalC += Number(sub.coefficient); }
        return { subject: sub, avg, appreciation: appreciation(avg, maxScore) };
      });
      const avg = totalC > 0 ? totalW / totalC : null;
      return { student: s, perSubject, avg, totalW, totalC };
    }).sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
  }, [students, allGrades, subjects]);

  const withRank = computed.map((r, i) => ({ ...r, rank: r.avg != null ? i + 1 : null }));
  const selected = withRank.find((r) => r.student.id === studentId);
  const classAvg = withRank.filter(r => r.avg != null).reduce((a, r) => a + (r.avg as number), 0) / (withRank.filter(r => r.avg != null).length || 1);
  const topAvg = withRank[0]?.avg ?? null;
  const lowAvg = [...withRank].filter(r => r.avg != null).reverse()[0]?.avg ?? null;

  const periodLabel = PERIODS.find(p => p.v === period)?.l ?? period;

  function handlePrint() {
    void logActivity({
      action: "print",
      entity_type: "bulletin",
      entity_id: selected?.student.id ?? null,
      entity_label: selected?.student.full_name ?? null,
      metadata: { periode: periodLabel },
    });
    window.print();
  }


  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="font-display text-3xl font-bold">Bulletins scolaires</h1>
        <p className="text-muted-foreground mt-1">Génération automatique conforme au système éducatif guinéen.</p>
      </div>

      <Card className="no-print">
        <CardContent className="p-4 grid gap-3 md:grid-cols-3">
          <div>
            <Label>Classe</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }}>
              <SelectTrigger><SelectValue placeholder="Choisir une classe" /></SelectTrigger>
              <SelectContent>{classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name} — {c.level}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Période</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PERIODS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Élève</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
              <SelectTrigger><SelectValue placeholder="Choisir un élève" /></SelectTrigger>
              <SelectContent>{students.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selected && cls && (
        <>
          <div className="flex gap-2 no-print">
            <Button onClick={handlePrint} className="gap-2"><Printer className="size-4" />Imprimer</Button>
            <Button onClick={handlePrint} variant="outline" className="gap-2"><FileDown className="size-4" />Télécharger PDF</Button>
          </div>

          <div ref={printRef} className="bulletin bg-white text-black p-8 rounded-lg border shadow-sm max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
              <div className="text-xs">
                <div className="font-bold">RÉPUBLIQUE DE GUINÉE</div>
                <div>Travail — Justice — Solidarité</div>
                <div className="mt-1">Ministère de l'Éducation Nationale</div>
              </div>
              <div className="flex flex-col items-center">
                <div className="size-14 rounded-full bg-black text-white flex items-center justify-center">
                  <School className="size-7" />
                </div>
                <div className="font-bold text-sm mt-1">EDUGUINÉE</div>
              </div>
              <div className="text-xs text-right">
                <div className="font-bold">Année scolaire</div>
                <div>{SCHOOL_YEAR}</div>
                <div className="mt-1 font-bold">{periodLabel}</div>
              </div>
            </div>

            <div className="text-center mb-4">
              <h2 className="font-bold text-xl uppercase">Bulletin de notes</h2>
            </div>

            {/* Student info */}
            <div className="flex gap-4 mb-4 border border-black p-3">
              <StudentPhoto path={selected.student.photo_url} name={selected.student.full_name} size="lg" className="rounded-md ring-0 border border-black" />
              <div className="grid grid-cols-2 gap-2 text-sm flex-1">
                <div><span className="font-semibold">Nom & Prénom :</span> {selected.student.full_name}</div>
                <div><span className="font-semibold">Matricule :</span> {selected.student.matricule}</div>
                <div><span className="font-semibold">Classe :</span> {cls.name} ({cls.level})</div>
                <div><span className="font-semibold">Sexe :</span> {selected.student.gender ?? "—"}</div>
                <div><span className="font-semibold">Date de naissance :</span> {selected.student.birth_date ?? "—"}</div>
                <div><span className="font-semibold">Lieu :</span> {selected.student.birth_place ?? "—"}</div>
              </div>
            </div>


            {/* Grades table */}
            <table className="w-full text-xs border border-black border-collapse mb-4">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border border-black p-2 text-left">Matière</th>
                  <th className="border border-black p-2">Moy.</th>
                  <th className="border border-black p-2">Coef.</th>
                  <th className="border border-black p-2">Moy. × Coef.</th>
                  <th className="border border-black p-2 text-left">Appréciation</th>
                </tr>
              </thead>
              <tbody>
                {selected.perSubject.map((r: any) => (
                  <tr key={r.subject.id}>
                    <td className="border border-black p-2">{r.subject.name}</td>
                    <td className="border border-black p-2 text-center">{r.avg != null ? r.avg.toFixed(2) : "—"}</td>
                    <td className="border border-black p-2 text-center">{r.subject.coefficient}</td>
                    <td className="border border-black p-2 text-center">{r.avg != null ? (r.avg * r.subject.coefficient).toFixed(2) : "—"}</td>
                    <td className="border border-black p-2">{r.appreciation}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td className="border border-black p-2">TOTAL</td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2 text-center">{selected.totalC}</td>
                  <td className="border border-black p-2 text-center">{selected.totalW.toFixed(2)}</td>
                  <td className="border border-black p-2"></td>
                </tr>
              </tbody>
            </table>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div className="border border-black p-3 space-y-1">
                <div className="flex justify-between"><span className="font-semibold">Moyenne générale :</span> <span className="font-bold text-base">{selected.avg != null ? selected.avg.toFixed(2) : "—"} / {maxScore}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Rang :</span> <span>{selected.rank ?? "—"} / {withRank.length}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Appréciation :</span> <span>{appreciation(selected.avg, maxScore)}</span></div>
              </div>
              <div className="border border-black p-3 space-y-1">
                <div className="flex justify-between"><span className="font-semibold">Moyenne de classe :</span> <span>{classAvg ? classAvg.toFixed(2) : "—"}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Plus forte moyenne :</span> <span>{topAvg?.toFixed(2) ?? "—"}</span></div>
                <div className="flex justify-between"><span className="font-semibold">Plus faible moyenne :</span> <span>{lowAvg?.toFixed(2) ?? "—"}</span></div>
              </div>
            </div>

            <div className="border border-black p-3 text-sm mb-6">
              <span className="font-semibold">Décision du conseil de classe : </span>
              <span className="font-bold">{decision(selected.avg, cls.level, maxScore)}</span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 text-xs text-center mt-8">
              <div>
                <div className="font-semibold mb-12">Le Titulaire</div>
                <div className="border-t border-black pt-1">Signature</div>
              </div>
              <div>
                <div className="font-semibold mb-2">Cachet de l'établissement</div>
                <div className="mx-auto size-24 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center text-[10px] text-gray-500">
                  CACHET
                </div>
              </div>
              <div>
                <div className="font-semibold mb-12">Le Directeur</div>
                <div className="border-t border-black pt-1">Signature</div>
              </div>
            </div>

            <div className="text-[10px] text-center mt-6 text-gray-600">
              Bulletin généré par MBGEduGuinée — {new Date().toLocaleDateString("fr-FR")}
            </div>
          </div>
        </>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .bulletin, .bulletin * { visibility: visible; }
          .bulletin { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; border: none; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
