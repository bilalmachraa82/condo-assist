
# Plano: Inspeções Periódicas + Alertas (App & Email)

## Diagnóstico

Hoje **não existe** estrutura para guardar datas de inspeção (elevador, gás, extintor, coluna eléctrica, etc.). As poucas datas que existem vivem em texto markdown em `_backup_dates_*`. Sem dados estruturados, não há como gerar alertas fiáveis.

A Coluna Eléctrica tem regra clara: **inspecção válida 3 anos**. Exemplo: prédio 003 com último OK em 2025 → próximo 2028; prédio 126 com OK em 2026 → próximo 2029.

## Best practices que faltam (resumo)

1. **Dados estruturados** (datas, não texto livre) — fonte única de verdade.
2. **Categorias normalizadas** (enum: coluna_electrica, gas, elevador, extintor, ave, ite, para_raios…).
3. **Cadência por categoria** (cada tipo tem a sua periodicidade legal: gás 3a, elevador 2a, extintor 1a, coluna eléctrica 3a, ITE 8a, etc.).
4. **Próxima data calculada** (`next_due = last_inspection + interval`), não inserida à mão.
5. **Estados visuais** (OK / a vencer 30d / a vencer 15d / vencido / em falta).
6. **Múltiplos canais de alerta** (badge na app + email com agregação diária).
7. **Idempotência** (não enviar 2x o mesmo alerta no mesmo dia).
8. **Histórico** (cada inspecção fica registada — auditoria).
9. **Anexar certificado/PDF** à inspecção (opcional fase 2).
10. **Dashboard de compliance** com semáforo por edifício.

---

## Arquitectura proposta

### 1. Novas tabelas

**`inspection_categories`** (catálogo, seed inicial)
- `id`, `key` (enum-like: `coluna_electrica`, `gas`, `elevador`, `extintor`, `ave`, `ite`, `para_raios`)
- `label`, `validity_years` (3, 2, 1, 8…), `legal_reference`, `color`, `icon`
- `alert_days` (default `[30, 15]`)

**`building_inspections`** (uma linha por inspecção realizada)
- `id`, `building_id` (FK), `category_id` (FK)
- `inspection_date` (date) — quando foi feita
- `result` (`ok` | `nok_minor` | `nok_major` | `pending_works`)
- `next_due_date` (date, gerado: `inspection_date + validity_years`)
- `company_name`, `company_contact`, `certificate_url` (storage)
- `notes`, `created_by`, timestamps
- Index em `(building_id, category_id, inspection_date desc)`

**`inspection_alerts_log`** (idempotência)
- `id`, `inspection_id`, `alert_type` (`30d` | `15d` | `overdue`), `sent_at`, `recipient_email`
- UNIQUE (`inspection_id`, `alert_type`) — impede duplicados

**View `building_inspection_status`** (computed)
- Para cada `(building, category)` devolve a inspecção mais recente, `next_due_date`, `days_until_due`, `status` (`ok` | `due_soon_30` | `due_soon_15` | `overdue` | `missing`).
- Edifícios sem inspecção numa categoria aparecem como `missing` → caso da Coluna Eléctrica para os prédios sem OK.

### 2. RLS
Mesmo padrão das outras tabelas: `is_admin(auth.uid())` para tudo. Categorias legíveis a authenticated.

### 3. Edge function `inspection-alerts-cron`
Corre diariamente (pg_cron 08:00 Lisboa):
1. Faz `SELECT` na view filtrando `status IN ('due_soon_30','due_soon_15','overdue')`.
2. Agrupa por edifício e prioridade.
3. Envia **um email digest** para `geral@luvimg.com` com tabela: edifício, categoria, próxima data, dias restantes, empresa, link para a app.
4. Insere em `inspection_alerts_log` para não repetir no mesmo ciclo.
5. Cria também um registo em `notifications` para aparecer no sino da app.

Para "vencido" → email com cabeçalho vermelho, repete semanalmente até ser resolvido (nova inspecção criada).

### 4. UI (app)

**Nova página `/inspecoes`** (item no sidebar com ícone ShieldCheck):
- Tabs: **Visão geral** | **Por edifício** | **Por categoria** | **Histórico**
- **Visão geral**: cards KPI (Em dia / A vencer 30d / A vencer 15d / Vencidos / Em falta) com cores semáforo (verde/âmbar/laranja/vermelho/cinza).
- Tabela compliance com filtros (categoria, status, edifício) — cada linha mostra badge colorido + dias restantes + acção rápida "Registar inspecção".
- **Botão "Registar inspecção"** abre modal: edifício, categoria, data, resultado, empresa, notas, upload certificado. `next_due_date` calculado em tempo real e mostrado ao utilizador ("Próxima inspecção: 12/03/2029").

**Página de Edifício** ganha secção **"Inspeções"** com mini-semáforo por categoria + timeline.

**Sino de notificações** (já existe `RealtimeNotificationCenter`) passa a mostrar alertas de inspecção.

**Configurações → Notificações**: toggle por categoria + edição dos dias de alerta (default 30/15) + email destinatário (default `geral@luvimg.com`, multi-email opcional).

### 5. Coluna Eléctrica — caso especial pedido

Após criar a tabela, fazer **seed inicial** das inspecções conhecidas baseado nos OKs do Excel/notas (ex.: prédio 003 → `inspection_date 2025-XX-XX` → `next_due 2028`; prédio 126 → 2026 → 2029). Para os prédios **sem OK conhecido**, não inserimos nada — eles aparecem automaticamente como `missing` na view e geram alerta imediato "Coluna eléctrica em falta".

Vou pedir-te para confirmar/colar a lista de OKs conhecidos por prédio antes de fazer o seed (ou faço a partir do que conseguir extrair da pasta `_backup_dates_*` + apresento para validares).

### 6. Email design

- Template React Email coerente com a marca (azul Luvimg, logo, footer `geral@luvimg.com`).
- Assunto: `[Luvimg] 5 inspeções a vencer nos próximos 30 dias`.
- Corpo: tabela responsiva, agrupada por urgência, CTA "Abrir painel de inspecções".
- Versão texto plano para compatibilidade.

---

## Entregáveis por fase

**Fase 1 — Fundação (este PR)**
- Migração: tabelas + view + RLS + seed de `inspection_categories` (7 categorias com validades legais PT).
- Página `/inspecoes` completa (KPIs + tabela + modal registar).
- Secção "Inspeções" no detalhe de Edifício.
- Settings de notificações.

**Fase 2 — Automação**
- Edge function `inspection-alerts-cron` + pg_cron diário.
- Template de email digest + envio via `send-transactional-email` (Lovable Emails) para `geral@luvimg.com`.
- Integração com sino in-app.

**Fase 3 — Seed & migração de dados**
- Importar OKs históricos da Coluna Eléctrica (depois de validares a lista).
- Importar outras datas existentes em `_backup_dates_*`.

---

## Perguntas antes de avançar

1. Confirmas as **periodicidades legais** (gás 3a, elevador 2a, extintor 1a, coluna eléctrica 3a, ITE 8a, AVAC 2a, pára-raios 3a)? Queres adicionar/remover categorias?
2. Para além de `geral@luvimg.com`, queres copiar mais alguém (ex.: gestor responsável pelo edifício)?
3. Frequência do email: **digest diário às 08:00** (recomendado) ou imediato a cada alerta?
4. Para vencidos, repetir alerta **semanalmente** até resolver — ok?

Se aprovares, implemento a Fase 1 + Fase 2 num só ciclo e depois pedimos a lista para o seed.
