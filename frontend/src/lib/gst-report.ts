// GST Report generator — PDF (new window print) + Excel (.xls SpreadsheetML)
// Report modes: SUMMARY (day-wise totals) | DETAILED (invoice/bill-wise)

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const COMPANY_NOISE = new Set(["PVT","LTD","PRIVATE","LIMITED","CO","INC","CORP","AND","THE"]);

/** "2026-02-28" → "28Feb2026" */
function fmtDateSlug(iso: string) {
    const parts = iso.split("-");
    if (parts.length < 3) return iso.replace(/\D/g, "");
    return `${parts[2]}${MONTHS[parseInt(parts[1]) - 1]}${parts[0]}`;
}

/** "BLUEDOTS HEALTHCARE PVT LTD" → "BLUEDOTS_HEALTHCARE" */
function companySlug(name: string) {
    return name.toUpperCase()
        .split(/\s+/)
        .filter(w => !COMPANY_NOISE.has(w.replace(/\./g, "")))
        .slice(0, 2)
        .join("_")
        .replace(/[^A-Z0-9_]/g, "");
}

/** "2026-02-28 to 2026-03-26" → "28Feb2026_26Mar2026" */
function periodSlug(periodLabel: string) {
    const [start, , end] = periodLabel.split(" ");
    if (!start || !end) return periodLabel.replace(/\s+/g, "_");
    return start === end ? fmtDateSlug(start) : `${fmtDateSlug(start)}_${fmtDateSlug(end)}`;
}

function buildFilename(type: ReportType, mode: ReportMode, profile: BusinessProfile, periodLabel: string, ext: string) {
    const co = companySlug(profile.companyName);
    const tp = type === "SALES" ? "GST_Sales" : "GST_Purchase";
    const md = mode === "SUMMARY" ? "Summary" : "Detailed";
    const pd = periodSlug(periodLabel);
    return `${co}_${tp}_${md}_${pd}.${ext}`;
}

export interface BusinessProfile {
    companyName: string;
    address?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    panNo?: string;
    dlNo?: string;
    fssaiNo?: string;
}

/** One row = one invoice (for sales detailed / purchase detailed) */
export interface InvoiceRow {
    refNumber: string;      // invoiceNumber or billNumber
    dateKey: string;        // YYYY-MM-DD (for day grouping)
    date: string;           // display date
    partyName: string;      // customer or supplier name
    partyGstin: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    netAmount: number;
}

export type ReportMode = "SUMMARY" | "DETAILED";
export type ReportType = "SALES" | "PURCHASE";

