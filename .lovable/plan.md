## Objectivo
Gerar um catálogo completo das ferramentas MCP em Markdown, pronto a colar no system prompt do agente, para que ele:
- Saiba os nomes exactos (nunca invente).
- Saiba os inputs obrigatórios/opcionais e o output de cada uma.
- Conheça as regras de auth, URLs, erros comuns e convenções de negócio.

## Entregável
Um único ficheiro `/mnt/documents/MCP_TOOLS.md` (download direto a partir do chat) gerado por script que faz parse do `supabase/functions/mcp-server/index.ts` para garantir 100% de fidelidade com o que está deployed.

## Estrutura do documento

1. **Identidade e endpoints**
   - URL principal (todas as ~60 tools): `https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/mcp-server`
   - Variante retrievable ChatGPT (apenas `search` + `fetch`): `.../mcp-server/chatgpt`
   - Info pública sem auth: `GET /mcp-server/info`
   - Debug key check: `GET /mcp-server/debug/key-check`

2. **Autenticação**
   - Header preferido: `x-api-key: <EXTERNAL_API_KEY>`
   - Alternativas: `Authorization: Bearer <KEY>`, `?api_key=<KEY>`
   - Headers MCP obrigatórios em POST: `Accept: application/json, text/event-stream`, `Content-Type: application/json`

3. **Regras de negócio críticas** (para o agente não falhar)
   - Status "Agendado" é derivado de `scheduled_start_date` — não passar como status.
   - Edifícios mostram-se como `CÓDIGO - Nome` (ex.: `GAL - Cond. Rua Alexandre Herculano`).
   - Email oficial: `geral@luvimg.com`.
   - Em `search` (variante /chatgpt) usar queries reais (ex.: `COND`, `elevador`, código de edifício) — não termos genéricos como `infiltracao`.
   - `fetch` aceita IDs no formato `tipo:uuid` devolvidos pelo `search`.

4. **Catálogo completo de tools** — agrupadas por área, cada uma com:
   - `name` (literal)
   - `description`
   - `inputSchema` (campos, tipos, required vs optional)
   - Notas de uso/output quando relevante

   Áreas:
   - **Core / Health** (3): `health_check`, `lookup_building_by_email`, `import_contacts`
   - **Intervention Types** (3): `list_intervention_types`, `create_intervention_type`, `update_intervention_type`
   - **Assistências** (10): `list_assistances`, `get_assistance`, `create_assistance`, `update_assistance`, `add_communication`, `list_assistance_communications`, `list_assistance_photos`, `list_assistance_progress`, `save_email_draft`, `update_email_status`
   - **Edifícios** (5): `list_buildings`, `get_building`, `create_building`, `update_building`, `list_building_contacts`
   - **Administradores de edifício** (4): `list_building_administrators`, `create_building_administrator`, `update_building_administrator`, `delete_building_administrator`
   - **Documentos de edifício** (3): `list_building_documents`, `upload_building_document`, `delete_building_document`
   - **Chaves** (3): `list_key_handovers`, `create_key_handover`, `update_key_handover`
   - **Fornecedores** (4): `list_suppliers`, `get_supplier`, `create_supplier`, `update_supplier`
   - **Respostas Fornecedor** (2): `submit_supplier_response`, `list_supplier_responses`
   - **Actas / Assembly** (5): `list_assembly_items`, `get_assembly_item`, `create_assembly_item`, `update_assembly_item`, `delete_assembly_item`
   - **Orçamentos** (5): `list_quotations`, `get_quotation`, `create_quotation`, `update_quotation`, `delete_quotation`
   - **Knowledge Base** (5): `search_knowledge`, `get_knowledge_article`, `create_knowledge_article`, `update_knowledge_article`, `delete_knowledge_article`
   - **Fotos** (2): `upload_assistance_photo`, `delete_assistance_photo`
   - **Follow-ups & Notificações** (4): `list_follow_ups`, `create_follow_up`, `list_notifications`, `update_notification`
   - **Activity Log** (1): `list_activity_log`
   - **Seguros / Sinistros** (5): `list_insurance_claims`, `get_insurance_claim`, `create_insurance_claim`, `update_insurance_claim`, `add_claim_note`
   - **Retrievable (apenas em /chatgpt)** (2): `search`, `fetch`

5. **Exemplos curl**
   - `initialize` + `tools/list`
   - `tools/call` para `list_assistances`, `get_building`, `search` (variante chatgpt) e `fetch`

6. **Erros comuns**
   - 401 "Unauthorized" → falta `x-api-key` ou chave errada (validar em `/debug/key-check`)
   - 406 → falta `Accept: application/json, text/event-stream`
   - `Tool not found` → o agente usou nome errado; lista canónica está neste documento
   - `search` sem resultados → tentar termos diferentes; ver regra acima

## Como vou produzir

Pequeno script Node em `/tmp` que:
1. Lê `supabase/functions/mcp-server/index.ts`.
2. Faz parse das chamadas `mcp.tool("name", { description, inputSchema, ... })` extraindo nome, descrição e schema.
3. Agrupa por área (mapa pré-definido).
4. Renderiza o Markdown final em `/mnt/documents/MCP_TOOLS.md`.
5. Anexa as secções estáticas (auth, endpoints, regras, exemplos, erros).

No final entrego o ficheiro via `<presentation-artifact>` para download e listo um snippet curto pronto a colar no system prompt do teu agente.

## Fora do âmbito
- Não altero código do `mcp-server` nem adiciono novas tools.
- Não exponho a `EXTERNAL_API_KEY` no documento.