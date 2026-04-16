/** Parse status from Excel column D */
export function parseStatus(raw: string | null | undefined): { status: string; status_notes: string | null } {
  if (!raw || !raw.trim()) return { status: "pending", status_notes: null };
  const s = raw.trim();
  const lower = s.toLowerCase();

  if (lower === "ok") return { status: "done", status_notes: null };
  if (/^ok\.\s*feita/i.test(s)) return { status: "done", status_notes: s.replace(/^ok\.\s*/i, "") };
  if (/^ok\.\s*/i.test(s)) return { status: "in_progress", status_notes: s.replace(/^ok\.\s*/i, "") };

  return { status: "pending", status_notes: null };
}

/** Detect category from description text */
export function detectCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("caleira") || lower.includes("tubo de queda")) return "limpeza_caleiras";
  if (lower.includes("elevador") || lower.includes("ascensor")) return "elevadores";
  if (lower.includes("fachada") || lower.includes("reboco") || lower.includes("infiltra")) return "fachada";
  if (lower.includes("seguro") || lower.includes("apólice")) return "seguros";
  if (lower.includes("intercomunicador") || lower.includes("campainha") || lower.includes("videoporteiro")) return "intercomunicadores";
  if (lower.includes("limpeza")) return "limpeza";
  if (lower.includes("coluna elétrica") || lower.includes("coluna electrica") || lower.includes("reaperto")) return "colunas_eletricas";
  if (lower.includes("cobertura") || lower.includes("telhado")) return "cobertura";
  if (lower.includes("portão") || lower.includes("porta de entrada")) return "portoes";
  if (lower.includes("gás") || lower.includes("gas")) return "gas";
  if (lower.includes("orçamento") || lower.includes("obra")) return "obras";
  return "geral";
}

/** Extract monetary amounts from text */
export function extractAmount(text: string): number | null {
  // Match patterns like "33.550€", "33 550 euros", "1.300,00€", "33550.00"
  const patterns = [
    /(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*€/,
    /(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)\s*euros?/i,
    /€\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)/,
    /valor\s+(?:total\s+)?(?:de\s+)?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)/i,
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match) {
      const raw = match[1]
        .replace(/\s/g, "")  // remove spaces
        .replace(/\./g, "")  // remove thousand separators
        .replace(",", ".");  // decimal comma to dot
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}

/** Detect if text contains urgency keywords */
export function isUrgent(text: string): boolean {
  const lower = text.toLowerCase();
  return /urgente|imediato|brevidade|priorit[aá]rio|emergência/.test(lower);
}
