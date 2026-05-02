> **Quero implementar na Condo Assist uma feature nova de minuta de ata a partir de áudio para administração de condomínios em Portugal.**
>
> **A feature deve seguir estas regras não negociáveis:**
>
> - **A IA gera uma minuta de ata, nunca uma ata final automática.**
> - **A aprovação final é sempre humana e auditável.**
> - **A entidade principal é** `assemblies`**, que passa a ser a fonte de verdade documental.**
> - `assembly_items` **e tarefas derivadas só nascem da versão aprovada da ata.**
> - **Toda a lógica crítica corre no backend com Supabase Edge Functions.**
> - **O áudio fica em storage privado, com acesso restrito.**
> - **O sistema deve suportar ficheiros áudio até 4 horas, processamento assíncrono, retries e jobs longos.**
> - **A UI deve estar em PT-PT consistente.**
> - **O sistema nunca deve inventar nomes, votações, permilagens, montantes, vencimentos ou anexos em falta.**
>
> **Quero que construas isto por fases e sem quebrar a arquitetura existente da Condo Assist.**
>
> **Antes de implementar, apresenta e depois executa nesta ordem:**
>
> 1. **schema SQL,**
> 2. **RLS/policies,**
> 3. **storage bucket privado,**
> 4. **Edge Functions,**
> 5. **páginas e componentes,**
> 6. **integração com módulos existentes,**
> 7. **observabilidade e retries.**
>
> **Requisitos funcionais:**
>
> - **Criar assembleia associada a edifício.**
> - **Carregar ficheiro áudio.**
> - **Criar job assíncrono.**
> - **Transcrever com speaker diarization.**
> - **Mostrar transcript com timestamps.**
> - **Permitir renomeação manual dos speakers.**
> - **Extrair agenda, intervenientes, votações, deliberações, montantes, prazos e ambiguidades.**
> - **Gerar minuta versionada.**
> - **Permitir regeneração controlada da minuta.**
> - **Exigir checklist antes da aprovação.**
> - **Gerar** `assembly_resolutions` **e** `assembly_action_items` **só após aprovação.**
> - **Opcionalmente gerar envio/email depois da aprovação.**
>
> **Requisitos técnicos:**
>
> - **Separar estado documental de** `assemblies` **do estado técnico de** `assembly_audio_jobs`**.**
> - **Criar fila persistente para jobs longos e retries.**
> - **Usar webhook idempotente ou polling controlado.**
> - **Validar tudo com RLS + autorização no backend.**
> - **Ter logs, watchdog de jobs presos e métricas mínimas por job.**
>
> **Requisitos de IA:**
>
> - **Separar extração estruturada da redação da minuta.**
> - **Produzir primeiro JSON validado por schema.**
> - **Só depois gerar a minuta em markdown/html.**
> - **Mostrar** `validation_warnings` **e** `missing_fields`**.**
> - **Não prender a implementação a um único modelo LLM; usar backend configurável.**
>
> **Estrutura PT-PT da minuta:**
>
> - **identificação do condomínio,**
> - **data/hora/local/tipo de assembleia,**
> - **convocatória e quórum,**
> - **presidente e secretário,**
> - **lista de presenças/representações/ausências,**
> - **ordem de trabalhos,**
> - **discussão por ponto,**
> - **propostas, votações e deliberações,**
> - **valores, prazos, responsáveis e anexos,**
> - **encerramento,**
> - **assinaturas/rubricas.**
>
> **Importante: quero implementation plan detalhado e depois código faseado. Não quero atalhos de segurança nem lógica crítica no frontend.**

## **SQL base**

Abaixo está a lista do que eu pediria ao Lovable para criar em SQL. É melhor pedir primeiro as tabelas e enums, depois constraints, depois RLS, para reduzir erros em Plan/Agent mode.

## **Enums**

```
sql
```

`create type assembly_type as enum ('ordinaria', 'extraordinaria');`  
`create type assembly_call_type as enum ('primeira_convocatoria', 'segunda_convocatoria');`  
`create type assembly_status as enum ('draft', 'under_review', 'approved', 'archived', 'failed');`  
  
`create type audio_job_status as enum (`  
  `'uploading',`  
  `'queued',`  
  `'processing',`  
  `'transcribed',`  
  `'draft_generating',`  
  `'draft_ready',`  
  `'failed'`  
`);`  
  
`create type attendee_type as enum ('present', 'represented', 'absent');`  
`create type minutes_version_status as enum ('ai_draft', 'reviewed_draft', 'approved_final');`  
`create type dispatch_type as enum ('email', 'download', 'portal');`  
  
`create type processing_job_type as enum (`  
  `'transcription_start',`  
  `'draft_generation',`  
  `'draft_regeneration',`  
  `'post_approval_sync',`  
  `'dispatch'`  
`);`  
  
`create type processing_status as enum ('pending', 'running', 'retrying', 'done', 'failed');`

Este desenho separa estados documentais e técnicos, o que evita misturar revisão legal com pipeline operacional.

## **Tabelas principais**

```
sql
```

