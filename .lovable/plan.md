# Download seguro de anexos via MCP

Hoje a integração lista anexos (pendências de email, sinistros, documentos de edifício, fotos de assistências) mas não consegue obtê-los: não existe nenhuma operação de download. Além disso, a auditoria encontrou dois erros de armazenamento que já afetam a remoção de ficheiros.

## Problemas encontrados na auditoria

1. Não existe operação de download de anexos em nenhuma das quatro áreas (pendências, sinistros, documentos de edifício, fotos).
2. A remoção de anexos de pendências aponta para um local de armazenamento inexistente (`pendency-attachments` em vez de `email-pendencies`) — o registo é apagado mas o ficheiro fica órfão.
3. O mesmo acontece na remoção de anexos de sinistros (`insurance-claim-attachments` em vez de `building-documents`).

## O que vai ser feito

### 1. Nova operação de download (só leitura, autenticada)

Uma operação nova por tipo de anexo, todas com o mesmo comportamento:

- recebe o identificador do anexo;
- confirma que o anexo existe e a que processo e edifício pertence;
- confirma que o processo pertence a um edifício ativo e acessível; caso contrário recusa;
- devolve, à escolha de quem chama, um link temporário (validade curta, por omissão 5 minutos) ou o conteúdo do ficheiro em base64;
- o conteúdo em base64 só é devolvido até um limite de tamanho; acima disso devolve sempre link temporário;
- valida o tipo de ficheiro contra uma lista permitida (PDF, imagens, email, texto, folhas de cálculo e documentos de escritório);
- regista cada acesso no registo de atividade, com o anexo, o processo, o edifício e o formato pedido.

Nenhum local de armazenamento passa a público e não são necessárias credenciais extra: os links são gerados no servidor e expiram.

### 2. Respostas distinguíveis

- anexo ou processo inexistente → "não existe";
- anexo fora do âmbito permitido, edifício inativo, tipo de ficheiro não permitido → "sem permissão"/"recusado", com indicação do motivo;
- falha ao gerar link ou a ler do armazenamento → "erro temporário", que a integração pode repetir.

### 3. Correção dos locais de armazenamento

Corrigir a remoção de anexos de pendências e de sinistros para apontar ao local correto, para deixar de haver ficheiros órfãos.

### 4. Novas ferramentas para o assistente

Quatro ferramentas novas no catálogo MCP, sem alterar nem renomear nenhuma das existentes, pelo que a configuração já feita no Grok Live continua válida.

## Detalhes técnicos

Novos endpoints em `agent-api` (mantendo o prefixo `/v1/`, só leitura, método GET):

- `GET /v1/email-pendency-attachments/:id/download`
- `GET /v1/insurance-claim-attachments/:id/download`
- `GET /v1/building-documents/:id/download`
- `GET /v1/assistance-photos/:id/download`

Parâmetros: `mode=url|content` (omissão `url`), `expires_in` (60–3600s, omissão 300).

Implementação partilhada num helper novo em `supabase/functions/_shared/attachmentDownload.ts`:

- resolução do bucket real por tipo: `email-pendencies` (pendências), `building-documents` (sinistros e documentos de edifício), `assistance-photos` (fotos);
- validação de UUID com o `requireUUID` existente → 400;
- join até `building_id` e verificação de `buildings.is_active` → 403;
- MIME allowlist + limite de 10 MB para `mode=content` → 403 / fallback para `url`;
- `createSignedUrl` com `expires_in`; falha de storage/rede classificada com `classifyQueryFailure` → 503/504;
- registo em `activity_log` (`action: attachment_downloaded`, metadata com `attachment_id`, `kind`, `building_id`, `mode`), best-effort, não bloqueia a resposta;
- respostas de erro no formato já usado: `{ error, code }` com códigos `NOT_FOUND`, `FORBIDDEN`, `INVALID_INPUT`, `UPSTREAM_TIMEOUT`.

Correções: `deleteEmailPendencyAttachment` → bucket `email-pendencies`; `deleteInsuranceClaimAttachment` → bucket `building-documents`.

Novas tools em `mcp-server/index.ts` (v1.4.3): `download_email_pendency_attachment`, `download_insurance_claim_attachment`, `download_building_document`, `download_assistance_photo` (total 137).

Testes de regressão em `supabase/functions/agent-api/attachment_download_test.ts`: id inválido → 400, inexistente → 404, tipo não permitido → 403, sucesso devolve URL assinado, `mode=content` acima do limite volta a URL.

Por fim, deploy de `agent-api` e `mcp-server` e verificação em produção com a chave existente.
