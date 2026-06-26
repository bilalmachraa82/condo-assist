
# Plano: Documento de integração Hermes Agent ↔ MCP Luvimg

## Contexto verificado

**Hermes Agent** = produto da **Nous Research** (open-source, MIT, `NousResearch/hermes-agent`). Suporta nativamente:
- MCP via **Streamable HTTP** (sem precisar de `mcp-remote`/bridge) e stdio.
- Auth via header arbitrário (`x-api-key`, `Authorization: Bearer`, ...), OAuth 2.1 PKCE e mTLS.
- Config 100% YAML em `~/.hermes/config.yaml`, com `${VAR}` para secrets em `~/.hermes/.env`.
- Email: gateway IMAP/SMTP nativo (funciona com Outlook/365) + skill Himalaya + Composio MCP (282 tools Outlook).
- Telefone (fase 2): skill `telephony` (Twilio + Vapi/Bland.ai) para outbound IA; inbound real-time ainda não nativo — Grok Live confirmado para fase 2.

**Estado MCP Luvimg confirmado por leitura do código:**
- `mcp-server/index.ts` v1.3.0, transport Streamable HTTP, URL `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`.
- Auth: header `x-api-key: $EXTERNAL_API_KEY` (prioridade confirmada; ver `auth_regression_test.ts`).
- **128 tools registadas** (contagem feita por grep — coincide com versão 1.3.0).
- Single-tenant Luvimg confirmado pelo utilizador.

## Entregável

Um único ficheiro markdown:

`/mnt/documents/hermes-luvimg-mcp-integration.md`

Estrutura (≈ 8 secções, pronto a colar / partilhar):

### 1. TL;DR — Setup em 5 minutos
- Instalar Hermes (one-liner curl/iex).
- Criar `~/.hermes/.env` com `LUVIMG_MCP_API_KEY=...`.
- Colar bloco `mcp_servers:` no `~/.hermes/config.yaml`.
- `hermes chat` → testar com `mcp_luvimg_health_check`.

### 2. Bloco YAML pronto a colar
```yaml
mcp_servers:
  luvimg:
    url: "https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server"
    headers:
      x-api-key: "${LUVIMG_MCP_API_KEY}"
    connect_timeout: 30
    timeout: 180
    supports_parallel_tool_calls: true
    tools:
      resources: false
      prompts: false
```
+ variante com Composio Outlook em paralelo para email Microsoft 365.

### 3. Identidade do servidor MCP
- Nome / versão / transport / endpoints (`POST /` JSON-RPC, headers obrigatórios `Accept: application/json, text/event-stream`).
- Como Hermes prefixará as tools: `mcp_luvimg_<tool_name>`.
- Health dashboard interno (`/mcp-health`) e cron de 5min para o agente saber se há degradação.

### 4. Catálogo COMPLETO das 128 tools — agrupado por domínio
Tabela com `nome | parâmetros chave | quando usar | escreve?`:

- **Sistema (3)**: health_check, list_app_settings, list_mcp_health_checks, list_email_unsubscribes
- **Search/Fetch ChatGPT-compat (2)**: search, fetch
- **Assistências (10)**: list_assistances, get_assistance, create_assistance, update_assistance, list_assistance_communications, list_assistance_photos, upload_assistance_photo, delete_assistance_photo, list_assistance_progress, add_assistance_internal_note
- **Comunicações & emails (4)**: add_communication, save_email_draft, update_email_status, lookup_building_by_email
- **Follow-ups & notificações (4)**: list_follow_ups, create_follow_up, list_notifications, update_notification
- **Tipos de intervenção (3)**: list_intervention_types, create_intervention_type, update_intervention_type
- **Fornecedores & cotações (10)**: list_suppliers, get_supplier, create_supplier, update_supplier, list_quotations, get_quotation, create_quotation, update_quotation, delete_quotation, list_supplier_responses, submit_supplier_response
- **Edifícios (5)**: list_buildings, get_building, create_building, update_building, lookup_building_by_email
- **Frações (4)**: list_building_fractions, create_building_fraction, update_building_fraction, delete_building_fraction
- **Contactos & administradores (8)**: list_building_contacts/administrators × CRUD, import_contacts
- **Documentos edifício (3)**: list_building_documents, upload_building_document, delete_building_document
- **Inspeções (6)**: categorias (4) + inspeções (4)
- **Seguros & sinistros (12)**: insurances CRUD + claims + attachments + fraction_status
- **Chaves (3)**: list_key_handovers, create_key_handover, update_key_handover
- **Pendências Email (10)**: CRUD pendências + attachments + notes + reminders
- **Assembleias (21)**: assemblies CRUD + items + agenda_items + resolutions + action_items + attendees + dispatches + minutes_versions
- **Base conhecimento (4)**: list/search/get/create/update/delete_knowledge_article
- **Logs/Activity (1)**: list_activity_log