// ── helpers ──────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toFixed(2);
const x = (v: string | number) =>
    String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function buildDaySummary(rows: InvoiceRow[]) {
    const map = new Map<string, { date: string; count: number; taxable: number; cgst: number; sgst: number; net: number }>();
    for (const r of rows) {
        const existing = map.get(r.dateKey);
        if (existing) {
            existing.count++;
            existing.taxable += r.taxableValue;
            existing.cgst += r.cgst;
            existing.sgst += r.sgst;
            existing.net += r.netAmount;
        } else {
            map.set(r.dateKey, { date: r.date, count: 1, taxable: r.taxableValue, cgst: r.cgst, sgst: r.sgst, net: r.netAmount });
        }
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

// ── HTML helpers ─────────────────────────────────────────────────────────
const thHtml = (v: string) =>
    `<th style="background:#1a3a5c;color:#fff;padding:4px 6px;font-size:9px;font-weight:bold;text-align:center;border:1px solid #aaa">${v}</th>`;
const tdHtml = (v: string | number, right = false, bold = false) =>
    `<td style="border:1px solid #ccc;padding:3px 5px;font-size:9px;${right ? "text-align:right;" : ""}${bold ? "font-weight:bold;" : ""}">${x(v)}</td>`;
const tcHtml = (v: string | number, bold = false) =>
    `<td style="border:1px solid #ccc;padding:3px 5px;font-size:9px;text-align:center;${bold ? "font-weight:bold;" : ""}">${x(v)}</td>`;

// ── Excel helpers ─────────────────────────────────────────────────────────
const thXls = (v: string) =>
    `<td style="background:#1a3a5c;color:white;font-weight:bold;text-align:center;border:1px solid #999;font-size:10px;padding:4px">${x(v)}</td>`;
const tdXls = (v: string | number, right = false, bold = false) =>
    `<td style="border:1px solid #ccc;padding:3px 5px;font-size:9px;${right ? "text-align:right;" : ""}${bold ? "font-weight:bold;" : ""}">${x(v)}</td>`;
const tcXls = (v: string | number, bold = false) =>
    `<td style="border:1px solid #ccc;padding:3px 5px;font-size:9px;text-align:center;${bold ? "font-weight:bold;" : ""}">${x(v)}</td>`;

function companyMeta(p: BusinessProfile) {
    return [
        p.address,
        p.phone && `Ph: ${p.phone}`,
        p.gstin && `GSTIN: ${p.gstin}`,
        p.panNo && `PAN: ${p.panNo}`,
        p.dlNo && `DL No: ${p.dlNo}`,
        p.fssaiNo && `FSSAI: ${p.fssaiNo}`,
    ].filter(Boolean).join("  |  ");
}

// ─────────────────────────────────────────────────────────────────────────
// BUILD TABLE CONTENT  (returns { headerCells, dataRows, totalsCells, colCount })
// ─────────────────────────────────────────────────────────────────────────
function buildContent(
    mode: ReportMode,
    type: ReportType,
    rows: InvoiceRow[],
    htmlMode: boolean  // true = HTML tags, false = XLS tags
) {
    const th = htmlMode ? thHtml : thXls;
    const td = htmlMode ? tdHtml : tdXls;
    const tc = htmlMode ? tcHtml : tcXls;

    const grandTaxable = rows.reduce((a, r) => a + r.taxableValue, 0);
    const grandCgst = rows.reduce((a, r) => a + r.cgst, 0);
    const grandSgst = rows.reduce((a, r) => a + r.sgst, 0);
    const grandNet = rows.reduce((a, r) => a + r.netAmount, 0);

    if (mode === "SUMMARY") {
        const days = buildDaySummary(rows);
        const colCount = 7;
        const headers = `<tr>${[
            th("Date"),
            th("Invoices" + (type === "PURCHASE" ? "/Bills" : "")),
            th("Taxable Value"),
            th("CGST"),
            th("SGST"),
            th("Total GST"),
            th("Net Amount"),
        ].join("")}</tr>`;

        const dataRows = days.map((d, i) => {
            const bg = i % 2 === 0 ? "" : "background:#f7f9fc;";
            return `<tr style="${bg}">
                ${tcHtml(d.date)}
                ${tcHtml(d.count)}
                ${td(fmt(d.taxable), true)}
                ${td(fmt(d.cgst), true)}
                ${td(fmt(d.sgst), true)}
                ${td(fmt(d.cgst + d.sgst), true)}
                ${td(fmt(d.net), true, true)}
            </tr>`;
        }).join("");

        const totalsRow = `<tr style="background:#e8f0fe">
            <td colspan="2" style="text-align:right;font-weight:bold;border:1px solid #aaa;padding:4px 6px;font-size:9px">TOTAL (${days.length} days)</td>
            ${td(fmt(grandTaxable), true, true)}
            ${td(fmt(grandCgst), true, true)}
            ${td(fmt(grandSgst), true, true)}
            ${td(fmt(grandCgst + grandSgst), true, true)}
            ${td(fmt(grandNet), true, true)}
        </tr>`;

        return { headers, dataRows, totalsRow, colCount, grandTaxable, grandCgst, grandSgst, grandNet };
    }

    // DETAILED — one row per invoice/bill
    const partyLabel = type === "SALES" ? "Customer" : "Supplier";
    const refLabel = type === "SALES" ? "Invoice No" : "Bill No";
    const colCount = 9;

    const headers = `<tr>${[
        th("S.No"),
        th(refLabel),
        th("Date"),
        th(partyLabel),
        th("GSTIN"),
        th("Taxable Value"),
        th("CGST"),
        th("SGST"),
        th("Net Amount"),
    ].join("")}</tr>`;

    const dataRows = rows.map((r, i) => {
        const bg = i % 2 === 0 ? "" : "background:#f7f9fc;";
        return `<tr style="${bg}">
            ${tc(i + 1)}
            ${td(r.refNumber)}
            ${tc(r.date)}
            ${td(r.partyName)}
            ${td(r.partyGstin || "—")}
            ${td(fmt(r.taxableValue), true)}
            ${td(fmt(r.cgst), true)}
            ${td(fmt(r.sgst), true)}
            ${td(fmt(r.netAmount), true, true)}
        </tr>`;
    }).join("");

    const totalsRow = `<tr style="background:#e8f0fe">
        <td colspan="5" style="text-align:right;font-weight:bold;border:1px solid #aaa;padding:4px 6px;font-size:9px">TOTAL (${rows.length} ${type === "SALES" ? "invoices" : "bills"})</td>
        ${td(fmt(grandTaxable), true, true)}
        ${td(fmt(grandCgst), true, true)}
        ${td(fmt(grandSgst), true, true)}
        ${td(fmt(grandNet), true, true)}
    </tr>`;

    return { headers, dataRows, totalsRow, colCount, grandTaxable, grandCgst, grandSgst, grandNet };
}

// ─────────────────────────────────────────────────────────────────────────
// PDF — open HTML in new window → Print → Save as PDF
// ─────────────────────────────────────────────────────────────────────────
export function openGstReportPdf(
    mode: ReportMode,
    type: ReportType,
    rows: InvoiceRow[],
    profile: BusinessProfile,
    periodLabel: string
) {
    const typeLabel = type === "SALES" ? "GST SALES REPORT" : "GST PURCHASE REPORT";
    const modeLabel = mode === "SUMMARY" ? "Day-wise Summary" : "Invoice-wise Detailed";
    const title = buildFilename(type, mode, profile, periodLabel, "pdf").replace(/\.pdf$/, "").replace(/_/g, " ");

    const { headers, dataRows, totalsRow, colCount, grandTaxable, grandCgst, grandSgst, grandNet } =
        buildContent(mode, type, rows, true);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:10px; color:#000; padding:12px; }
  .company-name { font-size:20px; font-weight:900; text-transform:uppercase; letter-spacing:1px; }
  .company-sub { font-size:9px; color:#444; margin-top:2px; }
  .report-title { font-size:12px; font-weight:bold; letter-spacing:0.5px; text-align:center;
      border-top:2px solid #000; border-bottom:1px solid #000; padding:3px 0; margin:6px 0 2px; text-transform:uppercase; }
  .report-mode { font-size:9px; text-align:center; color:#555; font-style:italic; margin-bottom:3px; }
  .period { font-size:9px; text-align:center; color:#333; margin-bottom:8px; }
  table { width:100%; border-collapse:collapse; margin-bottom:10px; }
  .header-box { border:2px solid #000; padding:8px 12px; margin-bottom:4px; text-align:center; }
  .grand { font-size:11px; font-weight:bold; text-align:right; margin-top:6px;
      border-top:2px solid #000; padding-top:4px; }
  @media print { body { padding:4px; } }
</style>
</head><body>
<div class="header-box">
  <div class="company-name">${x(profile.companyName)}</div>
  ${profile.address ? `<div class="company-sub">${x(profile.address)}</div>` : ""}
  <div class="company-sub">${x(companyMeta(profile))}</div>
</div>
<div class="report-title">${typeLabel}</div>
<div class="report-mode">${modeLabel}</div>
<div class="period">Period: ${x(periodLabel)} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString("en-IN")}</div>
<table>${headers}${dataRows}${totalsRow}</table>
<div class="grand">
  Taxable: &#8377;${fmt(grandTaxable)} &nbsp;&nbsp;
  CGST: &#8377;${fmt(grandCgst)} &nbsp;&nbsp;
  SGST: &#8377;${fmt(grandSgst)} &nbsp;&nbsp;
  Net Total: &#8377;${fmt(grandNet)}
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { alert("Popup blocked. Please allow popups for this site."); return; }
    win.document.write(html);
    win.document.close();
}

// ─────────────────────────────────────────────────────────────────────────
// EXCEL — .xls via HTML SpreadsheetML
// ─────────────────────────────────────────────────────────────────────────
export function downloadGstReportExcel(
    mode: ReportMode,
    type: ReportType,
    rows: InvoiceRow[],
    profile: BusinessProfile,
    periodLabel: string
) {
    const typeLabel = type === "SALES" ? "GST SALES REPORT" : "GST PURCHASE REPORT";
    const modeLabel = mode === "SUMMARY" ? "Day-wise Summary" : "Invoice-wise Detailed";

    const { headers, dataRows, totalsRow, colCount, grandTaxable, grandCgst, grandSgst, grandNet } =
        buildContent(mode, type, rows, false);

    const meta = companyMeta(profile);

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"></head>
<body>
<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
  <tr><td colspan="${colCount}" style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;padding:6px 0">${x(profile.companyName)}</td></tr>
  ${meta ? `<tr><td colspan="${colCount}" style="font-size:9px;color:#444;padding-bottom:4px">${x(meta)}</td></tr>` : ""}
  <tr><td colspan="${colCount}" style="font-size:13px;font-weight:bold;letter-spacing:1px;border-top:2px solid #000;border-bottom:1px solid #000;padding:4px 0">${typeLabel} — ${modeLabel}</td></tr>
  <tr><td colspan="${colCount}" style="font-size:9px;color:#555;padding-bottom:8px">Period: ${x(periodLabel)} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString("en-IN")}</td></tr>
  ${headers}
  ${dataRows}
  ${totalsRow}
  <tr><td colspan="${colCount}" style="padding-top:10px;font-size:12px;font-weight:bold;text-align:right;border-top:2px solid #000">
    Taxable: ₹${fmt(grandTaxable)} &nbsp;&nbsp; CGST: ₹${fmt(grandCgst)} &nbsp;&nbsp; SGST: ₹${fmt(grandSgst)} &nbsp;&nbsp; Net Total: ₹${fmt(grandNet)}
  </td></tr>
</table>
</body></html>`;

    const filename = buildFilename(type, mode, profile, periodLabel, "xls");
    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=UTF-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
}
