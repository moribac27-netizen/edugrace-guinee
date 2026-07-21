import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/verifier-recu/$number")({
  head: ({ params }) => ({
    meta: [
      { title: `Vérification du reçu ${params.number} — MBGEduGuinée` },
      { name: "description", content: "Vérification en ligne de l'authenticité d'un reçu de paiement scolaire." },
      { property: "og:title", content: "Vérification de reçu — MBGEduGuinée" },
      { property: "og:description", content: "Vérifiez l'authenticité de votre reçu de paiement scolaire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VerifyPage,
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function VerifyPage() {
  const { number } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["verify-receipt", number],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("verify_receipt", { _receipt_number: number });
      if (error) throw error;
      return (data as any[])?.[0] ?? null;
    },
  });

  return (
    <div className="min-h-screen bg-muted/30 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-display font-bold text-center mb-6">Vérification de reçu</h1>
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 py-8"><Loader2 className="size-8 animate-spin text-muted-foreground" /><p className="text-sm text-muted-foreground">Vérification en cours…</p></div>
            ) : !data ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <XCircle className="size-14 text-destructive" />
                <h2 className="font-semibold text-lg">Reçu introuvable</h2>
                <p className="text-sm text-muted-foreground text-center">Le numéro <span className="font-mono">{number}</span> ne correspond à aucun paiement validé.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-2 pb-4 border-b">
                  <CheckCircle2 className="size-14 text-primary" />
                  <h2 className="font-semibold text-lg">Reçu authentique</h2>
                  <p className="text-xs text-muted-foreground">Ce paiement a été validé par l'établissement.</p>
                </div>
                {data.school_logo_url && <img src={data.school_logo_url} alt="Logo école" className="h-16 mx-auto" />}
                <div className="text-center">
                  <div className="font-semibold text-lg">{data.school_name}</div>
                  {data.school_address && <div className="text-sm text-muted-foreground">{data.school_address}</div>}
                </div>
                <dl className="space-y-2 text-sm">
                  <Row label="N° de reçu" value={data.receipt_number} mono />
                  <Row label="Date" value={new Date(data.paid_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} />
                  <Row label="Élève" value={data.student_name ?? "—"} />
                  <Row label="Classe" value={data.class_name ?? "—"} />
                  <Row label="Type" value={data.payment_type} />
                  {data.period && <Row label="Période" value={data.period} />}
                  <Row label="Méthode" value={data.payment_method ?? "—"} />
                  <div className="flex justify-between py-2 border-t mt-3">
                    <span className="font-medium">Montant payé</span>
                    <span className="font-bold text-primary text-lg">{fmt(Number(data.amount))} GNF</span>
                  </div>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">MBGEduGuinée — Système de gestion scolaire</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-dashed">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono" : "font-medium"}>{value}</span>
    </div>
  );
}
