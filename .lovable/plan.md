# Plano de melhorias — Feedback Luvimg (email André, 8 Mai 2026)

Análise ponto a ponto de cada item do email + screenshot, com proposta de implementação. Agrupado por área da app.

---

## 1. Edifícios (`BuildingForm`)

### 1.1 Erro ao limpar código do prédio
- **Problema**: ao apagar o campo "Código" e gravar, dispara erro (provavelmente NOT NULL ou validação zod).
- **Solução**: permitir `code` vazio/nullable. Se vazio na submissão, gravar como `NULL` (ou string vazia conforme schema). Manter botão "Gerar" para repor automaticamente.
- **Ficheiros**: `BuildingForm.tsx` (validação zod + submit), eventual migração para tornar `code` nullable se ainda não for.

### 1.2 Quantidade de elevadores
- **Pedido**: campo numérico "Quantidade de elevadores" no edifício e também na Base de Conhecimento (categoria elevadores).
- **Estado**: já existe coluna `elevator_count` mencionada no `plan.md` — confirmar se está exposta no `BuildingForm`. Caso não esteja, adicionar input numérico.
- **Mostrar** o nº na lista de Inspeções (categoria Elevador) e na ficha do edifício.

---

## 2. Dashboard de Assistências por edifício

**Pedido**: KPIs do edifício devem ser exatamente: **Abertas / Fechadas / Total / Elevadores**.

- Hoje mostra: Total, Abertas, Fechadas, Em Progresso, Elevador.
- **Acção**: remover "Em Progresso" (mantém Total, Abertas, Fechadas, Elevadores). Reordenar para: **Abertas | Fechadas | Total | Elevadores**.
- **Ficheiros**: componente do detalhe do edifício / tabs de assistências.

---

## 3. Pendências de Email (`/email-pendencies`)

### 3.1 Ordenação por prédio (código asc)
- **Pedido**: agrupar/ordenar por código do edifício (003 → 180), facilita ver pendências do mesmo prédio juntas.
- **Solução**: ordenação primária por `building.code` asc, secundária por data desc. Idealmente agrupamento visual (header por edifício).

### 3.2 Trocar título ↔ assunto no card
- Hoje: título a negrito em cima, morada em cinzento.
- **Pedido**: morada do edifício a negrito em cima, assunto em cinzento abaixo.
- **Ficheiro**: card da pendência em `EmailPendencies.tsx` / `PendencyCard`.

### 3.3 Auto-preenchimento via PDF anexo (NOVO — IA)
- **Pedido**: arrastar PDF do email → sistema extrai morada, identifica edifício, preenche assunto, e o utilizador só escolhe data de lembrete.
- **Solução proposta**:
  1. Upload do PDF via dialog "Nova pendência".
  2. Edge function `parse-pendency-pdf`: extrai texto (pdf.js / pdfjs-dist em Deno) e envia para Lovable AI Gateway com prompt estruturado (JSON: `{building_code, address, subject, supplier_hint, summary}`).
  3. Matching automático de edifício por código/morada.
  4. Pré-preenche o form; utilizador valida e adiciona data de lembrete.
- **Custo**: usa Lovable AI Gateway (gemini-2.5-flash, barato).

---

## 4. Seguimento de Actas

### 4.1 Anexar acta ao edifício
- **Pedido**: poder anexar a acta de cada prédio para consulta rápida.
- **Solução**: usar a tab/biblioteca `BuildingDocumentsTab` (já existe no plan.md) com categoria `atas`. Garantir que está acessível a partir do módulo "Seguimento de Actas".

### 4.2 Auto-extração de assuntos da acta (NOVO — IA, futuro)
- **Pedido**: ao anexar acta, sistema lê e cria automaticamente os vários "Assuntos" pendentes; utilizador depois preenche o tratamento.
- **Solução**:
  1. Edge function `parse-assembly-minutes`: extrai texto do PDF da acta, envia para Lovable AI com prompt para devolver lista JSON `[{titulo, categoria, notas}]`.
  2. Pré-visualização com checkboxes (utilizador escolhe quais importar).
  3. Insere em `assembly_items` associados ao edifício + acta como anexo.
- **Marcado como "futuro"** pelo cliente — pode ser fase 2.

---

## 5. Inspeções Periódicas

### 5.1 KPIs simplificados
- **Pedido**: ficar apenas **Total (Em dia) / A Vencer 30d / Vencidos**. Remover "A vencer 15d", "Pendentes", "Sem registo" do topo (ou mover para menos destaque).
- Aplicar a mesma simplificação aos chips de estado dos cards.

### 5.2 Estados de Resultado
- **Pedido**: substituir as opções actuais (OK/Conforme, Pendente, Não conforme menor/maior, Obras pendentes) por:
  1. **Aprovado**
  2. **Aprovado com Cláusulas**
  3. **Pendente (Aguarda Relatório)**
  4. **Chumbou**
- Manter campo de notas separado.
- **Migração**: mapear estados antigos → novos (OK→Aprovado, Pendente→Pendente Relatório, Não conforme menor→Aprovado com Cláusulas, Não conforme maior/Obras→Chumbou).

### 5.3 Bug: notas marcam como válido
- **Problema**: ao escrever nota, a inspeção passa a "válida" automaticamente.
- **Causa provável**: lógica que considera `notes IS NOT NULL` como sinal de conformidade.
- **Acção**: validar apenas pelo campo `result` explícito.

### 5.4 Anexos por categoria
- Adicionar campo de upload de ficheiro:
  - **Elevadores** → "Cláusulas da inspeção"
  - **Extintores** → "Certificado"
  - **Gás** → "Certificado"
