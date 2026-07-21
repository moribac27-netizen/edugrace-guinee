import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Upload, Loader2, ImageIcon, RotateCcw, Printer } from "lucide-react";
import QRCode from "qrcode";

export const Route = createFileRoute("/_authenticated/personnalisation-recu")({
  head: () => ({
    meta: [
      { title: "Personnalisation du reçu — MBGEduGuinée" },
      { name: "description", content: "Personnalisez le logo, l'en-tête, les mentions légales et le numéro de vos reçus." },
    ],
  }),
  component: ReceiptCustomizationPage,
});

const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
const MAX_SIZE = 5 * 1024 * 1024;
const KIND_COL = {
  logo: "logo_url",
  stamp: "school_stamp_url",
  signature: "director_signature_url",
} as const;
type Kind = keyof typeof KIND_COL;

function ReceiptCustomizationPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const { data: school } = useQuery({
    queryKey: ["my-school-receipt"],
    queryFn: async () => {
      const { data: sid } = await supabase.rpc("current_school_id");
      if (!sid) return null;
      const { data } = await supabase.from("schools").select("*").eq("id", sid as any).maybeSingle();
      return data;
    },
  });

  useEffect(() => { if (school) setForm(school); }, [school]);

  const { data: nextSeq } = useQuery({
    queryKey: ["receipt-next-seq", form?.id],
    enabled: !!form?.id,
    queryFn: async () => {
      const year = new Date().getFullYear();
      const { data } = await supabase.from("receipt_counters").select("last_seq").eq("school_id", form.id).eq("year", year).maybeSingle();
      return (data?.last_seq ?? 0) + 1;
    },
  });

  async function save() {
    if (!form?.id) return;
    setSaving(true);
    const patch = {
      receipt_title: form.receipt_title,
      receipt_header: form.receipt_header,
      receipt_legal_notice: form.receipt_legal_notice,
      receipt_footer_note: form.receipt_footer_note,
      receipt_prefix: (form.receipt_prefix || "REC").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "REC",
      receipt_accent_color: form.receipt_accent_color,
      director_name: form.director_name,
    };
    const { error } = await supabase.from("schools").update(patch).eq("id", form.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Personnalisation enregistrée");
    qc.invalidateQueries({ queryKey: ["my-school-receipt"] });
    qc.invalidateQueries({ queryKey: ["current-school-full"] });
  }

  function reset() {
    setForm({
      ...form,
      receipt_title: "REÇU DE PAIEMENT",
      receipt_header: "",
      receipt_legal_notice: "",
      receipt_footer_note: "Reçu généré électroniquement — vérifiable en ligne via QR code.",
      receipt_prefix: "REC",
      receipt_accent_color: "#2a5a3e",
    });
  }

  if (!form) return <div className="p-8 text-muted-foreground">Chargement…</div>;

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });
  const year = new Date().getFullYear();
  const previewNumber = `${(form.receipt_prefix || "REC").toUpperCase()}-${year}-${String(nextSeq ?? 1).padStart(6, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Personnalisation du reçu</h1>
          <p className="text-muted-foreground mt-1">Adaptez logo, en-tête, mentions légales et numéro à votre établissement.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset} className="gap-2"><RotateCcw className="size-4" /> Réinitialiser</Button>
          <Button variant="outline" onClick={() => printTest(form)} className="gap-2"><Printer className="size-4" /> Imprimer un reçu test</Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">En-tête & identité</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Titre du reçu</Label>
                <Input value={form.receipt_title ?? ""} onChange={(e) => set("receipt_title", e.target.value)} placeholder="REÇU DE PAIEMENT" />
              </div>
              <div>
                <Label>En-tête additionnel (au-dessus du titre)</Label>
                <Textarea rows={2} value={form.receipt_header ?? ""} onChange={(e) => set("receipt_header", e.target.value)} placeholder="Ex : République de Guinée — Ministère de l'Éducation Nationale" />
              </div>
              <div>
                <Label>Nom du directeur (signature)</Label>
                <Input value={form.director_name ?? ""} onChange={(e) => set("director_name", e.target.value)} placeholder="Le Directeur" />
              </div>
              <div>
                <Label>Couleur d'accent</Label>
                <div className="flex gap-2">
                  <input type="color" value={form.receipt_accent_color ?? "#2a5a3e"} onChange={(e) => set("receipt_accent_color", e.target.value)} className="h-10 w-16 rounded border cursor-pointer" />
                  <Input value={form.receipt_accent_color ?? ""} onChange={(e) => set("receipt_accent_color", e.target.value)} className="font-mono" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Numérotation</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Préfixe du numéro de reçu</Label>
                <Input maxLength={8} value={form.receipt_prefix ?? ""} onChange={(e) => set("receipt_prefix", e.target.value.toUpperCase())} placeholder="REC" className="font-mono uppercase" />
                <p className="text-xs text-muted-foreground mt-1">Lettres et chiffres uniquement. Format final : <span className="font-mono">{previewNumber}</span></p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Mentions & pied de page</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Mentions légales</Label>
                <Textarea rows={3} value={form.receipt_legal_notice ?? ""} onChange={(e) => set("receipt_legal_notice", e.target.value)} placeholder="Ex : NIF 123456789 — RCCM GN.KAL.2024.B.001" />
              </div>
              <div>
                <Label>Note en pied de reçu</Label>
                <Textarea rows={2} value={form.receipt_footer_note ?? ""} onChange={(e) => set("receipt_footer_note", e.target.value)} placeholder="Reçu généré électroniquement…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Images (logo, cachet, signature)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <AssetSlot kind="logo" label="Logo" schoolId={form.id} url={form.logo_url} onDone={(u) => set("logo_url", u)} />
              <AssetSlot kind="stamp" label="Cachet" schoolId={form.id} url={form.school_stamp_url} onDone={(u) => set("school_stamp_url", u)} />
              <AssetSlot kind="signature" label="Signature" schoolId={form.id} url={form.director_signature_url} onDone={(u) => set("director_signature_url", u)} />
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <Card>
            <CardHeader><CardTitle className="text-base">Aperçu en direct</CardTitle></CardHeader>
            <CardContent>
              <ReceiptPreview form={form} previewNumber={previewNumber} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReceiptPreview({ form, previewNumber }: { form: any; previewNumber: string }) {
  const accent = form.receipt_accent_color || "#2a5a3e";
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [stampSrc, setStampSrc] = useState<string | null>(null);
  const [sigSrc, setSigSrc] = useState<string | null>(null);

  useEffect(() => { resolveAsset(form.logo_url).then(setLogoSrc); }, [form.logo_url]);
  useEffect(() => { resolveAsset(form.school_stamp_url).then(setStampSrc); }, [form.school_stamp_url]);
  useEffect(() => { resolveAsset(form.director_signature_url).then(setSigSrc); }, [form.director_signature_url]);

  return (
    <div className="bg-white rounded-md border shadow-sm p-6 text-[13px] text-slate-800" style={{ fontFamily: "system-ui, sans-serif" }}>
      {form.receipt_header && (
        <div className="text-center text-[11px] uppercase tracking-widest text-slate-500 pb-2 mb-2 border-b border-dashed">
          {form.receipt_header}
        </div>
      )}
      <div className="flex items-center gap-3 pb-3 border-b-[3px] border-double" style={{ borderColor: accent }}>
        {logoSrc ? <img src={logoSrc} alt="Logo" className="h-14 w-14 object-contain" /> : <div className="h-14 w-14 rounded bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon className="size-6" /></div>}
        <div className="flex-1">
          <h2 className="text-lg font-bold" style={{ color: accent }}>{form.name ?? "Nom de l'école"}</h2>
          {form.address && <div className="text-[11px] text-slate-500">{form.address}</div>}
          <div className="text-[11px] text-slate-500">{[form.phone, form.email].filter(Boolean).join(" • ")}</div>
        </div>
      </div>

      <div className="text-center mt-4 font-bold tracking-[3px]" style={{ color: accent }}>
        {form.receipt_title || "REÇU DE PAIEMENT"}
      </div>
      <div className="text-center font-mono text-xs text-slate-500 mb-3">N° {previewNumber}</div>

      <div className="border rounded-lg px-4 py-2 space-y-1.5 text-[12px]">
        <Row k="Date" v={new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} />
        <Row k="Élève" v="Aïssatou Diallo" />
        <Row k="Matricule" v="ELV-2026-0042" />
        <Row k="Classe" v="6ème A" />
        <Row k="Type de paiement" v="Scolarité" />
        <Row k="Moyen de paiement" v="Orange Money" />
      </div>

      <div className="flex justify-between items-center mt-3 px-4 py-3 rounded-lg" style={{ background: accent + "14" }}>
        <span className="font-semibold">Montant total payé</span>
        <span className="text-lg font-bold" style={{ color: accent }}>150 000 GNF</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6 text-center text-[10px] text-slate-600">
        <div>
          <div className="h-14 flex items-end justify-center">{stampSrc && <img src={stampSrc} alt="Cachet" className="max-h-14 object-contain" />}</div>
          <div className="border-t border-slate-400 mt-2 pt-1 font-semibold">Cachet</div>
        </div>
        <div>
          <div className="h-14 flex items-end justify-center">{sigSrc && <img src={sigSrc} alt="Signature" className="max-h-14 object-contain" />}</div>
          <div className="border-t border-slate-400 mt-2 pt-1 font-semibold">{form.director_name || "Le Directeur"}</div>
        </div>
        <div>
          <div className="h-14 flex items-end justify-center"><div className="size-14 bg-slate-100 border grid place-items-center text-[9px] text-slate-400">QR</div></div>
          <div className="border-t border-slate-400 mt-2 pt-1 font-semibold">Vérification</div>
        </div>
      </div>

      {form.receipt_legal_notice && (
        <div className="mt-4 text-[10px] text-slate-500 text-center italic border-t pt-2">{form.receipt_legal_notice}</div>
      )}
      {form.receipt_footer_note && (
        <div className="mt-2 text-[10px] text-slate-400 text-center italic">{form.receipt_footer_note}</div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-dashed border-slate-200 last:border-none py-1">
      <span className="text-slate-500">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

async function resolveAsset(val?: string | null): Promise<string | null> {
  if (!val) return null;
  if (val.startsWith("http")) return val;
  const { data } = await supabase.storage.from("school-assets").createSignedUrl(val, 3600);
  return data?.signedUrl ?? null;
}

function AssetSlot({ kind, label, schoolId, url, onDone }: { kind: Kind; label: string; schoolId: string; url?: string | null; onDone: (u: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [signed, setSigned] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentPath = useMemo(() => (url && !url.startsWith("http") ? url : null), [url]);
  useEffect(() => {
    let c = false;
    (async () => {
      if (!currentPath) { setSigned(null); return; }
      const { data } = await supabase.storage.from("school-assets").createSignedUrl(currentPath, 3600);
      if (!c) setSigned(data?.signedUrl ?? null);
    })();
    return () => { c = true; };
  }, [currentPath]);

  function pick(f: File | null) {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) return toast.error("Format non autorisé");
    if (f.size > MAX_SIZE) return toast.error("Trop volumineux (max 5 Mo)");
    setPending(f);
    setPreview(URL.createObjectURL(f));
  }

  async function upload() {
    if (!pending) return;
    setBusy(true);
    try {
      if (currentPath) await supabase.storage.from("school-assets").remove([currentPath]);
      const ext = pending.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${schoolId}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("school-assets").upload(path, pending, { contentType: pending.type, upsert: true });
      if (error) throw error;
      await supabase.from("schools").update({ [KIND_COL[kind]]: path } as any).eq("id", schoolId);
      onDone(path);
      setPending(null); setPreview(null);
      toast.success(`${label} téléversé`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  const displayed = preview ?? signed;
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="aspect-square rounded border-2 border-dashed bg-muted/30 flex items-center justify-center overflow-hidden">
        {displayed ? <img src={displayed} className="max-h-full max-w-full object-contain p-1" alt={label} /> : <ImageIcon className="size-6 text-muted-foreground" />}
      </div>
      <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      <div className="flex gap-1">
        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs px-2" onClick={() => fileRef.current?.click()}><Upload className="size-3" /> Choisir</Button>
        {pending && <Button size="sm" className="flex-1 gap-1 text-xs px-2" onClick={upload} disabled={busy}>{busy ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}</Button>}
      </div>
    </div>
  );
}

async function signIfPath(val?: string | null): Promise<string> {
  if (!val) return "";
  if (val.startsWith("http") || val.startsWith("data:") || val.startsWith("blob:")) return val;
  const { data } = await supabase.storage.from("school-assets").createSignedUrl(val, 3600);
  return data?.signedUrl ?? "";
}

function esc(s: any): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function fmtGNF(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

async function printTest(form: any) {
  if (!form) return;
  const year = new Date().getFullYear();
  const prefix = (form.receipt_prefix || "REC").toUpperCase();
  const sampleNumber = `${prefix}-${year}-000001-TEST`;

  const logo = await signIfPath(form.logo_url);
  const stamp = await signIfPath(form.school_stamp_url);
  const signature = await signIfPath(form.director_signature_url);

  const qrDataUrl = await QRCode.toDataURL(`${window.location.origin}/verifier-recu/${sampleNumber}`, { width: 200, margin: 1 });

  const accent = form.receipt_accent_color || "#2a5a3e";
  const receiptTitle = form.receipt_title || "REÇU DE PAIEMENT";
  const receiptHeader = form.receipt_header || "";
  const legalNotice = form.receipt_legal_notice || "";
  const footerNote = form.receipt_footer_note || "Reçu généré électroniquement — vérifiable en ligne via QR code.";
  const directorName = form.director_name || "Le Directeur";
  const schoolName = form.name || "MBGEduGuinée";
  const schoolAddress = form.address || "";
  const schoolPhone = form.phone || "";
  const schoolEmail = form.email || "";

  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) { toast.error("Le navigateur a bloqué la fenêtre d'aperçu."); return; }

  w.document.write(`
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçu test</title>
<style>
  @page { size: A5; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; color: #1f2937; margin: 0; padding: 24px; padding-top: 70px !important; position: relative; }
  .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%,-50%) rotate(-25deg); font-size: 90px; color: ${accent}22; font-weight: 800; letter-spacing: 8px; pointer-events: none; z-index: 0; }
  .content { position: relative; z-index: 1; }
  .rheader { text-align: center; font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px dashed #ddd; }
  .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px double ${accent}; padding-bottom: 12px; }
  .header img.logo { height: 64px; width: 64px; object-fit: contain; }
  .header .school { flex: 1; }
  .header h1 { margin: 0; color: ${accent}; font-size: 20px; }
  .header .addr { font-size: 11px; color: #555; margin-top: 2px; }
  .title { text-align: center; margin: 18px 0 8px; font-weight: 700; font-size: 15px; letter-spacing: 3px; color: ${accent}; }
  .subtitle { text-align: center; font-family: monospace; font-size: 13px; margin-bottom: 12px; color: #555; }
  .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 18px; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e5e7eb; font-size: 13px; }
  .row:last-child { border: none; }
  .row strong { color: #444; }
  .total { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 12px 18px; background: ${accent}14; border-radius: 8px; }
  .total .label { font-weight: 600; }
  .total .value { font-size: 20px; font-weight: 700; color: ${accent}; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px; gap: 16px; }
  .sig { text-align: center; flex: 1; }
  .sig .name { font-size: 11px; color: #555; }
  .sig img { max-height: 55px; max-width: 140px; object-fit: contain; margin-bottom: 4px; }
  .sig .line { border-top: 1px solid #333; margin-top: 40px; padding-top: 3px; font-size: 11px; font-weight: 600; }
  .qr { text-align: center; }
  .qr img { width: 90px; height: 90px; }
  .qr .cap { font-size: 9px; color: #666; margin-top: 3px; max-width: 100px; }
  .legal { margin-top: 10px; font-size: 9.5px; color: #666; text-align: center; font-style: italic; border-top: 1px solid #eee; padding-top: 6px; }
  .note { margin-top: 8px; font-size: 10px; color: #888; text-align: center; font-style: italic; }
  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: ${accent}; color: #fff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; z-index: 9999; box-shadow: 0 2px 6px rgba(0,0,0,.15); }
  .toolbar .ttl { font-size: 13px; font-weight: 600; }
  .toolbar button { background: #fff; color: ${accent}; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; }
  .toolbar button.secondary { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,.5); }
  @media print { .toolbar { display: none !important; } body { padding-top: 24px !important; } }
</style>
</head><body>
  <div class="toolbar">
    <span class="ttl">Aperçu du reçu TEST — données fictives</span>
    <div>
      <button class="secondary" onclick="window.close()">Fermer</button>
      <button onclick="window.print()">🖨️ Imprimer</button>
    </div>
  </div>
  <div class="watermark">SPÉCIMEN</div>
  <div class="content">
    ${receiptHeader ? `<div class="rheader">${esc(receiptHeader)}</div>` : ""}
    <div class="header">
      ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : ""}
      <div class="school">
        <h1>${esc(schoolName)}</h1>
        ${schoolAddress ? `<div class="addr">${esc(schoolAddress)}</div>` : ""}
        <div class="addr">${[schoolPhone, schoolEmail].filter(Boolean).map(esc).join(" • ")}</div>
      </div>
    </div>

    <div class="title">${esc(receiptTitle)}</div>
    <div class="subtitle">N° ${esc(sampleNumber)}</div>

    <div class="box">
      <div class="row"><strong>Date</strong><span>${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
      <div class="row"><strong>Élève</strong><span>Aïssatou DIALLO</span></div>
      <div class="row"><strong>Matricule</strong><span>MAT-2025-0042</span></div>
      <div class="row"><strong>Classe</strong><span>6ème A</span></div>
      <div class="row"><strong>Type de paiement</strong><span>Scolarité</span></div>
      <div class="row"><strong>Période</strong><span>Trimestre 1</span></div>
      <div class="row"><strong>Moyen de paiement</strong><span>Orange Money</span></div>
      <div class="row"><strong>Référence transaction</strong><span style="font-family:monospace">OM-TEST-XYZ123</span></div>
    </div>

    <div class="total">
      <span class="label">Montant total payé</span>
      <span class="value">${fmtGNF(450000)} GNF</span>
    </div>

    <div class="footer">
      <div class="sig">
        <div class="qr"><img src="${qrDataUrl}" alt="QR" /><div class="cap">Scannez pour vérifier</div></div>
      </div>
      <div class="sig">
        ${stamp ? `<img src="${stamp}" alt="Cachet" />` : ""}
        <div class="line">Cachet de l'école</div>
      </div>
      <div class="sig">
        ${signature ? `<img src="${signature}" alt="Signature" />` : ""}
        <div class="line">${esc(directorName)}</div>
        <div class="name">Validé par : Comptable (test)</div>
      </div>
    </div>

    ${legalNotice ? `<div class="legal">${esc(legalNotice)}</div>` : ""}
    <div class="note">${esc(footerNote)}</div>
  </div>
</body></html>
  `);
  w.document.close();
}
