/**
 * Incident Report Exporter.
 *
 * Packages the active investigation into a standard incident report for
 * leadership / security-ops documentation, in two formats:
 *
 *  - JSON  : structured machine-readable report, persisted through the
 *            Rust `export_report_file` command (falls back to a browser
 *            download when running outside the Tauri WebView).
 *  - PDF   : auto-formatted printable document rendered into a hidden
 *            iframe and sent to the system print pipeline — choosing
 *            "Save as PDF" produces the offline document. No extra
 *            dependencies required.
 *
 * Report contents: metadata, executive summary + key findings, key pivot
 * nodes, risk indicators, and a full entity inventory.
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  InvestigationPayload,
  RiskAssessment,
  IntelligenceSummary,
} from "./types";

/** Structured incident report handed to both export formats. */
export interface IncidentReport {
  report_type: "threatscope_incident_report";
  generated_at: string;
  investigation: {
    id: string;
    seed_value: string;
    seed_type: string;
    created_at: string;
    entity_count: number;
    relationship_count: number;
    category_breakdown: Record<string, number>;
  };
  executive_summary: {
    summary: string;
    key_findings: string[];
    pivot_opportunities: string[];
    remediation_steps: string[];
    target_opsec_awareness: string;
  };
  key_pivot_nodes: Array<{
    canonical_id: string;
    label: string;
    category: string;
  }>;
  risk_indicators: {
    level: string;
    score: number;
    confidence_delta?: number;
    velocity_badge?: string;
    triggered_rules: string[];
  };
  entity_inventory: Array<{
    canonical_id: string;
    label: string;
    category: string;
    is_key_pivot_node: boolean;
  }>;
}

/** True when running inside the Tauri WebView (IPC available). */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** Builds the structured incident report from live investigation state. */
export function buildIncidentReport(
  payload: InvestigationPayload,
  risk: RiskAssessment,
  narrative: IntelligenceSummary
): IncidentReport {
  const keyPivotNodes = payload.nodes
    .filter((n) => n.metadata?.is_key_pivot_node)
    .map((n) => ({
      canonical_id: n.canonical_id,
      label: n.label,
      category: n.category,
    }));

  const categoryBreakdown = payload.nodes.reduce<Record<string, number>>(
    (acc, node) => {
      acc[node.category] = (acc[node.category] ?? 0) + 1;
      return acc;
    },
    {}
  );

  return {
    report_type: "threatscope_incident_report",
    generated_at: new Date().toISOString(),
    investigation: {
      id: payload.id,
      seed_value: payload.seed.value,
      seed_type: payload.seed.seed_type,
      created_at: payload.created_at,
      entity_count: payload.nodes.length,
      relationship_count: payload.edges.length,
      category_breakdown: categoryBreakdown,
    },
    executive_summary: {
      summary: narrative.executive_summary,
      key_findings: narrative.key_findings,
      pivot_opportunities: narrative.pivot_opportunities,
      remediation_steps: narrative.remediation_steps,
      target_opsec_awareness: narrative.target_opsec_awareness,
    },
    key_pivot_nodes: keyPivotNodes,
    risk_indicators: {
      level: risk.level,
      score: risk.score,
      confidence_delta: risk.confidence_delta,
      velocity_badge: risk.velocity_badge,
      triggered_rules: risk.triggered_rules,
    },
    entity_inventory: payload.nodes.map((n) => ({
      canonical_id: n.canonical_id,
      label: n.label,
      category: n.category,
      is_key_pivot_node: !!n.metadata?.is_key_pivot_node,
    })),
  };
}

/** Filesystem-safe timestamp for report filenames, e.g. 20260822-141503. */
function fileTimestamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

function reportFileName(report: IncidentReport, extension: "json" | "html"): string {
  const seedSlug =
    report.investigation.seed_value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40) ||
    "investigation";
  return `ThreatScope_Report_${seedSlug}_${fileTimestamp()}.${extension}`;
}

