import type { PdfMeta } from "@/lib/reports";

const esc = (v: any) =>
  String(v ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m] as string);

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " GNF";

export interface CotisationReceiptData {
  receiptNumber: string;
  studentName: string;
  matricule?: string | null;
  className?: string | null;
  academicYear: string;
  amount: number;
  schoolShare: number;
  paidAt: string;
  method?: string | null;
  reference?: string | null;
  mode: string;
}

/** Reçu de cotisation annuelle (plan par élève), en-tête école identique aux autres documents. */
export function printCotisationReceipt(meta: PdfMeta, d: CotisationReceiptData) {
  const accent = meta.accent || "#1f6f5c";
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<title>Reçu ${esc(d.receiptNumber)}</title>
<style>
@page { size: A5 landscape; margin: 10mm; }
body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color:#1c1a17; margin:0; }
header { display:flex; align-items:center; gap:14px; border-bottom:3px solid ${accent}; padding-bottom:10px; margin-bottom:14px; }
header img { height:52px; object-fit:contain; }
.school { font-size:15px; font-weight:700; }
.addr { font-size:10.5px; color:#6b6560; }
h1 { font-size:16px; margin:0; color:${accent}; }
table { width:100%; border-collapse:collapse; font-size:12px; margin-top:6px; }
td { padding:6px 8px; border-bottom:1px solid #e6e1da; }
td.k { color:#6b6560; width:38%; }
.total { margin-top:14px; font-size:16px; font-weight:700; color:${accent}; }
footer { margin-top:20px; font-size:10px; color:#6b6560; display:flex; justify-content:space-between; }
</style></head><body>
<header>
  ${meta.logoUrl ? `<img src="${esc(meta.logoUrl)}" alt="" />` : ""}
  <div style="flex:1">
    <div class="school">${esc(meta.schoolName || "MBGEduGuinée")}</div>
    ${meta.schoolAddress ? `<div class="addr">${esc(meta.schoolAddress)}</div>` : ""}
    ${meta.schoolContact ? `<div class="addr">${esc(meta.schoolContact)}</div>` : ""}
  </div>
  <div style="text-align:right">
    <h1>Reçu de cotisation annuelle</h1>
    <div class="addr">N° ${esc(d.receiptNumber)}</div>
  </div>
</header>
<table>
  <tr><td class="k">Élève</td><td><b>${esc(d.studentName)}</b>${d.matricule ? " · " + esc(d.matricule) : ""}</td></tr>
  ${d.className ? `<tr><td class="k">Classe</td><td>${esc(d.className)}</td></tr>` : ""}
  <tr><td class="k">Année scolaire</td><td>${esc(d.academicYear)}</td></tr>
  <tr><td class="k">Mode de paiement</td><td>${d.mode === "groupe_ecole" ? "Paiement groupé par l'école" : "Paiement individuel"}${d.method ? " · " + esc(d.method) : ""}</td></tr>
  ${d.reference ? `<tr><td class="k">Référence</td><td>${esc(d.reference)}</td></tr>` : ""}
  <tr><td class="k">Date</td><td>${esc(new Date(d.paidAt).toLocaleDateString("fr-FR"))}</td></tr>
  <tr><td class="k">Part reversée à l'école</td><td>${esc(fmt(d.schoolShare))}</td></tr>
</table>
<div class="total">Montant réglé : ${esc(fmt(d.amount))}</div>
<footer><span>Document généré par MBGEduGuinée</span><span>Signature / cachet</span></footer>
<script>window.onload = () => { window.print(); }</script>
</body></html>`;
  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

/** Numéro de reçu lisible : COT-<année>-<aléatoire>. */
export function newCotisationReceiptNumber(year: string) {
  return `COT-${(year || "").replace(/[^0-9]/g, "").slice(0, 4) || new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
}
