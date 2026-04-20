/**
 * Helpers para normalizar valores lidos de células Excel,
 * garantindo formato de data pt-PT (dd/MM/yyyy) e evitando ambiguidades
 * causadas por ficheiros com locale en-US (m/d/yy).
 *
 * USO: usar `XLSX.read(data, { cellDates: true })` E
 *      `sheet_to_json(ws, { header: 1, defval: "", raw: true })` para
 *      receber `Date` nativo nas células de data, e depois passar cada
 *      valor por `cellStr()`.
 */

const PT_LOCALE = "pt-PT";

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function fmtDate(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/**
 * Excel armazena datas como nº de dias desde 1899-12-30 (epoch do Excel).
 * Converte um número de série Excel para Date.
 */
function excelSerialToDate(serial: number): Date | null {
  if (!isFinite(serial) || serial < 1 || serial > 100000) return null;
  // 25569 = dias entre 1900-01-01 e 1970-01-01, ajustado para o bug do 1900 do Excel
  const utcDays = serial - 25569;
  const ms = utcDays * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Tenta normalizar uma string que pareça uma data ambígua tipo "m/d/yy" ou "d/m/yy".
 * Heurística:
 *  - Se 1º componente > 12  → assume d/m/y (deixa como está, normaliza pad)
 *  - Se 2º componente > 12  → assume m/d/y (TROCA para d/m/y)
 *  - Caso contrário → ambíguo. Devolve string original e marca em `ambiguousOut`.
 */
export function normalizeDateString(
  s: string,
  ambiguousOut?: string[]
): string {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return s;
  const a = parseInt(m[1], 10);
  const b = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;

  let day: number;
  let month: number;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  } else if (b > 12 && a <= 12) {
    // Formato m/d/y → trocar
    day = b;
    month = a;
  } else {
    // Ambíguo (ambos ≤ 12): manter como veio mas registar
    if (ambiguousOut) ambiguousOut.push(s);
    return s;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) return s;
  return `${pad2(day)}/${pad2(month)}/${y}`;
}

/**
 * Converte qualquer valor de célula Excel para string normalizada.
 * - Date              → dd/MM/yyyy
 * - número (serial)   → tenta dd/MM/yyyy se parecer data, senão toString()
 * - string ambígua    → tenta normalizar e regista em `ambiguousOut`
 */
export function cellStr(v: unknown, ambiguousOut?: string[]): string {
  if (v == null) return "";
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return "";
    return fmtDate(v);
  }
  if (typeof v === "number") {
    // Heurística: serial Excel típico está entre 1 (1900-01-01) e ~73000 (2099)
    if (v > 59 && v < 80000 && Number.isFinite(v)) {
      const d = excelSerialToDate(v);
      if (d) return fmtDate(d);
    }
    return String(v);
  }
  const s = String(v).trim();
  if (!s) return "";
  // Se parece com data, tentar normalizar
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    return normalizeDateString(s, ambiguousOut);
  }
  return s;
}

export function formatExcelLocale(): string {
  return PT_LOCALE;
}
