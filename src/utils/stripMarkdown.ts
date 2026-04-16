/**
 * Strip markdown formatting syntax while preserving text, dates, and numbers.
 * Removes: #, **, *, _, |, >, - list markers, table delimiters
 * Preserves: text content, dates (15/01/2026), numbers, punctuation
 */
export function stripMarkdown(md: string): string {
  return md
    // Remove heading markers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Remove unordered list markers (but not hyphens in words like "self-service")
    .replace(/^[-*+]\s+/gm, "")
    // Remove table delimiters (lines with only |, -, :, spaces)
    .replace(/^\|?[\s|:-]+\|?$/gm, "")
    // Remove table pipes but keep cell content
    .replace(/\|/g, " ")
    // Remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    // Collapse multiple spaces
    .replace(/  +/g, " ")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim each line
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join(" ")
    .trim();
}

/** Inline tests — call stripMarkdown.test() in dev console */
stripMarkdown.test = () => {
  const assert = (input: string, expected: string, label: string) => {
    const result = stripMarkdown(input);
    const pass = result === expected;
    if (!pass) {
      console.error(`FAIL [${label}]:\n  input:    ${JSON.stringify(input)}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(result)}`);
    } else {
      console.log(`PASS [${label}]`);
    }
    return pass;
  };

  let all = true;
  all = assert("## Administrador\n- **Nome:** João", "Administrador Nome: João", "headings + bold + list") && all;
  all = assert("**Data: 15/01/2026**", "Data: 15/01/2026", "bold with date") && all;
  all = assert("| Campo | Valor |\n|---|---|\n| Nome | Ana |", "Campo Valor Nome Ana", "table") && all;
  all = assert("> Nota importante", "Nota importante", "blockquote") && all;
  all = assert("# Título\n\n\n\nTexto", "Título Texto", "collapse newlines") && all;
  all = assert("Texto *itálico* e __bold__", "Texto itálico e bold", "mixed formatting") && all;
  all = assert("`código` inline", "código inline", "inline code") && all;
  all = assert("[link](http://x.com)", "link", "link") && all;
  all = assert("self-service", "self-service", "hyphen in word preserved") && all;

  console.log(all ? "✅ All stripMarkdown tests passed" : "❌ Some tests failed");
  return all;
};
