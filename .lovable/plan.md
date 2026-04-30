## Objetivo (revisto)

Mini-CRM de **Pendências Email** ligado a edifícios/assistências/fornecedores, com **importação manual do PDF do email** (drag-and-drop), estados, notas internas, anexos e timeline. Sem geração automática de PDF — o utilizador faz "Print to PDF" no cliente de email e arrasta para a app.

## User journey otimizado (best practice CRM 2026)

**Cenário típico:** Admin envia email a fornecedor → faz "Print → Save as PDF" no Outlook/Gmail → arrasta PDF para a app → cria pendência em 3 cliques.

```
1. Sidebar → "Pendências Email" 
2. Botão "+ Nova pendência" (ou drag PDF direto na página → cria automaticamente)
3. Dialog pré-preenche título do PDF, pede: edifício* · assistência (opt) · fornecedor (opt) · prioridade · estado inicial
4. Submit → abre detalhe com PDF já anexado e visível em preview
```

**Atalhos de fluxo (reduzir fricção):**
- **Drag-to-create global**: largar PDF em qualquer sítio da página `/pendencias-email` abre o dialog com o ficheiro já carregado
- **Quick-create a partir de assistência**: botão em `AssistanceDetail` "Criar pendência" pré-preenche edifício+assistência+fornecedor
- **Quick-create a partir do `ForwardToSupplierDialog`**: após enviar email, checkbox "Criar pendência de seguimento" — abre dialog em modal sobreposto a pedir só o PDF (resto pré-preenchido a partir do contexto do email enviado)
- **Atalhos teclado**: `N` nova pendência, `/` foco busca, `J/K` navegar lista, `E` editar estado

## Reaproveitamento do que já existe

| Existente | Como é reaproveitado |
|---|---|
| `ForwardToSupplierDialog` | Adiciona checkbox "Criar pendência" + opção de anexar PDF |
| `HighlightText` + padrão de busca | Busca em título/descrição/notas |
| `StatusBadge`/`PriorityBadge` | Mapeamento dos novos estados aos mesmos tons (warning/primary/success/destructive) |
| `manual-reminders-cron` | Estendido para incluir digest de pendências SLA-vencido (não cria nova função) |
| Padrão `upload-supplier-file` | Base do novo `upload-pendency-file` (validação MIME, rate limit, storage) |
| `email_logs` | Timeline puxa também emails enviados ligados ao edifício/assistência |
| `activity_log` | Mudanças de estado e anexos também registados aqui (consistência) |
| Layout sidebar/`DashboardLayout` | Item adicionado no grupo Principal |
| Mobile cards pattern (Assistencias.tsx) | Mesmo padrão para lista mobile |
| `format(...,'dd/MM/yyyy', { locale: ptBR })` | Mesma formatação de datas |
| Building "CODE - Name" (memória core) | Sempre aplicado |

## Modelo de dados (3 tabelas + bucket, RLS admin-only)

**`email_pendencies`**
- `id`, `title`, `description`, `subject` (assunto do email), `email_sent_at` (data do email original — opcional, default `created_at`)
- `building_id` (FK), `assistance_id` (FK opt), `supplier_id` (FK opt)
- `status` enum: `aberto` | `aguarda_resposta` | `resposta_recebida` | `precisa_decisao` | `escalado` | `resolvido` | `cancelado`
- `priority` (reutiliza `assistance_priority`)
- `assigned_to` (uuid → profile), `due_date`, `last_activity_at`
- `created_by`, `created_at`, `updated_at`

**`email_pendency_notes`** — append-only (notas + log automático de mudanças de estado)
- `id`, `pendency_id`, `author_id`, `body`, `note_type` ('manual'|'status_change'|'system'), `created_at`

**`email_pendency_attachments`**
- `id`, `pendency_id`, `file_name`, `file_path`, `file_size`, `mime_type`, `kind` ('email_pdf'|'reply_pdf'|'attachment'|'other'), `description`, `uploaded_by`, `created_at`

**Bucket privado** `email-pendencies` (RLS: admin) + trigger `update_last_activity` (atualiza `last_activity_at` em insert de notas/anexos/update de status).

## SLA visual (consistente com sistema atual)