- Guardar em bucket privado `inspection-documents` (criar se não existir) com RLS por admin.
- Mostrar link para download na linha da inspeção.

---

## 6. Seguros

### 6.1 Seguros de Acidentes de Trabalho + Frações
- **Estado**: já parcialmente implementado (cobertura `acidentes_trabalho` + `building_fractions`/`insurance_fraction_status` no plan.md).
- **Validar UI**: 2 colunas claras "Frações Incluídas" / "Frações Excluídas" no `InsuranceForm`.
- Fallback textarea quando edifício não tem frações registadas.

### 6.2 Anexar apólice
- Upload de PDF da apólice em cada `building_insurance`. Bucket `insurance-documents` (privado).

### 6.3 Bug: notas marcam como válido (mesmo da inspeções)
- Aplicar correção análoga.

---

## 7. Base de Conhecimento — Administradores

- **Problema**: artigo só mostra o primeiro administrador.
- **Causa**: ainda usa o markdown antigo / a migração não foi aplicada para todos.
- **Solução**: substituir o render do artigo da categoria `procedimentos` pelo `BuildingAdministratorsManager` (já criado) que lista até 5 admins da nova tabela `building_administrators`.
- Confirmar com a importação Excel já feita que todos foram carregados.

---

## 8. Chaves (`/keys`)

### 8.1 Form de "Registar entrega" — campos novos
- Substituir/expandir para: **Edifício | Colaborador Luvimg | Empresa | Notas**.
- "Colaborador Luvimg" pode ser um select dos profiles com role admin/staff.
- "Empresa" — fornecedor (FK opcional para `suppliers`) ou texto livre.

### 8.2 Form "Devolver" — incluir Colaborador Luvimg
- Campo "Devolvido a" → Colaborador Luvimg (quem recebeu de volta).

### 8.3 Edição de registo
- Botão Editar em cada linha (hoje só permite criar/marcar devolvido).
- Permitir alterar campo "Entregue por" e "Recebida por" (nomes), datas já estão ok.

### 8.4 Imprimir PDF de chaves em uso
- Novo botão "Imprimir PDF" na lista — gera PDF com filtro `status = em_uso`, agrupado por edifício.
- Reutilizar pattern de `BuildingListPDFTemplate` / react-pdf.

---

## 9. Resumo de prioridades sugerido

```text
P1 — Bugs e ajustes rápidos (UI/UX)
   1.1 Limpar código edifício
   2   KPIs assistências por edifício
   3.1 Ordenação pendências por código
   3.2 Troca título/morada nos cards
   5.1 KPIs inspeções simplificados
   5.2 Novos estados de resultado + migração
   5.3 Bug notas → válido (inspeções e seguros)
   8.1/8.2 Campos chaves

P2 — Funcionalidades estruturais
   1.2 Quantidade elevadores no form + lista
   5.4 Anexos cláusulas/certificados (elev/ext/gás)
   6.2 Anexar apólice de seguros
   7   Render de todos os admins na BC
   8.3 Editar registo de chaves
   8.4 PDF chaves em uso
   4.1 Anexar acta (via BuildingDocumentsTab)

P3 — IA / Futuro
   3.3 Auto-preencher pendência via PDF (IA)
   4.2 Extrair assuntos de acta (IA)
```

---

## 10. Confirmações pedidas ao cliente

1. **Estados de inspeção** — ao migrar os actuais, posso assumir o mapeamento proposto em 5.2 ou prefere rever caso a caso?
2. **Auto-preenchimento de pendências (3.3)** — confirmar que pode usar IA (Lovable AI Gateway, custo a haver). Quer numa segunda fase ou já neste sprint?
3. **Chaves — Empresa** — campo livre ou ligado à tabela `suppliers`?
4. **Anexos das inspeções** — bucket único `inspection-documents` ou separado por tipo?

---

## Detalhes técnicos resumidos

```text
DB:
  - buildings.code: tornar nullable (se ainda não for)
  - inspections.result: enum novo (aprovado, aprovado_clausulas, pendente_relatorio, chumbou)
    + migration de mapeamento dos valores antigos
  - inspections: adicionar coluna `document_path` (ou tabela inspection_attachments)
  - building_insurances: adicionar coluna `policy_path`
  - key_handovers: adicionar colunas
       picked_up_collaborator_id (FK profiles),
       company_supplier_id (FK suppliers nullable) ou company_name text,
       returned_collaborator_id (FK profiles)
  - novos buckets privados: inspection-documents, insurance-documents
       (RLS: só admins)

Frontend:
  - BuildingForm: fix submit code vazio, garantir elevator_count input
  - Componente assistências por edifício: ajustar 4 KPIs
  - EmailPendencies: ordenação + agrupamento por código, troca título/morada
  - CreatePendencyDialog: tab "Importar do PDF" (P3)
  - InspectionForm: novo Select de result, validação independente das notas,
       upload de documento por categoria
  - InsuranceForm: validar 2 colunas frações + upload apólice
  - KnowledgeDetail/procedimentos: render BuildingAdministratorsManager
  - KeyHandoverForm + ReturnDialog: novos campos + edição inline
  - Keys.tsx: botão "Imprimir PDF chaves em uso" + template PDF
  - BuildingDocumentsTab: garantir categoria "atas" visível e link a partir de Assembly

Edge functions (P3):
  - parse-pendency-pdf (PDF → AI → JSON pré-preenchimento)
  - parse-assembly-minutes (PDF acta → AI → lista assuntos)
```
