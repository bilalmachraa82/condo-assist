import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { getAssemblyCategoryConfig } from "@/utils/assemblyCategories";
import type { AssemblyItem } from "@/hooks/useAssemblyItems";

interface BuildingGroup {
  buildingCode: number;
  address: string;
  items: AssemblyItem[];
}

interface AssemblyPDFExportButtonProps {
  groups: BuildingGroup[];
  year?: number;
  category?: string;
  status?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  label?: string;
  className?: string;
  iconOnly?: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em Curso",
  done: "Resolvido",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#fee2e2", text: "#991b1b" },
  in_progress: { bg: "#fef3c7", text: "#92400e" },
  done: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#f3f4f6", text: "#374151" },
};

const escapeHtml = (s: string) =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const AssemblyPDFExportButton = ({
  groups,
  year,
  category,
  status,
  variant = "outline",
  size = "default",
  label = "Imprimir PDF",
  className,
  iconOnly = false,
}: AssemblyPDFExportButtonProps) => {
  const handleExport = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalItems = groups.reduce((acc, g) => acc + g.items.length, 0);
    const totalPending = groups.reduce(
      (acc, g) => acc + g.items.filter((i) => i.status === "pending").length,
      0,
    );
    const totalInProgress = groups.reduce(
      (acc, g) => acc + g.items.filter((i) => i.status === "in_progress").length,
      0,
    );
    const totalDone = groups.reduce(
      (acc, g) =>
        acc +
        g.items.filter((i) => i.status === "done" || i.status === "cancelled")
          .length,
      0,
    );

    const yearLabel = year ?? new Date().getFullYear();
    const titleSuffix = groups.length === 1
      ? `Prédio ${String(groups[0].buildingCode).padStart(3, "0")}`
      : `${yearLabel}`;

    const filtersHtml = (category || status)
      ? `<div class="filters">
           <strong>Filtros:</strong>
           ${category ? `<span class="chip">Categoria: ${escapeHtml(getAssemblyCategoryConfig(category).label)}</span>` : ""}
           ${status ? `<span class="chip">Estado: ${escapeHtml(STATUS_LABEL[status] || status)}</span>` : ""}
         </div>`
      : "";

    const groupsHtml = groups
      .map((g) => {
        const code = String(g.buildingCode).padStart(3, "0");
        const pending = g.items.filter((i) => i.status === "pending").length;
        const inProgress = g.items.filter((i) => i.status === "in_progress").length;
        const done = g.items.filter(
          (i) => i.status === "done" || i.status === "cancelled",
        ).length;
        const progressPct = g.items.length
          ? Math.round((done / g.items.length) * 100)
          : 0;

        const rows = g.items
          .map((item) => {
            const cat = item.category
              ? getAssemblyCategoryConfig(item.category)
              : null;
            const sc = STATUS_COLOR[item.status] || STATUS_COLOR.pending;
            return `
              <tr>
                <td class="desc-cell">
                  <div class="desc-text">${escapeHtml(item.description)}</div>
                </td>
                <td class="cat-cell">${cat ? escapeHtml(cat.label) : "—"}</td>
                <td class="status-cell">
                  <span class="status-badge" style="background:${sc.bg};color:${sc.text}">
                    ${STATUS_LABEL[item.status] || item.status}
                  </span>
                </td>
                <td class="notes-cell">${item.status_notes ? escapeHtml(item.status_notes) : ""}</td>
              </tr>`;
          })
          .join("");

        return `
          <section class="building-section">
            <div class="building-header">
              <div class="building-title">
                <span class="building-code">${code}</span>
                <span class="building-address">${escapeHtml(g.address || "")}</span>
              </div>
              <div class="building-meta">${g.items.length} assunto${g.items.length !== 1 ? "s" : ""}</div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="width:42%">Descrição</th>
                  <th style="width:14%">Categoria</th>
                  <th style="width:14%">Estado</th>
                  <th style="width:30%">Notas / Seguimento</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>

            <div class="building-summary">
              <div class="summary-stats">
                <span class="stat"><span class="dot dot-pending"></span>${pending} pendente${pending !== 1 ? "s" : ""}</span>
                <span class="stat"><span class="dot dot-progress"></span>${inProgress} em curso</span>
                <span class="stat"><span class="dot dot-done"></span>${done} resolvido${done !== 1 ? "s" : ""}</span>
              </div>
              <div class="progress-wrap">
                <div class="progress-bar"><div class="progress-fill" style="width:${progressPct}%"></div></div>
                <span class="progress-pct">${progressPct}%</span>
              </div>
            </div>
          </section>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-PT">
<head>
<meta charset="UTF-8" />
<title>Seguimento de Actas — ${titleSuffix}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    color: #1f2937;
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
  }
  .cover {
    text-align: center;
    padding: 60px 20px 40px;
    border-bottom: 3px solid #1e3a8a;
    margin-bottom: 24px;
    page-break-after: avoid;
  }
  .cover img { height: 90px; margin-bottom: 16px; }
  .cover .brand { font-size: 16px; font-weight: 700; color: #1e3a8a; margin-bottom: 24px; }
  .cover h1 { font-size: 26px; font-weight: 800; margin: 0 0 8px; color: #111827; }
  .cover .subtitle { font-size: 13px; color: #6b7280; margin-top: 6px; }
  .cover .meta { font-size: 11px; color: #9ca3af; margin-top: 16px; }

  .filters { margin: 12px 0 18px; padding: 10px 12px; background: #f9fafb; border-left: 3px solid #1e3a8a; border-radius: 4px; font-size: 11px; }
  .chip { display: inline-block; margin-left: 8px; padding: 2px 8px; background: #e0e7ff; color: #1e3a8a; border-radius: 10px; font-size: 10px; font-weight: 500; }

  .global-summary {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px;
  }
  .global-stat { text-align: center; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px; }
  .global-stat .v { font-size: 20px; font-weight: 700; }
  .global-stat .l { font-size: 10px; color: #6b7280; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }

  .building-section {
    page-break-inside: avoid;
    margin-bottom: 22px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
  }
  .building-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 14px; background: #1e3a8a; color: white;
  }
  .building-title { font-size: 13px; font-weight: 600; }
  .building-code { font-family: ui-monospace, monospace; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; margin-right: 10px; }
  .building-address { font-weight: 400; opacity: 0.95; }
  .building-meta { font-size: 10px; opacity: 0.9; }

  .items-table { width: 100%; border-collapse: collapse; }
  .items-table th {
    background: #f3f4f6; text-align: left; font-size: 10px; font-weight: 600;
    padding: 8px 10px; border-bottom: 1px solid #e5e7eb; color: #374151;
    text-transform: uppercase; letter-spacing: 0.3px;
  }
  .items-table td {
    padding: 8px 10px; border-bottom: 1px solid #f3f4f6; vertical-align: top; font-size: 11px;
  }
  .items-table tr:last-child td { border-bottom: none; }
  .desc-text { font-weight: 500; color: #111827; }
  .cat-cell { color: #6b7280; font-size: 10px; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .notes-cell { color: #4b5563; font-style: italic; font-size: 10px; white-space: pre-wrap; }

  .building-summary {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 14px; background: #fafafa; border-top: 1px solid #e5e7eb;
    font-size: 10px;
  }
  .summary-stats { display: flex; gap: 14px; }
  .stat { display: inline-flex; align-items: center; gap: 5px; color: #4b5563; }
  .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  .dot-pending { background: #ef4444; }
  .dot-progress { background: #eab308; }
  .dot-done { background: #22c55e; }
  .progress-wrap { display: flex; align-items: center; gap: 8px; min-width: 140px; }
  .progress-bar { flex: 1; height: 5px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #16a34a); }
  .progress-pct { font-weight: 600; color: #166534; min-width: 30px; text-align: right; }

  .footer {
    position: fixed; bottom: 6mm; left: 0; right: 0; text-align: center;
    font-size: 9px; color: #9ca3af; padding-top: 6px; border-top: 1px solid #e5e7eb;
  }

  @media print {
    .no-print { display: none; }
    .building-section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="cover">
    <img src="${window.location.origin}/lovable-uploads/9e67bd21-c565-405a-918d-e9aac10336e8.png" alt="Luvimg" />
    <div class="brand">Luvimg Condomínios, Lda</div>
    <h1>Seguimento de Actas</h1>
    <div class="subtitle">${titleSuffix}</div>
    <div class="meta">
      Emitido em ${new Date().toLocaleDateString("pt-PT")} às ${new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
      · ${groups.length} prédio${groups.length !== 1 ? "s" : ""} · ${totalItems} assunto${totalItems !== 1 ? "s" : ""}
    </div>
  </div>

  ${filtersHtml}

  <div class="global-summary">
    <div class="global-stat"><div class="v" style="color:#111827">${totalItems}</div><div class="l">Total</div></div>
    <div class="global-stat"><div class="v" style="color:#dc2626">${totalPending}</div><div class="l">Pendentes</div></div>
    <div class="global-stat"><div class="v" style="color:#ca8a04">${totalInProgress}</div><div class="l">Em Curso</div></div>
    <div class="global-stat"><div class="v" style="color:#16a34a">${totalDone}</div><div class="l">Resolvidos</div></div>
  </div>

  ${groupsHtml}

  <div class="footer">
    Luvimg Condomínios, Lda · geral@luvimg.com · Documento gerado automaticamente
  </div>

  <script>
    window.onload = () => { setTimeout(() => window.print(), 300); };
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (iconOnly) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleExport(); }}
        className={className ?? "p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"}
        title="Imprimir PDF deste prédio"
        aria-label="Imprimir PDF deste prédio"
      >
        <Printer className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <Button onClick={handleExport} variant={variant} size={size === "icon" ? "default" : size} className={className}>
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
};

export default AssemblyPDFExportButton;
