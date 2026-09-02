import type { PdfMeta } from "@/lib/reports";

const esc = (v: any) =>
  String(v ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m] as string);

const LEVEL_STYLE: Record<string, { label: string; icon: string; color: string }> = {
  acquis: { label: "Acquis", icon: "★★★", color: "#1f8a5b" },
  en_cours: { label: "En cours d'acquisition", icon: "★★☆", color: "#d08700" },
  a_travailler: { label: "À travailler", icon: "★☆☆", color: "#c0392b" },
};

function header(meta: PdfMeta, title: string, subtitle?: string) {
  const accent = meta.accent || "#1f6f5c";
  return `<header>
  ${meta.logoUrl ? `<img src="${esc(meta.logoUrl)}" alt="" />` : ""}
  <div style="flex:1">
    <div class="school">${esc(meta.schoolName || "MBGEduGuinée")}</div>
    ${meta.schoolAddress ? `<div class="addr">${esc(meta.schoolAddress)}</div>` : ""}
    ${meta.schoolContact ? `<div class="addr">${esc(meta.schoolContact)}</div>` : ""}
    ${meta.academicYear ? `<div class="addr">Année scolaire : ${esc(meta.academicYear)}</div>` : ""}
  </div>
  <div style="text-align:right">
    <h1 style="color:${accent}">${esc(title)}</h1>
    <div class="sub">${esc(subtitle || "")}</div>
  </div>
</header>`;
}

function styles(meta: PdfMeta) {
  const accent = meta.accent || "#1f6f5c";
  return `<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing:border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color:#1c1a17; margin:0; }
  header { display:flex; align-items:center; gap:14px; border-bottom:3px solid ${accent}; padding-bottom:10px; margin-bottom:16px; }
  header img { height:56px; width:auto; object-fit:contain; }
  .school { font-size:16px; font-weight:700; }
  .addr { font-size:11px; color:#6b6560; }
  h1 { font-size:17px; margin:0; }
  .sub { font-size:11px; color:#6b6560; margin-top:2px; }
  .idbox { display:flex; gap:24px; background:#faf8f5; border:1px solid #e6e1da; border-radius:10px; padding:10px 14px; font-size:12px; margin-bottom:14px; }
  .idbox b { display:block; font-size:10px; color:#6b6560; font-weight:600; }
  h2 { font-size:13px; margin:16px 0 6px; color:${accent}; }
  table { width:100%; border-collapse:collapse; font-size:11.5px; }
  th { background:${accent}; color:#fff; text-align:left; padding:6px 8px; }
  td { padding:6px 8px; border-bottom:1px solid #e6e1da; vertical-align:top; }
  .lvl { font-weight:700; white-space:nowrap; }
  .legend { margin-top:14px; font-size:10.5px; color:#6b6560; }
  .sign { margin-top:28px; display:flex; justify-content:space-between; font-size:11px; }
  .sign div { width:45%; border-top:1px solid #cfc9c1; padding-top:6px; }
  footer { margin-top:18px; font-size:10px; color:#6b6560; text-align:center; }
</style>`;
}

function open(html: string) {
  const w = window.open("", "_blank", "width=1000,height=900");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

const domainLabels: Record<string, string> = {
  langage: "Langage",
  motricite: "Motricité",
  socialisation: "Socialisation",
  autonomie: "Autonomie",
  eveil: "Éveil / créativité",
};

export interface NurseryEvaluationRow {
  level: string;
  comment?: string | null;
  nursery_competencies?: { label?: string | null; domain?: string | null } | null;
}

/** Bulletin maternelle : niveaux illustrés par couleurs et pictogrammes, sans notes chiffrées. */
export function printNurseryBulletin(opts: {
  meta: PdfMeta;
  childName: string;
  sectionName?: string | null;
  period: string;
  rows: NurseryEvaluationRow[];
  teacherComment?: string | null;
}) {
  const { meta, childName, sectionName, period, rows } = opts;
  const byDomain = new Map<string, NurseryEvaluationRow[]>();
  rows.forEach((r) => {
    const d = r.nursery_competencies?.domain ?? "autres";
    byDomain.set(d, [...(byDomain.get(d) ?? []), r]);
  });

  const body = [...byDomain.entries()]
    .map(
      ([domain, list]) => `<h2>${esc(domainLabels[domain] ?? domain)}</h2>
<table><thead><tr><th style="width:55%">Compétence</th><th style="width:20%">Niveau</th><th>Observation</th></tr></thead>
<tbody>${list
        .map((r) => {
          const s = LEVEL_STYLE[r.level] ?? { label: r.level, icon: "", color: "#6b6560" };
          return `<tr><td>${esc(r.nursery_competencies?.label ?? "—")}</td>
<td class="lvl" style="color:${s.color}">${s.icon} ${esc(s.label)}</td>
<td>${esc(r.comment || "")}</td></tr>`;
        })
        .join("")}</tbody></table>`,
    )
    .join("");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<title>Bulletin maternelle — ${esc(childName)}</title>${styles(meta)}</head><body>
${header(meta, "Bulletin maternelle", `${esc(period)} · Généré le ${new Date().toLocaleDateString("fr-FR")}`)}
<div class="idbox">
  <div><b>Enfant</b>${esc(childName)}</div>
  <div><b>Section</b>${esc(sectionName || "—")}</div>
  <div><b>Période</b>${esc(period)}</div>
</div>
${body || "<p>Aucune évaluation enregistrée pour cette période.</p>"}
${opts.teacherComment ? `<h2>Appréciation de la monitrice</h2><p style="font-size:11.5px">${esc(opts.teacherComment)}</p>` : ""}
<div class="legend">Légende : ★★★ Acquis · ★★☆ En cours d'acquisition · ★☆☆ À travailler</div>
<div class="sign"><div>Signature de la monitrice</div><div>Signature des parents</div></div>
<footer>Document généré par MBGEduGuinée</footer>
<script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
</body></html>`;
  return open(html);
}

/** Fiche de suivi quotidien à remettre / envoyer aux parents. */
export function printDailyLog(opts: {
  meta: PdfMeta;
  childName: string;
  sectionName?: string | null;
  date: string;
  items: { label: string; value: string }[];
  parentComment?: string | null;
}) {
  const { meta, childName, sectionName, date, items } = opts;
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<title>Suivi quotidien — ${esc(childName)}</title>${styles(meta)}</head><body>
${header(meta, "Suivi quotidien", `Journée du ${esc(date)}`)}
<div class="idbox">
  <div><b>Enfant</b>${esc(childName)}</div>
  <div><b>Section</b>${esc(sectionName || "—")}</div>
  <div><b>Date</b>${esc(date)}</div>
</div>
<table><tbody>${items
    .map((i) => `<tr><td style="width:35%;font-weight:600">${esc(i.label)}</td><td>${esc(i.value || "—")}</td></tr>`)
    .join("")}</tbody></table>
${opts.parentComment ? `<h2>Message aux parents</h2><p style="font-size:12px">${esc(opts.parentComment)}</p>` : ""}
<div class="sign"><div>Signature de la monitrice</div><div>Signature des parents</div></div>
<footer>Document généré par MBGEduGuinée</footer>
<script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
</body></html>`;
  return open(html);
}

export function dailyLogMessage(childName: string, date: string, items: { label: string; value: string }[], parentComment?: string | null) {
  const lines = items.map((i) => `• ${i.label} : ${i.value || "—"}`).join("\n");
  return `Suivi du ${date} — ${childName}\n${lines}${parentComment ? `\n\nMessage : ${parentComment}` : ""}`;
}
