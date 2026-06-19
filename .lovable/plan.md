## Plano R1 — pronto para implementar

PDF de amostra anónimo recebido. Carrega em **Implementar plano** para eu poder escrever os ficheiros (estou bloqueado em plan mode).

## Ficheiros a alterar

1. `supabase/functions/parse-pendency-pdf/index.ts` — reescrita completa
2. `src/components/pendencies/CreatePendencyDialog.tsx` — `touchedRef` + `fileKey`
3. `src/components/pendencies/PendencyDetail.tsx` — assunto controlado + upload `Promise.allSettled`

Sem migrations (auditoria do schema não revelou falta para o R1).

## Mudanças por ficheiro

**`parse-pendency-pdf/index.ts`**
- AuthN: `supabase.auth.getUser(token)` → 401 sem token.
- AuthZ: `rpc("is_admin")` → 403 não-admin (mesmo padrão de `upload-pendency-file`).
- Rate limit: 20 chamadas / 10 min por user via `agent_api_rate_limit`.
- Formato PDF correto: bloco `{ type: "file", file: { filename, file_data: dataUrl } }` (doc Lovable AI Gateway multimodal). Imagens continuam em `image_url`. Outros MIME → 415.
- Tamanho > 15 MB → 413.
- Resposta IA vazia (sem `title`/`subject`/`description`/`building_hint`) → 422 com aviso explícito "possível PDF digitalizado sem texto", em vez de 200 silencioso.
- Logs: só `mime`, `bytes`, `status`, `model`, duração. Nunca corpo da IA nem texto do PDF (RGPD).

**`CreatePendencyDialog.tsx`**
- `touchedRef = { title, subject, description, building, supplier, priority }`. Marcado `true` no primeiro `onChange`.
- Reset ao mudar `open` ou `file`.
- `activeFileKeyRef = ${name}:${size}:${lastModified}`. Resposta IA descartada se `fileKey` mudou entretanto.
- Auto-fill dispara automaticamente uma vez por `fileKey` (botão manual mantido).
- IA só preenche campos com `touched === false`.

**`PendencyDetail.tsx`**
- `titleDraft` e `subjectDraft` controlados, reinicializados em `useEffect([p.id])`.
- Flush no `onBlur` e ao fechar o `Sheet` se há draft pendente.
- Upload múltiplo: `Promise.allSettled`, toast com `${ok} anexado(s), ${fail} falha(s)`, `input.value = ""` no `finally`, validação client-side de 15 MB com mensagem PT-PT.

## Validação prevista

1. Build (automático na plataforma).
2. Edge function: `supabase--curl_edge_functions` com o PDF anónimo (admin token automático) → confirmar 200 + JSON preenchido.
3. Mesma chamada sem token → 401; com token não-admin (se existir) → 403.
4. Teste visual Playwright headless: anexar PDF no dialog, ver auto-fill; editar título durante análise não é sobrescrito; trocar de ficheiro descarta resposta antiga.
5. Editar assunto na pendência, fechar/reabrir → persistente.
6. Upload de 3 ficheiros (1 demasiado grande) → 2 ok + toast de falha parcial.

## Relatório final que vou entregar

Conforme acordado:
> *"Formato PDF corrigido tecnicamente, validação real com PDF do André ainda pendente."*

Para LUV-002 reportarei `sim` apenas se o PDF anónimo passar a chamada real; caso contrário fica `parcial` com a frase acima.

Pendentes fase 2: PDFs Luvimg de contas correntes (`relovimgcontascorrentes`), assistências com código postal, atas =136=, dedupe — fora do âmbito deste R1.
