## Problema

Ao criar uma assistência de elevador (ex: #793, #789), nenhum email é enviado.

**Causa-raiz:** O envio de email em `CreateAssistanceForm.tsx` está condicionado a `assistance.assigned_supplier_id`. Como nas assistências de elevador raramente se escolhe o fornecedor manualmente (cada edifício tem um contrato anual com um fornecedor específico — Ascensoeleva, TecniAbrantes, Schindler, Orona, etc.), o campo fica vazio e nada é enviado.

**Dados disponíveis na KB:** Para quase todos os edifícios existe um artigo `knowledge_articles` com `category = 'elevadores'` contendo o nome da empresa e o email de contacto (ex: `ascensoeleva.lda@sapo.pt`, `tecniabrantes.geral@gmail.com`, `sandra.ribeiro@schindler.com`, `lisboa@orona.pt`, etc.).

## Solução

Aproveitar a KB para resolver automaticamente o fornecedor de elevador do edifício e atribuí-lo na criação, garantindo que o email é sempre disparado.

### 1. Novas colunas na KB de elevadores (sem migrar dados)

Adicionar à tabela `knowledge_articles` dois campos opcionais já preenchíveis para `category='elevadores'`:
- `supplier_id uuid` (FK para `suppliers`, nullable) — fornecedor canónico
- Reaproveitar `metadata jsonb` para guardar `{ company_name, contact_email, phone }` extraídos

### 2. Migração + seeding inicial

- Migration: adicionar coluna `elevator_supplier_id uuid` em `buildings` (mais direto que percorrer KB em runtime)
- Script de seeding (one-shot via insert tool):
  1. Para cada edifício com artigo `category='elevadores'`, fazer parse do markdown (regex `Empresa:` + `Email:`)
  2. Encontrar/criar `supplier` correspondente (se já existir empresa pelo nome ou email, reutiliza; senão cria novo com `specialization='Elevadores'` e o email real da KB — não `geral@luvimg.com`)
  3. Gravar `buildings.elevator_supplier_id`
  4. Relatório no fim: edifícios resolvidos vs sem KB

### 3. Pré-seleção automática no formulário

Em `CreateAssistanceForm.tsx`:
- Quando o utilizador seleciona um edifício **e** um `intervention_type` cuja `name ILIKE '%elevad%'`, fazer `setValue('assigned_supplier_id', building.elevator_supplier_id)` automaticamente
- Mostrar um aviso visível: *"Fornecedor de elevador deste edifício pré-selecionado: Ascensoeleva (ascensoeleva.lda@sapo.pt). Pode alterar."*
- Permanece editável (override manual)

### 4. Fallback robusto no `onSuccess`

Se mesmo assim `assigned_supplier_id` ficar `null`:
- Para tipos de elevador, em vez de não enviar nada, despachar `send-assistance-pdf-to-admin` com `mode='archive'` para `geral@luvimg.com`, para a administração reencaminhar manualmente
- Toast claro: *"Assistência criada. Sem fornecedor de elevador associado ao edifício — PDF enviado para geral@luvimg.com."*

### 5. UI: gestão do fornecedor de elevador no edifício

Na página de detalhe do edifício, adicionar um pequeno card "Fornecedor de Elevador" com:
- Nome + email atuais (lidos de `buildings.elevator_supplier_id`)
- Botão "Alterar" que abre dropdown com fornecedores `specialization='Elevadores'`
- Link "Sincronizar a partir da KB" que volta a fazer parse do artigo

## Detalhes técnicos

```text
buildings
  └─ elevator_supplier_id ──► suppliers (specialization='Elevadores')
                                  ▲
knowledge_articles (category='elevadores')
  ──[seed script: regex Empresa/Email]──► cria/atualiza supplier + grava FK
```

**Regex parse**: `/\*\*Empresa:\*\*\s*([^\n]+)/i` e `/\*\*Email:\*\*\s*([^\s\n]+)/i` (separar múltiplos emails por `//` ou `,`)

**Order de operações no formulário** (`useEffect` reagindo a `building_id` + `intervention_type_id`):
1. Se já há `assigned_supplier_id` definido pelo utilizador → não mexer
2. Se `intervention_type.name` matches `/elevad/i` e `building.elevator_supplier_id` existe → set automático
3. Caso contrário → deixar vazio

**Sem alterações** ao fluxo de envio existente (`request-quotation-email`, `sendMagicCodeToSupplier`, `send-assistance-pdf-to-admin`) — só passa a haver `assigned_supplier_id` mais frequentemente.

## Ficheiros afetados

- `supabase/migrations/...` — adicionar `buildings.elevator_supplier_id`
- Script SQL de seeding (one-shot via insert tool, não migration)
- `src/components/assistance/CreateAssistanceForm.tsx` — pré-selecção + fallback admin
- `src/components/buildings/BuildingDetail.tsx` (ou equivalente) — card "Fornecedor de Elevador"
- `src/integrations/supabase/types.ts` — auto-regenerado

## Fora deste plano

- Generalizar para outras categorias (gás, extintores, seguros) — mesma KB existe; pode ser feito num passo seguinte se aprovares
- Editar/criar nova UI para gerir contratos anuais de fornecedores (apenas o link rápido por edifício)
