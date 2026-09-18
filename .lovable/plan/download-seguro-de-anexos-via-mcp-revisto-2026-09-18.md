# Download seguro de anexos via MCP (revisto)

Hoje a integração lista anexos (pendências de email, sinistros, documentos de edifício, fotos de assistências) mas não consegue obtê-los: não existe nenhuma operação de download. A auditoria encontrou ainda dois erros de armazenamento que já afetam a remoção de ficheiros.

Âmbito: apenas o acesso aos anexos. Responsável, próxima revisão, escaladas e confirmação de propostas ficam de fora, como melhorias separadas.

## Problemas encontrados na auditoria

1. Não existe operação de download em nenhuma das quatro áreas (pendências, sinistros, documentos de edifício, fotos).
2. A remoção de anexos de pendências aponta para um local de armazenamento inexistente (`pendency-attachments` em vez de `email-pendencies`) — o registo é apagado e o ficheiro fica órfão.
3. O mesmo na remoção de anexos de sinistros (`insurance-claim-attachments` em vez de `building-documents`).

## Autorização: o que a chave realmente permite

Verificado no código: a integração autentica-se com uma única chave partilhada e não existe hoje qualquer noção de organização ou de âmbito por edifício. Essa chave tem, por desenho atual, acesso global a toda a LUVIMG. Fica documentado de forma explícita no README e na resposta de informação do serviço.

Consequência prática: a autorização por credencial só passa a ser filtrável quando existir o modelo multi-organização já previsto. Até lá, as verificações aplicadas ao download são: o anexo existe, o processo-pai existe, o processo pertence a um edifício e esse edifício está ativo. Fica preparado um ponto único onde, no futuro, se acrescenta o filtro por âmbito da credencial sem tocar nos quatro caminhos.

## O que vai ser feito

### 1. Operação de download (só leitura, autenticada)

Uma operação por tipo de anexo, todas com o mesmo comportamento: recebe o identificador do próprio anexo/documento/foto (nunca o do processo-pai), resolve o processo e o edifício, valida, e devolve link temporário ou conteúdo.

Validação do ficheiro, em vez de confiar apenas no tipo registado:
- tipo registado na base de dados;
- extensão do nome do ficheiro;
- assinatura real dos primeiros bytes, quando o formato a tem (PDF, PNG, JPEG, GIF, WEBP, ZIP/Office);
- nome de ficheiro sanitizado na resposta.

Em caso de divergência entre os três, o ficheiro não é devolvido com um tipo enganador: é recusado ou entregue como binário genérico, com o motivo indicado.

Tamanho: `mode=url` é o comportamento normal. `mode=content` só é servido abaixo de um limite configurável (valor inicial 4 MB, ajustável nas definições). Acima disso a resposta é entregue com link e indica explicitamente o fallback.

### 2. Resposta com metadados e erros distinguíveis

Sucesso devolve identificador, tipo de anexo, nome do ficheiro, tipo de conteúdo, tamanho, modo pedido, modo efetivo, motivo de fallback quando aplicável, validade e link (ou conteúdo). Nunca inclui caminhos internos de armazenamento; links e conteúdos nunca são escritos nos registos.

Erros: "não existe" (anexo ou processo-pai apagado), "sem permissão" (edifício inativo ou fora do âmbito, tipo de ficheiro recusado), "pedido inválido" (identificador mal formado, validade fora dos limites) e "erro temporário" (falha de armazenamento ou rede, repetível).

### 3. Registo de acesso

Cada download fica registado no registo de atividade com o anexo, o tipo, o processo, o edifício e o modo. Uma falha deste registo nunca impede o download.

### 4. Correção das remoções, em separado

As duas correções de armazenamento são tratadas como trabalho próprio, depois do download estar validado: o registo só é apagado depois de o armazenamento confirmar, "ficheiro já não existe" é tratado como sucesso, e é produzido um relatório dos ficheiros órfãos históricos — sem qualquer limpeza automática.

### 5. Quatro ferramentas novas para o assistente

`download_email_pendency_attachment`, `download_insurance_claim_attachment`, `download_building_document`, `download_assistance_photo`. Nenhuma ferramenta existente muda de nome, pelo que a ligação já configurada continua válida. Nenhuma ferramenta de escrita nova é acrescentada.

## Detalhes técnicos

Novos endpoints GET em `agent-api`, só leitura:

- `/v1/email-pendency-attachments/:id/download`
- `/v1/insurance-claim-attachments/:id/download`
- `/v1/building-documents/:id/download`
- `/v1/assistance-photos/:id/download`

Parâmetros: `mode=url|content` (omissão `url`), `expires_in` 60–3600s (omissão 300).

Helper partilhado `supabase/functions/_shared/attachmentDownload.ts`:
- mapa tipo → bucket real: `email-pendencies`, `building-documents` (sinistros e documentos), `assistance-photos`;
- `requireUUID` → 400 `INVALID_INPUT`;
- join até `building_id` por caminho (`email_pendency_attachments`→`email_pendencies`; `insurance_claim_attachments`→`insurance_claims`; `building_documents` direto; `assistance_photos`→`assistances`), `buildings.is_active` → 403 `FORBIDDEN`; processo-pai ausente → 404 `NOT_FOUND`;
- verificação de tipo tripla (MIME registado + extensão + magic bytes via `download` parcial/`Range`); divergência → 403 `MIME_MISMATCH` ou `application/octet-stream` conforme configuração;
- `createSignedUrl(expires_in)`; erro de storage classificado com `classifyQueryFailure` → 503/504 `UPSTREAM_TIMEOUT`;
- objeto inexistente no storage → 404 `OBJECT_MISSING` (distinto de registo inexistente);
- limite de `mode=content` lido de `app_settings` (`attachment_content_max_bytes`, omissão 4 MB), fallback devolve `effective_mode: "url"`, `fallback_reason: "content_size_limit"`;
- `activity_log` best-effort (`action: attachment_downloaded`, metadata sem URL nem path).

Forma da resposta:

```text
{ attachment_id, kind, file_name, mime_type, size,
  requested_mode, effective_mode, fallback_reason?,
  expires_at, url | content_base64 }
```

Testes em `supabase/functions/agent-api/attachment_download_test.ts`, um bloco por caminho (pendência, sinistro, documento, foto) mais: processo-pai apagado, edifício inativo, anexo de outro edifício, registo sem objeto no storage, objeto cujo caminho não corresponde, `expires_in` abaixo/acima dos limites, falha de `activity_log` não bloqueia, URL expirado deixa de servir, e verificação de que nenhum log contém chave, URL assinado ou conteúdo.

Testes próprios para as correções de remoção em `attachment_delete_test.ts`: ordem storage-antes-de-registo, idempotência em ficheiro ausente, e ausência de eliminação automática de órfãos.

`mcp-server` passa a v1.4.3 com as quatro tools novas (137 no total).

## Depois do deploy

Confirmo e reporto: versão efetiva do `agent-api`, versão `1.4.3` do `mcp-server`, total real de tools, presença das quatro novas, ausência de tools de escrita novas, e que o perfil Hermes as vê (com indicação de reconectar a sessão MCP se ainda mostrar o catálogo antigo). Depois disso avisa-se que ficou disponível, para o canário de leitura ser feito do seu lado.