`create table assemblies (`  
  `id uuid primary key default gen_random_uuid(),`  
  `building_id uuid not null references buildings(id) on delete cascade,`  
  `assembly_type assembly_type not null,`  
  `meeting_date date not null,`  
  `start_time time,`  
  `end_time time,`  
  `location text,`  
  `call_type assembly_call_type,`  
  `chairperson_name text,`  
  `secretary_name text,`  
  `status assembly_status not null default 'draft',`  
  `created_by uuid not null references auth.users(id),`  
  `approved_by uuid references auth.users(id),`  
  `approved_at timestamptz,`  
  `created_at timestamptz not null default now(),`  
  `updated_at timestamptz not null default now()`  
`);`  
  
`create table assembly_audio_jobs (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `provider text not null,`  
  `provider_job_id text,`  
  `audio_storage_path text not null,`  
  `audio_duration_seconds integer,`  
  `audio_size_bytes bigint,`  
  `mime_type text,`  
  `status audio_job_status not null default 'uploading',`  
  `error_code text,`  
  `error_message text,`  
  `cost_cents_estimated integer,`  
  `cost_cents_actual integer,`  
  `webhook_received_at timestamptz,`  
  `created_at timestamptz not null default now(),`  
  `updated_at timestamptz not null default now()`  
`);`  
  
`create table assembly_transcript_segments (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `audio_job_id uuid not null references assembly_audio_jobs(id) on delete cascade,`  
  `speaker_label text,`  
  `speaker_name text,`  
  `speaker_role text,`  
  `start_ms integer not null,`  
  `end_ms integer not null,`  
  `text text not null,`  
  `confidence numeric(5,4),`  
  `raw_json jsonb,`  
  `created_at timestamptz not null default now()`  
`);`  
  
`create table assembly_attendees (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `owner_name text not null,`  
  `fraction_label text,`  
  `permillage numeric(10,4),`  
  `attendance_type attendee_type not null,`  
  `representative_name text,`  
  `validated_manually boolean not null default false,`  
  `notes text,`  
  `created_at timestamptz not null default now()`  
`);`  
  
`create table assembly_agenda_items (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `item_number integer not null,`  
  `title text not null,`  
  `description text,`  
  `source text not null default 'manual',`  
  `created_at timestamptz not null default now()`  
`);`  
  
`create table assembly_minutes_versions (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `version_number integer not null,`  
  `status minutes_version_status not null,`  
  `markdown_content text,`  
  `html_content text,`  
  `structured_json jsonb,`  
  `change_summary text,`  
  `validation_warnings jsonb,`  
  `missing_fields jsonb,`  
  `created_by uuid references auth.users(id),`  
  `created_at timestamptz not null default now(),`  
  `unique (assembly_id, version_number)`  
`);`  
  
`create table assembly_resolutions (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `agenda_item_id uuid references assembly_agenda_items(id) on delete set null,`  
  `resolution_title text not null,`  
  `resolution_text text not null,`  
  `vote_for_permillage numeric(10,4),`  
  `vote_against_permillage numeric(10,4),`  
  `vote_abstention_permillage numeric(10,4),`  
  `approved boolean not null default false,`  
  `financial_amount numeric(12,2),`  
  `due_date date,`  
  `vendor_name text,`  
  `requires_followup boolean not null default false,`  
  `raw_extraction_json jsonb,`  
  `created_at timestamptz not null default now()`  
`);`  
  
`create table assembly_action_items (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `resolution_id uuid references assembly_resolutions(id) on delete set null,`  
  `building_id uuid not null references buildings(id) on delete cascade,`  
  `title text not null,`  
  `description text,`  
  `assigned_to uuid,`  
  `due_date date,`  
  `priority text,`  
  `status text,`  
  `source text not null default 'approved_minutes',`  
  `created_at timestamptz not null default now()`  
`);`  
  
`create table assembly_dispatches (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `dispatch_type dispatch_type not null,`  
  `recipient_count integer default 0,`  
  `sent_by uuid references auth.users(id),`  
  `sent_at timestamptz,`  
  `status text,`  
  `metadata_json jsonb,`  
  `created_at timestamptz not null default now()`  
`);`  
  
`create table assembly_processing_queue (`  
  `id uuid primary key default gen_random_uuid(),`  
  `assembly_id uuid not null references assemblies(id) on delete cascade,`  
  `job_type processing_job_type not null,`  
  `status processing_status not null default 'pending',`  
  `attempt_count integer not null default 0,`  
  `max_attempts integer not null default 5,`  
  `last_error text,`  
  `next_retry_at timestamptz,`  
  `locked_at timestamptz,`  
  `payload_json jsonb,`  
  `created_at timestamptz not null default now(),`  
  `updated_at timestamptz not null default now()`  
`);`

Isto cobre o núcleo documental, o pipeline técnico, o versionamento e a fila persistente para jobs longos.

## **Índices e guard rails**

```
sql
```

`create index idx_assemblies_building_id on assemblies(building_id);`  
`create index idx_assemblies_status on assemblies(status);`  
  
`create index idx_audio_jobs_assembly_id on assembly_audio_jobs(assembly_id);`  
`create index idx_audio_jobs_status on assembly_audio_jobs(status);`  
`create index idx_audio_jobs_provider_job_id on assembly_audio_jobs(provider_job_id);`  
  
`create index idx_transcript_segments_assembly_id on assembly_transcript_segments(assembly_id);`  
`create index idx_transcript_segments_audio_job_id on assembly_transcript_segments(audio_job_id);`  
`create index idx_transcript_segments_start_ms on assembly_transcript_segments(audio_job_id, start_ms);`  
  
`create index idx_minutes_versions_assembly_id on assembly_minutes_versions(assembly_id, version_number desc);`  
`create index idx_resolutions_assembly_id on assembly_resolutions(assembly_id);`  
`create index idx_action_items_assembly_id on assembly_action_items(assembly_id);`  
`create index idx_queue_status_retry on assembly_processing_queue(status, next_retry_at);`

Estes índices ajudam especialmente em revisão de transcript, listagens por edifício e consumo de filas.

## **Edge Functions**

Aqui o ideal é pedir ao Lovable ficheiros/funções separados, cada um com input/output claros e sem juntar tudo numa mega-function.

## **1.** `create-assembly-audio-job`

Responsável por criar assembleia, validar building access, criar job e devolver o path de upload.  
Input:

```
json
```

`{`  
  `"building_id": "uuid",`  
  `"assembly_type": "ordinaria",`  
  `"meeting_date": "2026-05-02",`  
  `"location": "Sala do condomínio",`  
  `"file_name": "assembleia.mp3",`  
  `"mime_type": "audio/mpeg",`  
  `"file_size_bytes": 123456789`  
`}`

## **2.** `start-assembly-transcription`

Invocada após upload concluído; chama o provider STT, grava `provider_job_id` e atualiza estado do job.  
Tem de validar que o ficheiro existe no bucket privado antes de arrancar.

## **3.** `assembly-transcription-webhook`

Recebe callback do provider, valida assinatura, resolve idempotência e grava transcript segments.  
Se o provider não suportar bem o padrão desejado, podes complementar com polling controlado em queue/cron.

## **4.** `generate-assembly-structured-data`

Lê transcript + metadados + agenda + presenças e gera JSON estruturado com schema fixo.  
Este passo deve acontecer **antes** da redação da minuta, porque melhora controlabilidade e reduz alucinações.

## **5.** `generate-assembly-draft`

Recebe o JSON estruturado e gera:

- `markdown_content`
- `html_content`
- `validation_warnings`
- `missing_fields`.  
O modelo pode ser configurável, mas o output tem de ser validado no backend.

## **6.** `regenerate-assembly-draft`

Repete o passo anterior após alterações manuais em speakers, agenda, presenças ou preferências de redação.

## **7.** `approve-assembly-minutes`

Confirma checklist, cria versão final, gera deliberações e cria pendências derivadas.  
Esta função deve falhar se houver warnings críticos, por exemplo resolução financeira sem vencimento claro.

## **8.** `send-assembly-minutes`

Faz dispatch após aprovação e regista tudo em `assembly_dispatches`.

## **9.** `process-assembly-queue`

Worker de jobs longos, consumido por cron. Este ponto está muito alinhado com o padrão recomendado pela Supabase para workloads maiores e retries controlados.

## **Páginas e componentes**

Convém pedir ao Lovable as páginas por fases, porque a documentação sugere claridade e incrementalismo em Plan mode.

## **Páginas**

- `/atas` — lista por edifício, com estado documental e técnico.
- `/atas/nova` — wizard de criação.
- `/atas/:assemblyId/processamento` — progresso do job e retries.
- `/atas/:assemblyId/revisao` — transcript + player + minuta + warnings + checklist.
- `/atas/:assemblyId/detalhe` — versão aprovada, resoluções, ações e dispatch history.

## **Componentes**

- `AssemblyCreateWizard`
- `AudioUploadDropzone`
- `AssemblyProcessingStatus`
- `TranscriptTimeline`
- `SpeakerMappingPanel`
- `AgendaEditor`
- `AttendeesEditor`
- `MinutesDraftEditor`
- `ValidationWarningsPanel`
- `ApprovalChecklist`
- `MinutesVersionDiff`
- `ResolutionPreviewList`
- `DispatchHistoryPanel`.

## **UX crítica**

A revisão deve ter layout lado a lado: áudio/transcrição à esquerda, minuta à direita, e checklist/warnings bem visíveis. Isto mantém o fluxo humano de validação e evita aprovações “às cegas”.

## **Sequência de execução**

Esta seria a ordem ideal para pedires ao Lovable implementar, sem misturar tudo no mesmo passo:

1. Criar schema SQL e enums.
2. Criar bucket privado e policies base.
3. Criar `create-assembly-audio-job` e `start-assembly-transcription`.
4. Criar webhook + persistência de transcript segments.
5. Criar páginas `/atas` e `/atas/nova`.
6. Criar `/processamento` com estados reais.
7. Criar pipeline `generate-assembly-structured-data` + `generate-assembly-draft`.
8. Criar `/revisao` com transcript, speaker mapping e minuta.
9. Criar aprovação + resoluções + pendências.
10. Criar queue worker + cron + watchdog de stuck jobs.