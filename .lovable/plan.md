# Atualizar documentação MCP com lista completa de tools

## Objetivo
Atualizar `supabase/functions/mcp-server/README.md` com a lista completa e categorizada das **128 tools** atualmente registadas no `mcp-server/index.ts`, para que tenhas referência rápida a todos os nomes.

## Alterações

### `supabase/functions/mcp-server/README.md`
Substituir/expandir a secção de tools por um inventário categorizado com os nomes exatos extraídos de `index.ts`:

- **Sistema & Pesquisa (4):** `health_check`, `lookup_building_by_email`, `search`, `fetch`
- **Assistências (10):** `list_assistances`, `get_assistance`, `create_assistance`, `update_assistance`, `add_assistance_internal_note`, `list_assistance_communications`, `list_assistance_photos`, `list_assistance_progress`, `upload_assistance_photo`, `delete_assistance_photo`
- **Comunicações / Email (4):** `add_communication`, `save_email_draft`, `update_email_status`, `import_contacts`
- **Tipos de Intervenção (3):** `list_intervention_types`, `create_intervention_type`, `update_intervention_type`
- **Knowledge Base (5):** `search_knowledge`, `get_knowledge_article`, `create_knowledge_article`, `update_knowledge_article`, `delete_knowledge_article`
- **Edifícios (4):** `list_buildings`, `get_building`, `create_building`, `update_building`
- **Contactos de Edifício (4):** `list_building_contacts`, `create_building_contact`, `update_building_contact`, `delete_building_contact`
- **Administradores de Edifício (4):** `list_building_administrators`, `create_building_administrator`, `update_building_administrator`, `delete_building_administrator`
- **Frações (4):** `list_building_fractions`, `create_building_fraction`, `update_building_fraction`, `delete_building_fraction`
- **Inspeções (4) + Categorias (4):** `list_building_inspections`, `create_building_inspection`, `update_building_inspection`, `delete_building_inspection`, `list_inspection_categories`, `create_inspection_category`, `update_inspection_category`, `delete_inspection_category`
- **Seguros de Edifício (4):** `list_building_insurances`, `create_building_insurance`, `update_building_insurance`, `delete_building_insurance`
- **Documentos de Edifício (3):** `list_building_documents`, `upload_building_document`, `delete_building_document`
- **Entrega de Chaves (3):** `list_key_handovers`, `create_key_handover`, `update_key_handover`
- **Fornecedores (4):** `list_suppliers`, `get_supplier`, `create_supplier`, `update_supplier`
- **Cotações & Respostas (6):** `list_quotations`, `get_quotation`, `create_quotation`, `update_quotation`, `delete_quotation`, `submit_supplier_response`, `list_supplier_responses`
- **Follow-ups & Notificações (4):** `list_follow_ups`, `create_follow_up`, `list_notifications`, `update_notification`
- **Sinistros / Insurance Claims (7):** `list_insurance_claims`, `get_insurance_claim`, `create_insurance_claim`, `update_insurance_claim`, `add_claim_note`, `list_insurance_claim_attachments`, `delete_insurance_claim_attachment`, `list_insurance_fraction_status`, `update_insurance_fraction_status`
- **Pendências Email (12):** `list_email_pendencies`, `get_email_pendency`, `create_email_pendency`, `update_email_pendency`, `delete_email_pendency`, `list_email_pendency_notes`, `add_email_pendency_note`, `list_email_pendency_attachments`, `delete_email_pendency_attachment`, `list_pendency_reminders`, `create_pendency_reminder`, `update_pendency_reminder`, `delete_pendency_reminder`
- **Assembleias — itens (5):** `list_assembly_items`, `get_assembly_item`, `create_assembly_item`, `update_assembly_item`, `delete_assembly_item`
- **Assembleias — gestão (5):** `list_assemblies`, `get_assembly`, `create_assembly`, `update_assembly`, `delete_assembly`
- **Assembleias — agenda (4):** `list_assembly_agenda_items`, `create_assembly_agenda_item`, `update_assembly_agenda_item`, `delete_assembly_agenda_item`
- **Assembleias — deliberações (4):** `list_assembly_resolutions`, `create_assembly_resolution`, `update_assembly_resolution`, `delete_assembly_resolution`
- **Assembleias — ações (4):** `list_assembly_action_items`, `create_assembly_action_item`, `update_assembly_action_item`, `delete_assembly_action_item`
- **Assembleias — presenças (3):** `list_assembly_attendees`, `add_assembly_attendee`, `delete_assembly_attendee`
- **Assembleias — envios e atas (2):** `list_assembly_dispatches`, `list_assembly_minutes_versions`
- **Observabilidade (3):** `list_mcp_health_checks`, `list_email_unsubscribes`, `list_app_settings`

Cada categoria com pequena descrição (1 linha) e a contagem total no topo (**128 tools, v1.3.0**).

Manter o restante conteúdo do README (endpoint, auth, exemplos) intacto.

## Ficheiros tocados
- `supabase/functions/mcp-server/README.md` (apenas docs)

Nenhuma alteração de código ou endpoints.
