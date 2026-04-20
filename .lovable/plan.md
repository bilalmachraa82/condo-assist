

## Diagnóstico confirmado

O erro está nos parsers de Excel (`KnowledgeImport.tsx` e `AssemblyImport.tsx`). Ambos usam `XLSX.read(data, { cellDates: true })` + `sheet_to_json(..., { raw: false })`.

**O problema:** com `raw: false`, a biblioteca SheetJS converte datas para string usando o **locale do servidor de origem do ficheiro Excel** (frequentemente `m/d/yy` em ficheiros vindos de versões EN-US do Office). Resultado: `01/06/2026` (1 de Junho) é gravado no conteúdo como `"6/1/26"` — o utilizador lê isto como 6 de Janeiro.

Confirmei na BD: artigos importados a 2026-04-16 nas categorias `extintores`, `elevadores` e seguimento de actas têm dezenas de datas no formato `m/d/yy` embebidas no campo `content` (markdown).

## Plano de resolução (2 partes)

### Parte 1 — Corrigir o código (prevenir futuros erros)

**Ficheiros a alterar:**
1. `src/components/knowledge/KnowledgeImport.tsx`
2. `src/components/assembly/AssemblyImport.tsx`

**Mudanças:**
- Trocar `sheet_to_json(ws, { raw: false, ... })` para `raw: true` para receber `Date` nativo em vez de string pré-formatada.
- Reescrever helper `cellStr` para:
  - Se for `Date` → formatar como `dd/MM/yyyy` (pt-PT) com `date-fns`.
  - Se for número de série Excel (típico quando `cellDates:false`) → converter via `XLSX.SSF.parse_date_code`.
  - Se for string que parece data ambígua (`m/d/yy` ou `d/m/yy`) → tentar detetar e normalizar para `dd/MM/yyyy`.
- Adicionar aviso visual no preview quando datas ambíguas forem detectadas, antes de o utilizador confirmar a importação.

### Parte 2 — Corrigir dados já importados

Criar script de migração one-shot que:
1. Faz `SELECT id, content, created_at FROM knowledge_articles WHERE created_at >= '2026-04-10'` (filtro pelas últimas importações afectadas).
2. Para cada artigo, aplica regex `\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b` ao `content`.
3. Decisão de troca:
   - Se `primeiro > 12` → já é `d/m/y`, deixar.
   - Se `segundo > 12` → é claramente `m/d/y`, **trocar** para `d/m/y` e normalizar para `dd/MM/yyyy`.
   - Se ambos ≤ 12 → **ambíguo**: marcar para revisão manual (lista exportada para CSV em `/mnt/documents/`).
4. Aplica os mesmos passos a `assembly_items.description` e `assembly_items.status_notes`.
5. Faz `UPDATE` em batch via migration SQL (gerada pelo script com os IDs e novos valores).
6. Cria backup das colunas afectadas numa tabela `_backup_dates_20260420` antes de qualquer escrita.

### Validação pós-fix

- Importar de novo um ficheiro de teste e confirmar que datas aparecem `dd/MM/yyyy` no preview e na BD.
- Verificar 5 artigos amostrais que estavam errados (ex: artigo 143 do screenshot) e confirmar correcção.
- Revisar manualmente a lista de "ambíguos" exportada.

## Detalhes técnicos relevantes

- `xlsx@0.18.x` (SheetJS) — usar `XLSX.SSF.format("dd/mm/yyyy", value)` é a alternativa robusta se mantivermos `raw:false`.
- Sem alteração de schema, apenas updates de conteúdo.
- Migração precisa de aprovação (UPDATE em massa).