Para cada categoria: **exemplos de prompts** que o agente deve saber reconhecer ("quais as assistências pendentes do GAL?", "responde à pendência X com a minuta Y", etc.).

### 5. System prompt recomendado para o agente Hermes
Bloco pronto a colar no Hermes (`hermes prompts` ou na config), que ensina o agente:
- Identidade (atende em PT-PT, formal, em nome da Luvimg).
- Formato edifícios `CÓDIGO - Nome`.
- Email oficial `geral@luvimg.com`.
- Estado "Agendado" derivado de `scheduled_start_date`.
- Quando pedir confirmação humana (writes em assistências, contratos, envios de email reais).
- Tools obrigatórias para fluxos típicos (triage de pendências email, criar assistência a partir de email, follow-up de fornecedor).

### 6. Playbook Fase 1 — Email (Outlook 365)
Duas opções, comparação clara:

**Opção A (recomendada): Composio MCP Outlook + Luvimg MCP em paralelo**
- Hermes lê inbox via `mcp_composio_*` (282 tools Outlook).
- Cria/atualiza pendências e assistências via `mcp_luvimg_*`.
- Sem necessidade de credenciais SMTP no servidor.

**Opção B: Email gateway nativo Hermes (IMAP/SMTP 365)**
- Vars `EMAIL_*` em `~/.hermes/.env` com App Password 365.
- Bom para "agente endereçável" (assistente@luvimg.com).

Para cada uma: fluxos passo-a-passo:
1. Receber email → `lookup_building_by_email` → `create_email_pendency` ou `create_assistance`.
2. Triagem com `add_email_pendency_note` + `create_pendency_reminder`.
3. Resposta com `save_email_draft` + (Composio) `Send Email`.

### 7. Playbook Fase 2 — Voz / Atendimento telefónico (Grok Live)
- Arquitetura: Grok Live como front voz → webhook → Hermes Agent → MCP Luvimg.
- Alternativas: Vapi + Twilio (skill telephony nativa) caso Grok não exponha MCP cliente.
- Tools mais usadas nesta fase: `lookup_building_by_email`, `list_assistances`, `create_assistance`, `list_email_pendencies`, `add_communication`.
- Notas sobre limites Hermes (sem inbound real-time nativo) e qual gateway colocar à frente.

### 8. Operação, segurança e troubleshooting
- Como rotar `EXTERNAL_API_KEY` no Supabase + atualizar `LUVIMG_MCP_API_KEY` em `.env` Hermes (`/reload-mcp`).
- Comandos úteis: `hermes mcp`, `hermes mcp configure luvimg`, `/reload-mcp`.
- Erros frequentes:
  - `406 Not Acceptable` → faltam headers Accept (Hermes trata).
  - `401` → ordem de auth (já corrigida; ver `auth_regression_test.ts`).
  - `404 list_assistances` antigo → resolvido (registos antigos limpos).
- Onde ver logs: dashboard `/mcp-health`, edge function logs Supabase.
- Limites: 1000 rows por query Supabase; tool timeout default 300s.

## Anexos no documento
- Link para health dashboard interno.
- Link para `auth_regression_test.ts`.
- Tabela de equivalências "se o utilizador diz X, agente chama tool Y".

## Fora de âmbito (não toca em código)
Este turn cria **apenas o documento** em `/mnt/documents/`. Sem alterações ao MCP server, agent-api, base de dados, ou config do projeto. O multi-tenant SaaS continua em plano anterior.

## Aprovação
Ao aprovar, gero o ficheiro markdown e devolvo-o com `<presentation-artifact>` para descarregares e colares na máquina onde o Hermes vai correr.
