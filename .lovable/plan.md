## Auditoria — onde estão os dados

Os `admin_notes` dos edifícios estão vazios, mas todo o histórico de inspeções existe na tabela **`knowledge_articles`**, organizado por categoria (uma entrada por edifício e tipo). Total: **213 artigos com dados úteis** distribuídos por 83 edifícios.

| Categoria KB | Artigos | Formato | Significado da data |
|---|---|---|---|
| `gas` | 79 | `Inspecionado em DD/MM/YYYY` | **Última** inspeção (passado) |
| `elevadores` | 48 | `Data Inspeção: DD/MM/YYYY` | **Próxima** devida (futuro) |
| `extintores` | 29 | `Data: DD/MM/YYYY` | **Próxima** devida (futuro) |
| `colunas_eletricas` | 57 | Tabela `Ano \| ok` | **Anos cobertos** pela última inspeção |

Confirmação cruzada com o que disseste:
- Prédio **003** colunas eléctricas: cobertura 2026+2027 → última inspeção em **2025**, próxima em 2028. ✓
- Prédio **126** colunas eléctricas: cobertura 2026+2027+2028 → última inspeção em **2026**, próxima em 2029. ✓

## O que vou fazer

### 1. Edge function de importação (one-shot) `import-inspections-from-kb`
Faz parse de cada artigo segundo a sua categoria e insere em `building_inspections`:

- **Gás** (validade 3 anos) — usa a data extraída como `inspection_date`. Trigger calcula `next_due_date` automaticamente (+3 anos).
- **Elevadores** (validade 2 anos) — a data é a próxima devida; calculo `inspection_date = data − 2 anos`.
- **Extintores** (validade 1 ano) — a data é a próxima; `inspection_date = data − 1 ano`.
- **Coluna Eléctrica** (validade 3 anos) — extraio o ano máximo da tabela; `inspection_date = (ano_max − 2)/06/30`. (Ex.: 003 com max 2027 → última 2025-06-30; 126 com max 2028 → última 2026-06-30.)
- Casos sem data ("Já foi solicitada", contactos sem datas) → ignorados (ficam como `missing` no dashboard, que é o correcto).
- Empresa/contacto extraídos para `company_name` / `company_contact`.
- Idempotente: corre `DELETE FROM building_inspections WHERE notes LIKE 'Importado de KB%'` antes de inserir, para poder re-correr sem duplicar.

### 2. Validação pós-importação
Query de auditoria que mostra:
- Quantas inspeções por categoria foram importadas
- Distribuição final do dashboard (`ok` / `due_soon_30` / `due_soon_15` / `overdue` / `missing`)
- Lista dos casos `missing` por categoria para sabermos o que falta cobrir manualmente

### 3. Pequeno fix UX no dashboard `/inspecoes`
- Mostrar a contagem total e percentagem de cobertura por categoria (ex.: "Gás: 79/83 prédios cobertos").
- Banner discreto a indicar a data da última importação.

### 4. (Opcional, depois) Seed continuo
Se quiseres manter sincronia futura entre knowledge_articles e inspections, podemos adicionar um trigger — mas por agora basta o one-shot.

## O que NÃO vou tocar

- Não vou apagar nem modificar os `knowledge_articles` (continuam a ser a "fonte humana" editável).
- Não vou alterar o schema (já está correcto).
- Não vou enviar emails de teste — o cron diário às 08:00 já está activo e vai disparar com os novos dados naturalmente.

## Resultado esperado

Depois de correr, o dashboard `/inspecoes` deve mostrar (estimativa):
- ~213 inspeções importadas
- Maioria em estado `ok` (datas entre 2026-2027)
- Alguns `due_soon_30/15` (próximos 45 dias)
- Alguns `overdue` (gás de 2022 já passou os 3 anos)
- Restantes `missing` para os edifícios sem registo no KB

E recebes o digest amanhã às 08:00 em `geral@luvimg.com` com a lista real de pendências.

Se preferires, em vez de eu inferir tudo a partir do KB, podes mandar o Excel original e eu importo a partir daí — mais limpo, mas mais demorado. Diz-me como queres avançar.