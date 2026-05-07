# Melhorias gerais — 2ª iteração de feedback

## 1. Administradores — suportar até 5 por edifício

Hoje os admins estão num bloco markdown único nos artigos `procedimentos`. Substituir por estrutura nova:

- Nova tabela `building_administrators` (building_id, name, email, phone, floor, role, notes, is_primary, display_order). Até 5 entradas por edifício (validação na UI).
- Componente `BuildingAdministratorsManager` (lista + add/edit/remove inline) usado:
  - Na ficha do edifício (`BuildingForm` → secção "Administradores").
  - No artigo de conhecimento da categoria `procedimentos` (substitui o markdown actual; o markdown é gerado em runtime a partir da tabela para manter o look existente).
- Migração de dados: parser que lê o conteúdo markdown actual de cada artigo `procedimentos` e popula `building_administrators` (extrai Nome/Telemóvel/Andar/Email). Mantém artigo intacto para histórico.

## 2. Edifícios — quantidade de elevadores

- Adicionar coluna `elevator_count INT DEFAULT 0` em `buildings`.
- Campo numérico no `BuildingForm` ao lado do "Fornecedor de elevadores".
- Mostrar o nº na lista de edifícios e ficha.

## 3. Knowledge — "Geral" → "Empresa de Limpeza"

Já está renomeado para `empresas_limpeza`; ajustar label para singular: **"Empresa de Limpeza"**.

## 4. Inspeções de Gás — 5 anos

Confirmado: `gas` já tem `validity_years=5`. Sem acção (apenas confirmar ao utilizador).

## 5. Pendências de email — editar título e campos

- Adicionar modo de edição em `PendencyDetail.tsx`: ícone de lápis ao lado do título, abre form inline (título, descrição, prioridade, edifício, fornecedor, assistência, due_date).
- Mutation `useUpdatePendency` em `usePendencies.ts`.

## 6. Pendências — KPIs e filtro só "Aguarda resposta"

Em `EmailPendencies.tsx`:
- Esconder KPI "SLA vencido" e "Resolvidas" do topo (manter só "Aguarda resposta") — ou converter para uma única linha com 1 KPI principal.
- Filtro de estado por defeito apenas mostra "Aguarda resposta" e "Resolvido" (já está, validar). Remover opção "Todos os estados" do dropdown principal.

## 7. Edifícios — permitir apagar código

Em `BuildingForm.tsx` linha 70-72: actualmente se o utilizador limpa o código, é re-preenchido com o antigo. Mudar para permitir gravar `code` vazio se o utilizador explicitamente apagar (manter botão "Gerar" para repor).

## 8. Seguros — Acidentes de Trabalho + frações incluídas/excluídas

Já implementado parcialmente (cobertura `acidentes_trabalho` + tabelas `building_fractions`/`insurance_fraction_status`). Validar UI:
- Garantir que no `InsuranceForm` aparecem 2 colunas claras: "Frações Incluídas" / "Frações Excluídas" (toggle por linha + contador).
- Fallback textarea quando edifício não tem frações registadas.

## 9. Relatório de Chaves (NOVO)

- Nova tabela `key_handovers`:
  - `building_id`, `picked_up_by_name`, `picked_up_by_phone`, `picked_up_at`,
  - `returned_by_name`, `returned_at`, `purpose` (texto), `notes`,
  - `assistance_id` (opcional), `created_by`.
- Página `/keys` (Relatório de Chaves) com tabela: Edifício | Quem pegou | Data pegou | Quem entregou | Data entregou | Estado.
- Filtros por edifício, estado (em uso / devolvida), data.
- Botão "Registar entrega" e acção "Marcar como devolvida".
- Entrada no sidebar.

## 10. Backup / Biblioteca de Documentos do Prédio (NOVO)

- Bucket Supabase `building-documents` (privado).
- Tabela `building_documents`: building_id, category (atas, certificados_gas, orcamentos, contratos, seguros, outros), title, description, file_path, file_size, mime_type, document_date, uploaded_by.
- Página/separador na ficha do edifício "Documentos" com:
  - Upload (multi-file) com selecção de categoria.
  - Lista filtrável por categoria.
  - Pré-visualização (reaproveitar `AttachmentPreviewDialog`).
  - Download individual e **"Download tudo (ZIP)"** — gerado client-side com `jszip`.
- Edge function `download-building-documents-zip` opcional (server-side) se ZIP ficar demasiado grande no browser.

## 11. Participações de Sinistro (NOVO)

- Nova tabela `insurance_claims`:
  - `claim_number` (sequencial auto), `building_id`, `insurance_id` (FK opcional para `building_insurances`), `assistance_id` (opcional),
  - `occurrence_date`, `reported_date`, `description` (o que se passou),
  - `damage_location` (texto), `estimated_amount`, `final_amount`,
  - `status` enum: `aberto`, `em_analise`, `aguarda_peritagem`, `peritagem_realizada`, `aguarda_pagamento`, `pago`, `recusado`, `arquivado`,
  - `insurer_contact`, `insurer_claim_ref` (nº processo da seguradora),
  - `notes`, `created_by`.
- Tabela `insurance_claim_attachments`: claim_id, file_path, kind (orcamento, email, fotos, peritagem, recibo, outros), description.
- Tabela `insurance_claim_notes`: claim_id, body, author_id, created_at (timeline).
- Página `/sinistros`:
  - Lista com filtros (edifício, estado, data) — KPIs (Abertos, Em análise, Pagos no ano).
  - Form criar/editar (segue best-practice PT-PT: campos em português, datas dd/mm/aaaa, valores em €).
  - Detalhe com tabs: Dados | Anexos | Timeline | Assistência associada.
  - Anexar emails/PDFs/orçamentos via upload (mesmo bucket privado de pendências).
- Entrada no sidebar "Sinistros".

## Detalhes técnicos

```text
Migrações DB:
  - buildings: ADD COLUMN elevator_count INT DEFAULT 0
  - buildings: permitir code='' (nada a alterar no schema, só lógica)
  - new: building_administrators (até 5 admins, RLS admin)
  - new: key_handovers (RLS admin)
  - new: building_documents + bucket 'building-documents' (privado, RLS admin)
  - new: insurance_claims + insurance_claim_attachments + insurance_claim_notes
         + enum insurance_claim_status (RLS admin)
  - data migration: parser MD → building_administrators

Frontend:
  - BuildingForm: elevator_count, fix code limpo, secção administradores
  - KnowledgeDetail/Form (procedimentos): renderiza BuildingAdministratorsManager
  - knowledgeCategories: label "Empresa de Limpeza"
  - PendencyDetail: edição inline; usePendencies: useUpdatePendency
  - EmailPendencies: simplificar KPIs + filtro
  - InsuranceForm: validar UI 2-colunas frações
  - novo: src/pages/Keys.tsx + KeyHandoverForm/Table
  - novo: src/pages/Sinistros.tsx + ClaimForm/Detail/List
  - novo: BuildingDocumentsTab + upload + ZIP download (jszip)
  - sidebar: 2 entradas novas (Chaves, Sinistros)

Dependências novas:
  - jszip (para ZIP download)
```

## Confirmações pendentes

- **Admins**: ok suportar até 5 com tabela estruturada e migrar markdown actual? Vou tentar parsing automático mas alguns artigos têm formatos diferentes — para esses fica para preencher manualmente.
- **Sinistros**: o `claim_number` deve ser sequencial global (1, 2, 3…) ou com prefixo do ano (2026-001)?
- **Chaves**: incluir campo "Motivo" / "Para quem entregou" (ex: fornecedor X)?
