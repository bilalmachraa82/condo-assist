

## Plano: API REST para AI Externo + Atalho Rápido para Elevadores

### Parte 1: API REST (Edge Functions) para AI Externo

Criar edge functions protegidas por API key que permitem a um AI externo interagir com o sistema.

**Edge function: `api-assistances/index.ts`**

Uma única edge function com routing interno baseado no método HTTP e path:

- `GET /` - Listar assistências (com filtros: status, priority, building_id, supplier_id, limit, offset)
- `GET /?id=xxx` - Obter detalhes de uma assistência específica
- `POST /` - Criar nova assistência (title, description, building_id, intervention_type_id, priority, assigned_supplier_id)
- `PATCH /` - Atualizar estado/notas de uma assistência (status, admin_notes, supplier_notes)

**Edge function: `api-references/index.ts`**

- `GET /?type=buildings` - Listar edifícios
- `GET /?type=suppliers` - Listar fornecedores
- `GET /?type=intervention_types` - Listar tipos de intervenção

**Autenticação:**
- Header `x-api-key` validado contra um secret `EXTERNAL_API_KEY` configurado no Supabase
- Usa service_role key internamente para bypass de RLS
- Rate limiting básico

**Acesso DB read-only (para MCP):**
- Documentar as credenciais de acesso read-only ao Supabase (connection string) para que o AI externo possa consultar dados diretamente via SQL/PostgREST
- O PostgREST já existe no Supabase - basta usar o URL + anon key para leituras autenticadas

**Ficheiros a criar:**
1. `supabase/functions/api-assistances/index.ts`
2. `supabase/functions/api-references/index.ts`

**Secret a adicionar:**
- `EXTERNAL_API_KEY` - chave que o AI externo usará para autenticar

---

### Parte 2: Atalho Rápido para Elevadores

Adicionar na página de Assistências um menu/secção dedicada a elevadores com:

1. **Contador de assistências de elevador** - Badge/card na zona do header mostrando quantas assistências de elevador estão ativas (pendentes + em progresso)

2. **Botão "Elevador Rápido"** - Abre um formulário simplificado com:
   - Tipo de intervenção: pré-selecionado com o tipo de elevador (procurado automaticamente na tabela `intervention_types`)
   - Prioridade: pré-definida como "urgent"
   - Campos visíveis: apenas **edifício** (dropdown) e **descrição** (texto livre)
   - Título: auto-gerado como "Avaria Elevador - [Nome Edifício]"
   - Submissão rápida com 2 cliques

3. **Localização no UI** - Botão com ícone de elevador ao lado do botão "Nova Assistência", com badge de contagem

**Ficheiros a alterar:**
1. `src/pages/Assistencias.tsx` - Adicionar botão rápido elevador + contador
2. Novo componente: `src/components/assistance/QuickElevatorForm.tsx` - Formulário simplificado

---

### Sequência de implementação

1. Adicionar secret `EXTERNAL_API_KEY`
2. Criar edge function `api-assistances`
3. Criar edge function `api-references`
4. Deploy e testar ambas as edge functions
5. Criar componente `QuickElevatorForm`
6. Integrar botão rápido na página de Assistências

---

### Detalhes Técnicos - API

```text
POST /api-assistances
Headers: x-api-key: <EXTERNAL_API_KEY>
Body: {
  "title": "Avaria elevador",
  "description": "...",
  "building_id": "uuid",
  "intervention_type_id": "uuid",
  "priority": "urgent"
}
Response: { "id": "uuid", "assistance_number": 753 }

GET /api-assistances?status=pending&limit=50
Headers: x-api-key: <EXTERNAL_API_KEY>
Response: { "data": [...], "count": 27 }

PATCH /api-assistances?id=uuid
Headers: x-api-key: <EXTERNAL_API_KEY>
Body: { "status": "in_progress", "admin_notes": "..." }
```

Para acesso MCP/DB direto, o AI externo pode usar o PostgREST do Supabase:
```text
GET https://zmpitnpmplemfozvtbam.supabase.co/rest/v1/assistances?status=eq.pending
Headers: apikey: <anon_key>, Authorization: Bearer <service_role_key>
```