Chip junto ao estado:
- 🟢 Verde — actividade < 3 dias
- 🟡 Amarelo — 3-7 dias sem actividade em estado "aguarda_resposta"/"escalado"
- 🔴 Vermelho — > 7 dias

Digest diário 08:30 Lisboa para `geral@luvimg.com` com pendências SLA-vencido (estende cron existente).

## UI / Componentes (todos novos exceto integrações)

**Página:** `src/pages/EmailPendencies.tsx`
- Header: título + KPIs (Abertas / Aguarda resposta / Escaladas / SLA vencido) + botão "+ Nova"
- Toggle Lista ↔ Kanban (Lista por defeito em mobile, Kanban em ≥md)
- Filtros: edifício · estado (multi) · responsável · SLA · pesquisa global
- Drop-zone invisível em toda a página (drag PDF → abre create dialog com ficheiro)

**Componentes:** `src/components/pendencies/`
- `PendencyList.tsx` — tabela densa desktop + cards mobile (padrão Assistencias)
- `PendencyKanban.tsx` — 6 colunas, drag-to-update status (usa `@dnd-kit` se já presente, senão fallback botões)
- `PendencyCard.tsx` — usado em lista mobile e kanban
- `PendencyDetail.tsx` — Sheet lateral (não dialog full screen, melhor UX): cabeçalho + tabs **Resumo · Timeline · Anexos · Notas**
- `CreatePendencyDialog.tsx` — formulário com drag-and-drop PDF inicial, edifício obrigatório, resto opcional
- `PendencyAttachments.tsx` — lista de anexos com preview PDF inline (`<iframe>` em signed URL), drag-to-add, badge de data e tipo
- `PendencyTimeline.tsx` — feed unificado: notas + mudanças estado + anexos + emails de `email_logs` ligados
- `PendencyStatusSelect.tsx` — selector de estado com cores consistentes
- `PendencyAssignSelect.tsx` — selector responsável (lista profiles admin)

**Hooks:** `src/hooks/usePendencies.ts` (list, get, create, update, addNote, uploadAttachment, deleteAttachment, changeStatus, assign)

## Edge function

`supabase/functions/upload-pendency-file/index.ts` — segue padrão `upload-supplier-file` mas autentica via JWT admin (não magic code):
- Valida MIME: `application/pdf`, `image/png`, `image/jpeg`, `message/rfc822` (.eml)
- Max 15MB
- Gera signed URL para preview imediato
- Regista em `activity_log`

## Sidebar

Adicionar entre "Follow-ups" e "Edifícios":
```ts
{ title: "Pendências Email", url: "/pendencias-email", icon: MailQuestion }
```

## Integrações pontuais

1. **`ForwardToSupplierDialog.tsx`** — checkbox "📎 Criar pendência de seguimento (anexar PDF do email)" → ao submeter, abre `CreatePendencyDialog` em segundo passo já pré-preenchido (assistência, fornecedor, edifício, assunto), pedindo apenas o PDF
2. **`AssistanceDetail.tsx`** — nova secção "Pendências relacionadas" mostrando pendências com `assistance_id = X` + botão "+ Nova pendência"
3. **`manual-reminders-cron`** — append section "Pendências com SLA vencido" no email diário

## Migration SQL (resumo)

```sql
create type pendency_status as enum (...);
create table email_pendencies (...);
create table email_pendency_notes (...);
create table email_pendency_attachments (...);
create policy "Admins manage pendencies" on email_pendencies for all using (is_admin(auth.uid()));
-- (mesmas policies admin-only para notes/attachments)
create function update_pendency_last_activity() returns trigger ...;
create trigger ... on email_pendency_notes ...;
create trigger ... on email_pendency_attachments ...;
create trigger ... on email_pendencies (when status changes) ...;
insert into storage.buckets (id, name, public) values ('email-pendencies', 'email-pendencies', false);
create policy "Admins manage pendency files" on storage.objects ...;
```

## Fora de âmbito

- Sincronização IMAP/Gmail automática
- OCR do PDF anexado (procura full-text dentro do PDF)
- Templates de resposta
- Atribuição multi-utilizador em tempo real

---

**Confirmas para implementar tudo?** Ou queres faseado (Fase 1: tabelas + página + CRUD + upload PDF · Fase 2: kanban + integrações + cron)?