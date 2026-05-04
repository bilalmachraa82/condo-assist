# Fix: Erro ao anexar PDF na criação de pendência de email

## Diagnóstico

O cliente vê um toast "Erro: Edge Function returned a non-2xx status code" ao criar uma pendência com PDF anexo. A função `upload-pendency-file` está em produção mas:

- **Não há logs registados** — sugere que o erro acontece muito cedo (auth/parse) ou os logs nunca chegam a ser flushed devido a falhas silenciosas.
- **Não há observabilidade**: a função devolve mensagens genéricas ("Upload failed", "DB insert failed") sem incluir `console.error`, então é impossível diagnosticar pelos logs do Supabase.
- **Possíveis causas** identificadas no código atual:
  1. MIME normalization frágil — alguns browsers enviam `application/pdf; charset=binary` ou variações que não estão no whitelist `ALLOWED_MIME`.
  2. Decode base64 sem tratar whitespace — data URLs podem conter `\n` que partem `atob()`.
  3. Sanitização do nome de ficheiro: `=82=.pdf` (visto no print do utilizador) — passa, mas nomes longos ou com caracteres unicode podem produzir paths estranhos.
  4. Token Authorization parsing case-sensitive (`replace("Bearer ", "")`) falha se vier `bearer ` minúsculo.
  5. Sem mensagens de erro em PT-PT para o utilizador final.
  6. Sem `console.error` em **nenhum** ramo de erro → impossível debugar pelos logs.

## Correções

Reescrever `supabase/functions/upload-pendency-file/index.ts`:

1. **Adicionar `console.error/warn/log` em todos os ramos** com prefixo `[upload-pendency-file]` para diagnóstico nos logs.
2. **MIME robusto**: normalizar para lowercase + remover `;charset=...`. Aceitar também `image/jpg` e `image/gif`.
3. **Base64 decode robusto**: limpar whitespace antes de `atob()`. Usar loop em vez de `Uint8Array.from(...,charCodeAt)` para evitar stack overflow em ficheiros grandes.
4. **Auth header tolerante**: regex case-insensitive para `Bearer`.
5. **Verificar env vars** (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) no arranque com mensagem clara.
6. **Sanitização de nome melhorada**: `normalize("NFKD")`, colapsar `_` repetidos, limitar a 120 chars.
7. **Mensagens de erro em PT-PT** para serem mostradas no toast: "Tipo de ficheiro não suportado", "Ficheiro demasiado grande (máx. 15 MB)", "Pendência não encontrada", "Falha no upload", etc.
8. **CORS headers expandidos** — incluir os headers do cliente Supabase (`x-supabase-client-platform`, etc.) que algumas versões enviam.
9. **Activity log best-effort** — não bloquear a resposta se falhar (é log secundário).
10. **Tratamento separado de erro no `is_admin` RPC** vs `!isAdmin`.

## Como testar

Após o redeploy automático, o utilizador repete o fluxo:
1. Cria pendência com PDF (caso original `=82=.pdf`).
2. Se ainda falhar, os logs em **Edge Functions → upload-pendency-file → Logs** vão agora mostrar a causa exata (`Storage upload failed: ...`, `DB insert failed: ...`, etc.) e posso atuar com precisão.

## Próximo passo

Após aprovação e fix, retomo a **Fase 1 das Minutas de Ata** (já tens a base de dados e o bucket criados; falta criar as Edge Functions de ingestão e o wizard de upload).
