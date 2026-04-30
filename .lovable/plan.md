## Diagnóstico do erro 400

Logs Postgres: `tuple to be updated was already modified by an operation triggered by the current command`.

**Causa**: ao mudar o estado da pendência, há uma cascata recursiva:
1. `UPDATE email_pendencies SET status=...`
2. `BEFORE UPDATE` → `log_pendency_status_change` insere uma nota com `note_type='status_change'`
3. `AFTER INSERT` em `email_pendency_notes` → `bump_pendency_activity` faz `UPDATE` na **mesma linha** que ainda está a ser actualizada → erro.

## Plano

### Parte 1 — Corrigir o erro 400 (bloqueante)

Migration na BD:

- `bump_pendency_activity` passa a ignorar `note_type='status_change'` (o trigger de status já actualiza `last_activity_at` no `NEW`, não precisa de bump).
- `log_pendency_status_change` e `bump_pendency_activity` ficam `SECURITY DEFINER` com `SET search_path=public` para passar RLS de forma fiável.

### Parte 2 — Lembretes/Follow-up: como funciona e como unificar

**Como configurar lembretes hoje (já implementado):**

1. **Data limite (`due_date`)** no separador *Resumo* da pendência — apenas indicador visual.
2. **Lembretes manuais** no separador *Lembretes* da pendência ou no toggle "Agendar lembrete" ao criar — escolhes data/hora + nota e recebes email em `geral@luvimg.com` à hora marcada (com contador de tentativas; re-envia +2 dias até esgotar `max_attempts=3`).
3. **Lembretes SLA automáticos** — quando passas a *Aguarda resposta*, são criados automaticamente 3 lembretes (3, 7 e 14 dias após `email_sent_at` ou criação). São cancelados se passares a *Resolvido* / *Cancelado*.

**Unificação no dashboard Follow-ups (nova):**

Em vez de duplicar tabelas, mantemos `pendency_reminders` (mais ricas: tipo, SLA step, attempt counter por pendência) mas espelhamos a vista no dashboard Follow-ups para teres tudo num só sítio:

- Adicionar separador **"Pendências Email"** ao `FollowUpDashboard` ao lado de *Pendentes / Enviadas / Falhadas*.
- Esse separador lista `pendency_reminders` com colunas idênticas: edifício, fornecedor, tipo (Manual / SLA auto), agendado para, tentativa X/Y, estado, ações (cancelar, abrir pendência).
- KPIs no topo do dashboard incluem contagem de lembretes de pendência pendentes/vencidos.
- Botão **"Processar agora"** invoca `pendency-reminders-cron` (já existe), tal como o existente para `manual-reminders-cron`.
- Cada cartão tem botão "Abrir pendência" que abre o `PendencyDetail` no separador *Lembretes*.

**Por que não fundir tudo numa só tabela `follow_up_schedules`:** as pendências têm tipos próprios (`sla_auto` step 1/2/3, link a `pendency_id` em vez de `assistance_id`) e o cron já existe e funciona; fundir obrigaria a alterar muitas constraints e edge functions estáveis. A unificação visual no dashboard dá-te a melhor experiência sem risco. Best practice 2026 (linear-style ops): "single pane of glass" para o utilizador, dados na origem certa.

### Parte 3 — Pequenos ajustes UX

- No `PendencyDetail` separador *Resumo*, ao guardar `due_date`, oferecer atalho **"Agendar lembrete para esta data"** que cria automaticamente um lembrete manual 09:00 desse dia.
- Badge no sidebar Follow-ups mostra total de lembretes pendentes (assistência + pendência) com SLA vencido.

## Ficheiros tocados

- **DB migration** (corrigir 400 + tornar triggers `SECURITY DEFINER`).
- `src/hooks/usePendencyReminders.ts` — adicionar `useAllPendencyReminders()` + `useTriggerPendencyReminders()`.
- `src/components/followups/FollowUpDashboard.tsx` — novo separador "Pendências Email" + KPI.
- `src/components/followups/PendencyRemindersTab.tsx` — novo componente listando lembretes de pendência.
- `src/components/pendencies/PendencyDetail.tsx` — atalho "Agendar lembrete para data limite".
- `src/components/layout/AppSidebar.tsx` — badge contagem (opcional).

## Resultado para ti

- Mudanças de estado deixam de dar erro 400 e timeline regista corretamente.
- Configuras follow-ups das pendências exatamente como nas assistências (data, nota, atalhos +1d/+3d/+1sem).
- Vês todos os lembretes (assistências + pendências) no mesmo dashboard Follow-ups, com filtros por origem, estado, vencidos, e ação rápida "Processar agora".
