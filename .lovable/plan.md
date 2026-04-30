## Plano: lembrete opcional na criação de assistência

Permite registar um lembrete não obrigatório ao criar uma assistência, para fazer follow-up do caso. Reutiliza a tabela existente `follow_up_schedules` — sem alterações de schema.

### 1. UI no formulário de criação (`CreateAssistanceForm.tsx`)

Nova secção colapsável "Lembrete (opcional)" entre "Solicitar Orçamento" e os botões. Padrão estilo Asana/Linear:

- **Atalhos rápidos** (botões toggle): `Sem lembrete` (default) · `+1 dia` · `+3 dias` · `+1 semana` · `+2 semanas` · `Data personalizada`
- Quando "Data personalizada" → aparece input `datetime-local` (default: amanhã 09:00)
- **Nota opcional** (textarea, máx 280 char) — ex.: "ligar ao síndico", "confirmar orçamento"
- Pré-visualização: "Vais receber email a 5 Mai 2026 às 09:00 em geral@luvimg.com"

Validação: nota opcional, data obrigatória só se preset = custom.

### 2. Persistência

Após `INSERT` em `assistances` (sucesso), se preset ≠ none:
```ts
await supabase.from("follow_up_schedules").insert({
  assistance_id: assistance.id,
  follow_up_type: "manual_reminder",
  scheduled_for: reminderDate.toISOString(),
  status: "pending",
  metadata: { note: reminderNote, created_by_user: true, recipient: "geral@luvimg.com" },
});
```

Sem nova tabela, sem alteração de RLS (já existe policy admin para `follow_up_schedules`).

### 3. Edge function de envio

Nova `supabase/functions/manual-reminders-cron/index.ts`:
- Lê `follow_up_schedules` onde `follow_up_type='manual_reminder'`, `status='pending'`, `scheduled_for <= now()`.
- Para cada um: busca assistência (título, prioridade, edifício, status), envia 1 email a `geral@luvimg.com` via Resend (mesmo padrão de `inspection-alerts-cron` e `insurance-alerts-cron`) com link directo para `/assistencias/{id}`.
- Marca `status='sent'`, `sent_at=now()`.
- Se a assistência já estiver `completed` ou `cancelled` → marca como `sent` com metadata `skipped_completed: true` (não envia).

Cron diário 08:30 Lisboa (07:30 UTC), via `pg_cron` (insert tool, mesmo padrão dos outros).

### 4. Indicador na lista de assistências

Em `AssistanceCard` / lista: se a assistência tem 1+ `follow_up_schedules` do tipo `manual_reminder` com `status='pending'` e `scheduled_for >= now()`, mostrar pequeno badge `🔔 Lembrete dd/MM` (cor âmbar). Ao passar com o rato, mostra a nota.

Implementação leve: 1 query agregada `useAssistanceReminders()` que devolve `Map<assistanceId, { date, note }>`.

### 5. Email (template)

Email simples HTML inline (mesmo estilo dos outros crons), assunto:
> 🔔 Lembrete: {{título}} — {{Edifício code-name}}

Corpo: prioridade, status actual, dias em aberto, nota do lembrete, botão "Abrir assistência". Sem necessidade de template React Email — mantém-se coerente com `inspection-alerts-cron`.

### Ficheiros tocados

- `src/components/assistance/CreateAssistanceForm.tsx` — schema + UI + insert
- `src/hooks/useAssistanceReminders.ts` — novo hook
- Componente da lista de assistências (a identificar — `AssistanceCard` ou similar) — badge
- `supabase/functions/manual-reminders-cron/index.ts` — novo edge function
- pg_cron job (via insert tool)

### O que NÃO toco

- Schema de `follow_up_schedules` (já tem todos os campos necessários)
- Email templates / scaffolding (não é necessário — segue padrão dos outros crons com Resend directo)
- Edição de lembrete pós-criação (fica para iteração futura se pedires)

### Resultado

Ao criar uma assistência podes (opcional) marcar `+3 dias` com nota "ligar ao síndico". Daí a 3 dias, às 08:30, recebes 1 email em `geral@luvimg.com` com toda a info e link directo. Na lista de assistências, vês um badge 🔔 com a data até o lembrete disparar.
