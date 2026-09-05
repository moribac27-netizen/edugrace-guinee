import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, Printer, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePerStudentPlan } from "@/hooks/usePerStudentPlan";
import { usePdfMeta } from "@/hooks/usePdfMeta";
import { formatGNF, ORANGE_MONEY, orangeMoneyUssdLink } from "@/lib/orange-money";
import { newCotisationReceiptNumber, printCotisationReceipt } from "@/lib/cotisation-print";

interface Props {
  studentId: string;
  studentName: string;
  matricule?: string | null;
  className?: string | null;
}

/**
 * Cotisation annuelle « plan par élève » côté parent / élève :
 * état du paiement, règlement individuel et reçu imprimable.
 * N'affiche rien si l'école n'est pas sur le plan par élève.
 */
export function CotisationCard({ studentId, studentName, matricule, className }: Props) {
  const { info } = usePerStudentPlan();
  const meta = usePdfMeta("Cotisation annuelle");
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: payment, refetch } = useQuery({
    queryKey: ["student-cotisation", studentId, info.academicYear],
    enabled: !!studentId && !!info.academicYear && info.isPerStudent,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("student_plan_payments")
        .select("*")
        .eq("student_id", studentId)
        .eq("academic_year", info.academicYear)
        .maybeSingle();
      return data ?? null;
    },
  });

  if (!info.isPerStudent) return null;

  const paid = payment?.status === "paye";

  function receipt(row: any) {
    printCotisationReceipt(meta, {
      receiptNumber: row.receipt_number ?? "—",
      studentName,
      matricule,
      className,
      academicYear: row.academic_year,
      amount: Number(row.amount),
      schoolShare: Number(row.school_share),
      paidAt: row.paid_at,
      method: row.payment_method,
      reference: row.reference,
      mode: row.payment_mode,
    });
  }

  async function pay() {
    if (!info.schoolId) return toast.error("Établissement non identifié.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const row = {
      school_id: info.schoolId,
      student_id: studentId,
      academic_year: info.academicYear,
      amount: info.unitPrice,
      school_share: info.schoolShare,
      status: "paye",
      payment_mode: "individuel",
      payment_method: "orange_money",
      reference: reference || null,
      receipt_number: newCotisationReceiptNumber(info.academicYear),
      paid_by: u.user?.id ?? null,
    };
    const { data, error } = await (supabase as any)
      .from("student_plan_payments").insert(row).select().maybeSingle();
    setSaving(false);
    if (error) return toast.error("Enregistrement impossible", { description: error.message });
    setOpen(false);
    setReference("");
    toast.success("Cotisation enregistrée");
    await refetch();
    if (data) receipt(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4 text-primary" /> Cotisation annuelle {info.academicYear}
        </CardTitle>
        <CardDescription>
          {formatGNF(info.unitPrice)} par élève et par an. Sans cette cotisation, les notes, bulletins et
          documents de l'élève restent inaccessibles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {paid ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="gap-1"><CheckCircle2 className="size-3" /> Cotisation réglée</Badge>
            <span className="text-sm text-muted-foreground">Reçu n° {payment.receipt_number ?? "—"}</span>
            <Button variant="outline" size="sm" onClick={() => receipt(payment)}>
              <Printer className="size-4 mr-1" /> Imprimer le reçu
            </Button>
          </div>
        ) : (
          <>
            <Badge variant="destructive">Non payée</Badge>
            <p className="text-sm text-muted-foreground">
              Payez {formatGNF(info.unitPrice)} par Orange Money au {ORANGE_MONEY.local} ({ORANGE_MONEY.holder}),
              puis enregistrez le paiement ci-dessous pour recevoir votre reçu.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild><a href={orangeMoneyUssdLink()}>Composer {ORANGE_MONEY.ussd}</a></Button>
              <Button onClick={() => setOpen(true)}>Enregistrer mon paiement</Button>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cotisation de {studentName}</DialogTitle>
            <DialogDescription>
              Montant : {formatGNF(info.unitPrice)} · Année {info.academicYear}. Indiquez la référence de la
              transaction Orange Money (facultatif).
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Référence de la transaction</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Ex. PP250901.1234.A56789" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Annuler</Button>
            <Button onClick={() => void pay()} disabled={saving}>
              {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Enregistrement…</> : "Confirmer le paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
