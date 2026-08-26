import * as XLSX from "xlsx";

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any, row: any) => string | number;
}

function cell(row: any, c: ExportColumn) {
  const raw = row?.[c.key];
  if (c.format) return c.format(raw, row);
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "boolean") return raw ? "Oui" : "Non";
  return raw as string | number;
}

/* ---------------- CSV ---------------- */
export function toCSV(rows: any[], columns: ExportColumn[]): string {
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = columns.map((c) => esc(c.label)).join(";");
  const body = rows.map((r) => columns.map((c) => esc(cell(r, c))).join(";"));
  return "\uFEFF" + [head, ...body].join("\n");
}

export function downloadCSV(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

/* ---------------- Excel ---------------- */
export function exportExcel(filename: string, rows: any[], columns: ExportColumn[], sheetName = "Rapport") {
  const data = rows.map((r) => {
    const o: Record<string, any> = {};
    columns.forEach((c) => (o[c.label] = cell(r, c)));
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.label) });
  ws["!cols"] = columns.map((c) => ({ wch: Math.max(12, Math.min(40, c.label.length + 6)) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/* ---------------- PDF (via impression navigateur) ---------------- */
export interface PdfMeta {
  schoolName?: string | null;
  schoolAddress?: string | null;
  schoolContact?: string | null;
  academicYear?: string | null;
  logoUrl?: string | null;
  subtitle?: string | null;
  accent?: string | null;
}


export function exportPDF(title: string, rows: any[], columns: ExportColumn[], meta: PdfMeta = {}) {
  const accent = meta.accent || "#1f6f5c";
  const esc = (v: any) =>
    String(v ?? "").replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m] as string);

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color:#1c1a17; margin:0; }
  header { display:flex; align-items:center; gap:14px; border-bottom:3px solid ${accent}; padding-bottom:10px; margin-bottom:14px; }
  header img { height:54px; width:auto; object-fit:contain; }
  .school { font-size:16px; font-weight:700; }
  .addr { font-size:11px; color:#6b6560; }
  h1 { font-size:17px; margin:0; color:${accent}; }
  .sub { font-size:11px; color:#6b6560; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:10.5px; }
  th { background:${accent}; color:#fff; text-align:left; padding:6px 7px; font-weight:600; }
  td { padding:5px 7px; border-bottom:1px solid #e6e1da; }
  tbody tr:nth-child(even) td { background:#faf8f5; }
  tfoot td { font-size:10px; color:#6b6560; padding-top:8px; border:0; }
  @media print { .noprint { display:none; } }
</style></head><body>
<header>
  ${meta.logoUrl ? `<img src="${esc(meta.logoUrl)}" alt="" />` : ""}
  <div style="flex:1">
    <div class="school">${esc(meta.schoolName || "MBGEduGuinée")}</div>
    ${meta.schoolAddress ? `<div class="addr">${esc(meta.schoolAddress)}</div>` : ""}
    ${meta.schoolContact ? `<div class="addr">${esc(meta.schoolContact)}</div>` : ""}
    ${meta.academicYear ? `<div class="addr">Année scolaire : ${esc(meta.academicYear)}</div>` : ""}
  </div>
  <div style="text-align:right">
    <h1>${esc(title)}</h1>
    <div class="sub">${esc(meta.subtitle || "")}${meta.subtitle ? " · " : ""}Généré le ${new Date().toLocaleString("fr-FR")}</div>
  </div>
</header>
<table>
  <thead><tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead>

  <tbody>${rows
    .map((r) => `<tr>${columns.map((c) => `<td>${esc(cell(r, c))}</td>`).join("")}</tr>`)
    .join("")}</tbody>
  <tfoot><tr><td colspan="${columns.length}">${rows.length} ligne(s) — ${esc(meta.schoolName || "MBGEduGuinée")}${meta.schoolContact ? " — " + esc(meta.schoolContact) : ""} · Document généré par MBGEduGuinée</td></tr></tfoot>
</table>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };<\/script>
</body></html>`;

  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const fmtNum = (n: any) => new Intl.NumberFormat("fr-FR").format(Number(n ?? 0));
export const fmtMoney = (n: any) => fmtNum(n) + " GNF";
export const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
export const fmtDateTime = (d: any) => (d ? new Date(d).toLocaleString("fr-FR") : "");
