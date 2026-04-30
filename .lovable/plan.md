
## Diagnóstico — o que está e o que NÃO está alinhado

Auditei `FollowUpDashboard`, `useFollowUpSchedules`, `manual-reminders-cron` e `CreateAssistanceForm`. Resultado:

### ✅ O que já funciona bem
1. **Cron diário**: `manual-reminders-cron` está agendado (08:30 Lisboa) e procura corretamente por `follow_up_type='manual_reminder'` com `scheduled_for <= now()`.
2. **Email tem dados ricos**: o template HTML inclui nº assistência, título, edifício (Code - Name), tipo intervenção, prioridade (chip colorido), estado, dias em aberto, descrição, nota do utilizador e botão "Abrir assistência" → ✅ pronto para encaminhar a fornecedor.
3. **Skip inteligente**: assistências `completed`/`cancelled` são ignoradas e marcadas com `skipped_reason`.
4. **Badge 🔔** já aparece na lista de assistências.

### ❌ Lacunas críticas (precisam correção)

**1. Dashboard `/follow-ups` IGNORA por completo os lembretes manuais**
   - `useFollowUpStats` só conta os 4 tipos antigos (`quotation_reminder`, `date_confirmation`, `work_reminder`, `completion_reminder`). Os `manual_reminder` ficam invisíveis nas estatísticas e no breakdown "Por Tipo".
   - O `followUpTypeLabels` em `FollowUpDashboard.tsx` não tem `manual_reminder` → aparece como **"undefined"** num badge na lista.
   - O botão "Processar Devidos" invoca `process-followups` (não `manual-reminders-cron`), portanto **nunca dispara lembretes manuais manualmente** a partir do dashboard.
   - As tabs de filtro não permitem isolar lembretes manuais.

**2. Falta supplier_id**
   - `follow_up_schedules.supplier_id` é provavelmente NOT NULL (pelos outros tipos). Os manual_reminders são criados sem supplier_id pois são lembretes para a equipa interna, não para fornecedor. Preciso confirmar se a inserção no `CreateAssistanceForm` está a passar (verificar se houve erro silencioso).

**3. Fuso horário do cron**
   - O cron está agendado para 08:30 mas pg_cron usa UTC. Preciso confirmar se foi compensado para Lisboa (07:30 UTC no inverno / 08:30 UTC no verão).

**4. UX do dashboard pode ser melhor**
   - Sem tab/filtro dedicado a "Lembretes manuais".
   - Sem ações rápidas para o caso comum: "snooze +1 dia", "marcar como tratado", "encaminhar agora ao fornecedor" (forward email com 1 clique).
   - Lista não mostra a **nota** do lembrete nem o **edifício formatado** como "Code - Name".

---

## Plano de correção

### A. Tornar lembretes manuais visíveis no dashboard `/follow-ups`

1. **`useFollowUpSchedules.ts`** — adicionar `manual_reminder` em `byType`, e estender o select para incluir `metadata` e `buildings.code`.
2. **`FollowUpDashboard.tsx`**:
   - Adicionar label `manual_reminder: "Lembrete manual"` + ícone 🔔.
   - Nova tab "Lembretes manuais" no filtro de tipo (acima das tabs de status, em formato segmented control).
   - No `FollowUpCard`, mostrar a **nota** (em destaque amarelo) quando existir, e formatar o edifício como `code - name`.
   - Card "Sem fornecedor associado" quando `supplier_id` é null (caso dos manuais).

### B. Botão "Processar agora" para lembretes manuais

- Adicionar segundo botão no header: **"Disparar lembretes manuais"** que invoca `manual-reminders-cron` directamente (útil para testar e para casos urgentes sem esperar 08:30).
- Manter os botões existentes para os outros tipos.

### C. Verificar e corrigir a inserção do lembrete

- Ler `CreateAssistanceForm.tsx` (secção que insere em `follow_up_schedules`) e confirmar:
  - `supplier_id` enviado como `null` é aceite pela coluna (se não for, criar migration para tornar nullable).
  - `priority` está a ser preenchido (campo NOT NULL provável).
  - O insert não falha silenciosamente (capturar erro e mostrar toast).

### D. Fuso horário do cron

- Verificar via `cron.job` qual a expressão actual e ajustar para `30 7 * * *` (UTC) para corresponder a 08:30 Lisboa no horário de verão (CEST = UTC+2). No inverno (WET = UTC) seria 08:30 UTC. Decisão pragmática: usar `30 7 * * *` (chega de manhã cedo todo o ano, nunca antes das 7:30 nem depois das 9:30).

### E. UX extra — "encaminhar ao fornecedor"

- No `FollowUpCard` para `manual_reminder`, adicionar botão **"Encaminhar a fornecedor"** que abre um diálogo com:
  - Selector de fornecedor (dropdown reusando lógica existente)
  - Pré-visualização do email (mesmo HTML que o cron envia)
  - Botão para enviar via `send-email` para o fornecedor escolhido
- Isto cumpre o objectivo "facilitar o encaminhamento ao fornecedor" sem precisar de copy/paste manual.

### F. QA final

- Criar uma assistência teste com lembrete `+1 dia`.
- Disparar `manual-reminders-cron` manualmente.
- Confirmar que o email chega a `geral@luvimg.com` com todos os campos e que a row passa a `status='sent'`.
- Confirmar que aparece como "Enviado" na tab correspondente do dashboard.

---

## Ficheiros a editar / criar

| Ficheiro | Tipo |
|---|---|
| `src/hooks/useFollowUpSchedules.ts` | editar (incluir manual_reminder nas stats e select) |
| `src/components/followups/FollowUpDashboard.tsx` | editar (label, ícone, tab, botão dispara cron, card melhorado) |
| `src/components/assistance/CreateAssistanceForm.tsx` | verificar/corrigir insert (error handling) |
| `src/components/followups/ForwardToSupplierDialog.tsx` | **novo** — diálogo de encaminhamento |
| Migration SQL | tornar `supplier_id` nullable em `follow_up_schedules` se necessário; ajustar cron para `30 7 * * *` UTC |

---

## Resposta directa às tuas perguntas

1. **Menu Follow-up alinhado com os lembretes?** ❌ Não — actualmente os lembretes manuais não aparecem nas stats nem têm label próprio. Vou alinhar.
2. **Email envia a assistência com todos os dados no dia certo?** ✅ Sim — o template já inclui tudo o necessário para encaminhar ao fornecedor (excepto que o cron pode disparar 1h tarde por causa do fuso). Vou ajustar o horário UTC.
3. **Dashboard optimizado para a melhor experiência?** Parcialmente — vai ficar com: filtro dedicado, processar manual on-demand, snooze rápido, nota visível, e botão **encaminhar ao fornecedor** com 1 clique.

Aprovas para avançar?