/** Triggers a plain-browser download (used outside the Tauri WebView). */
function downloadBlob(contents: string, filename: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Exports the report as pretty-printed JSON.
 * Returns a human-readable destination description for UI confirmation.
 */
export async function exportReportJson(report: IncidentReport): Promise<string> {
  const filename = reportFileName(report, "json");
  const contents = JSON.stringify(report, null, 2);

  if (isTauri()) {
    // Persisted by the std-only Rust helper — no dialog/fs plugins needed.
    return await invoke<string>("export_report_file", { contents, filename });
  }
  downloadBlob(contents, filename, "application/json");
  return `browser download: ${filename}`;
}

/** Renders the auto-formatted HTML incident report used for PDF printing. */
export function renderReportHtml(report: IncidentReport): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const list = (items: string[]) =>
    items.length
      ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
      : "<p class='muted'>None recorded.</p>";

  const pivotRows = report.key_pivot_nodes.length
    ? report.key_pivot_nodes
        .map(
          (n) =>
            `<tr><td class="mono">${esc(n.canonical_id)}</td><td>${esc(n.label)}</td><td>${esc(n.category)}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="3" class="muted">No key pivot nodes identified.</td></tr>`;

  const inventoryRows = report.entity_inventory
    .map(
      (n) =>
        `<tr><td class="mono">${esc(n.canonical_id)}</td><td>${esc(n.label)}</td><td>${esc(n.category)}</td><td>${
          n.is_key_pivot_node ? "&#9888; Yes" : "No"
        }</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ThreatScope Incident Report — ${esc(report.investigation.seed_value)}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 12px; line-height: 1.55; margin: 0; }
  header { border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 20px; }
  header h1 { margin: 0; font-size: 20px; letter-spacing: 0.5px; }
  header .sub { color: #64748b; font-size: 11px; margin-top: 2px; }
  .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 24px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; }
  .meta-grid div span.k { display: block; text-transform: uppercase; font-size: 9px; letter-spacing: 1px; color: #64748b; }
  .meta-grid div span.v { font-weight: 600; word-break: break-all; }
  section { margin-bottom: 20px; page-break-inside: avoid; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: #1d4ed8; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #f1f5f9; text-align: left; text-transform: uppercase; font-size: 9px; letter-spacing: 1px; color: #475569; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; }
  .mono { font-family: Consolas, monospace; font-size: 10px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 11px; border: 1px solid; }
  .badge.high { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
  .badge.low { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
  .score-track { background: #e2e8f0; height: 8px; border-radius: 999px; overflow: hidden; max-width: 420px; }
  .score-fill { height: 100%; background: ${report.risk_indicators.score > 60 ? "#dc2626" : "#2563eb"}; width: ${report.risk_indicators.score}%; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin-bottom: 3px; }
  .muted { color: #94a3b8; font-style: italic; }
  footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 8px; color: #94a3b8; font-size: 9px; }
</style>
</head>
<body>
  <header>
    <h1>ThreatScope OSINT &mdash; Incident Report</h1>
    <div class="sub">Desktop Threat Intelligence Engine &bull; Confidential &mdash; For Internal Distribution</div>
  </header>

  <div class="meta-grid">
    <div><span class="k">Generated</span><span class="v">${esc(report.generated_at)}</span></div>
    <div><span class="k">Investigation ID</span><span class="v mono">${esc(report.investigation.id)}</span></div>
    <div><span class="k">Seed Target</span><span class="v">${esc(report.investigation.seed_value)}</span></div>
    <div><span class="k">Seed Type</span><span class="v">${esc(report.investigation.seed_type)}</span></div>
    <div><span class="k">Entities / Relationships</span><span class="v">${report.investigation.entity_count} / ${report.investigation.relationship_count}</span></div>
    <div><span class="k">Risk Level</span><span class="v"><span class="badge ${report.risk_indicators.score > 60 || report.risk_indicators.level === "HIGH" || report.risk_indicators.level === "CRITICAL" ? "high" : "low"}">${esc(report.risk_indicators.level)}</span></span></div>
  </div>

  <section>
    <h2>1 &middot; Executive Summary</h2>
    <p>${esc(report.executive_summary.summary)}</p>
    ${list(report.executive_summary.key_findings)}
    <p><strong>Pivot Opportunities:</strong></p>
    ${list(report.executive_summary.pivot_opportunities)}
    <p><strong>Recommended Actions:</strong></p>
    ${list(report.executive_summary.remediation_steps)}
    <p class="muted">Target OPSEC awareness: ${esc(report.executive_summary.target_opsec_awareness)}</p>
  </section>

  <section>
    <h2>2 &middot; Key Pivot Nodes</h2>
    <table>
      <thead><tr><th>Canonical ID</th><th>Label</th><th>Category</th></tr></thead>
      <tbody>${pivotRows}</tbody>
    </table>
  </section>

  <section>
    <h2>3 &middot; Risk Indicators</h2>
    <p><strong>Threat Score:</strong> ${report.risk_indicators.score} / 100</p>
    <div class="score-track"><div class="score-fill"></div></div>
    ${report.risk_indicators.velocity_badge ? `<p style="margin-top:8px"><strong>Velocity:</strong> ${esc(report.risk_indicators.velocity_badge)}</p>` : ""}
    <p style="margin-top:8px"><strong>Triggered Rules:</strong></p>
    ${list(report.risk_indicators.triggered_rules)}
  </section>

  <section>
    <h2>Appendix &middot; Entity Inventory (${report.entity_inventory.length})</h2>
    <table>
      <thead><tr><th>Canonical ID</th><th>Label</th><th>Category</th><th>Key Pivot</th></tr></thead>
      <tbody>${inventoryRows}</tbody>
    </table>
  </section>

  <footer>Generated by ThreatScope v0.1.0 on ${esc(report.generated_at)}. Classification handling per recipient org policy.</footer>
</body>
</html>`;
}

/**
 * Opens the auto-formatted report in the system print pipeline.
 * The analyst selects "Save as PDF" (or a physical printer) for the
 * offline document. The iframe is cleaned up automatically.
 */
export function exportReportPdf(report: IncidentReport): void {
  const html = renderReportHtml(report);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
  } as Partial<CSSStyleDeclaration>);

  iframe.onload = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.addEventListener("afterprint", () => setTimeout(() => iframe.remove(), 500));
    setTimeout(() => {
      win.focus();
      win.print();
      // Safety cleanup if afterprint never fires.
      setTimeout(() => iframe.remove(), 120000);
    }, 250);
  };

  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    throw new Error("Could not initialize the print renderer.");
  }
  doc.open();
  doc.write(html);
  doc.close();
}