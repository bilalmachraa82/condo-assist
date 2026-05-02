
-- =========================================================
-- FASE 1 — Minutas de Ata a partir de áudio
-- Enums + Tabelas + RLS + Storage + Índices
-- =========================================================

-- ---------- ENUMS ----------
CREATE TYPE public.assembly_type_enum AS ENUM ('ordinaria', 'extraordinaria');
CREATE TYPE public.assembly_call_type_enum AS ENUM ('primeira_convocatoria', 'segunda_convocatoria');
CREATE TYPE public.assembly_status_enum AS ENUM ('draft', 'processing_audio', 'awaiting_review', 'approved', 'archived', 'failed');
CREATE TYPE public.audio_job_status_enum AS ENUM ('uploading', 'queued', 'processing', 'transcribed', 'draft_generating', 'draft_ready', 'failed');
CREATE TYPE public.attendee_type_enum AS ENUM ('present', 'represented', 'absent');
CREATE TYPE public.minutes_version_status_enum AS ENUM ('ai_draft', 'reviewed_draft', 'approved_final');
CREATE TYPE public.dispatch_type_enum AS ENUM ('email', 'download', 'portal');
CREATE TYPE public.processing_job_type_enum AS ENUM ('transcription_start', 'draft_generation', 'draft_regeneration', 'post_approval_sync', 'dispatch');
CREATE TYPE public.processing_status_enum AS ENUM ('pending', 'running', 'retrying', 'done', 'failed');

-- ---------- ASSEMBLIES ----------
CREATE TABLE public.assemblies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  assembly_type public.assembly_type_enum NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  call_type public.assembly_call_type_enum,
  chairperson_name TEXT,
  secretary_name TEXT,
  status public.assembly_status_enum NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage assemblies"
  ON public.assemblies FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_assemblies_updated_at
  BEFORE UPDATE ON public.assemblies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- ASSEMBLY_AUDIO_JOBS ----------
CREATE TABLE public.assembly_audio_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'assemblyai',
  provider_job_id TEXT,
  audio_storage_path TEXT NOT NULL,
  audio_duration_seconds INTEGER,
  audio_size_bytes BIGINT,
  mime_type TEXT,
  status public.audio_job_status_enum NOT NULL DEFAULT 'uploading',
  error_code TEXT,
  error_message TEXT,
  cost_cents_estimated INTEGER,
  cost_cents_actual INTEGER,
  webhook_received_at TIMESTAMPTZ,
  raw_provider_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_job_id)
);

ALTER TABLE public.assembly_audio_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audio jobs"
  ON public.assembly_audio_jobs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage audio jobs"
  ON public.assembly_audio_jobs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_audio_jobs_updated_at
  BEFORE UPDATE ON public.assembly_audio_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- TRANSCRIPT SEGMENTS ----------
CREATE TABLE public.assembly_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  audio_job_id UUID NOT NULL REFERENCES public.assembly_audio_jobs(id) ON DELETE CASCADE,
  speaker_label TEXT,
  speaker_name TEXT,
  speaker_role TEXT,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  text TEXT NOT NULL,
  confidence NUMERIC(5,4),
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_transcript_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage transcript segments"
  ON public.assembly_transcript_segments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- ATTENDEES ----------
CREATE TABLE public.assembly_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  fraction_label TEXT,
  permillage NUMERIC(10,4),
  attendance_type public.attendee_type_enum NOT NULL,
  representative_name TEXT,
  validated_manually BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage attendees"
  ON public.assembly_attendees FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- AGENDA ITEMS ----------
CREATE TABLE public.assembly_agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agenda items"
  ON public.assembly_agenda_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- MINUTES VERSIONS ----------
CREATE TABLE public.assembly_minutes_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status public.minutes_version_status_enum NOT NULL,
  markdown_content TEXT,
  html_content TEXT,
  structured_json JSONB,
  change_summary TEXT,
  validation_warnings JSONB,
  missing_fields JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assembly_id, version_number)
);

ALTER TABLE public.assembly_minutes_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage minutes versions"
  ON public.assembly_minutes_versions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- RESOLUTIONS ----------
CREATE TABLE public.assembly_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES public.assembly_agenda_items(id) ON DELETE SET NULL,
  resolution_title TEXT NOT NULL,
  resolution_text TEXT NOT NULL,
  vote_for_permillage NUMERIC(10,4),
  vote_against_permillage NUMERIC(10,4),
  vote_abstention_permillage NUMERIC(10,4),
  approved BOOLEAN NOT NULL DEFAULT false,
  financial_amount NUMERIC(12,2),
  due_date DATE,
  vendor_name TEXT,
  requires_followup BOOLEAN NOT NULL DEFAULT false,
  raw_extraction_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage resolutions"
  ON public.assembly_resolutions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- ACTION ITEMS ----------
CREATE TABLE public.assembly_action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  resolution_id UUID REFERENCES public.assembly_resolutions(id) ON DELETE SET NULL,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID,
  due_date DATE,
  priority TEXT,
  status TEXT DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'approved_minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage action items"
  ON public.assembly_action_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- DISPATCHES ----------
CREATE TABLE public.assembly_dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  dispatch_type public.dispatch_type_enum NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  sent_by UUID,
  sent_at TIMESTAMPTZ,
  status TEXT,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view dispatches"
  ON public.assembly_dispatches FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins manage dispatches"
  ON public.assembly_dispatches FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ---------- PROCESSING QUEUE ----------
CREATE TABLE public.assembly_processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id UUID NOT NULL REFERENCES public.assemblies(id) ON DELETE CASCADE,
  job_type public.processing_job_type_enum NOT NULL,
  status public.processing_status_enum NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assembly_processing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage processing queue"
  ON public.assembly_processing_queue FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_processing_queue_updated_at
  BEFORE UPDATE ON public.assembly_processing_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- INDEXES ----------
CREATE INDEX idx_assemblies_building_id ON public.assemblies(building_id);
CREATE INDEX idx_assemblies_status ON public.assemblies(status);
CREATE INDEX idx_assemblies_meeting_date ON public.assemblies(meeting_date DESC);

CREATE INDEX idx_audio_jobs_assembly_id ON public.assembly_audio_jobs(assembly_id);
CREATE INDEX idx_audio_jobs_status ON public.assembly_audio_jobs(status);
CREATE INDEX idx_audio_jobs_provider_job_id ON public.assembly_audio_jobs(provider_job_id);

CREATE INDEX idx_transcript_segments_assembly_id ON public.assembly_transcript_segments(assembly_id);
CREATE INDEX idx_transcript_segments_audio_job ON public.assembly_transcript_segments(audio_job_id, start_ms);

CREATE INDEX idx_attendees_assembly_id ON public.assembly_attendees(assembly_id);
CREATE INDEX idx_agenda_items_assembly_id ON public.assembly_agenda_items(assembly_id, item_number);
CREATE INDEX idx_minutes_versions_assembly_id ON public.assembly_minutes_versions(assembly_id, version_number DESC);
CREATE INDEX idx_resolutions_assembly_id ON public.assembly_resolutions(assembly_id);
CREATE INDEX idx_action_items_assembly_id ON public.assembly_action_items(assembly_id);
CREATE INDEX idx_action_items_building_id ON public.assembly_action_items(building_id);
CREATE INDEX idx_dispatches_assembly_id ON public.assembly_dispatches(assembly_id);
CREATE INDEX idx_queue_status_retry ON public.assembly_processing_queue(status, next_retry_at);
CREATE INDEX idx_queue_assembly_id ON public.assembly_processing_queue(assembly_id);

-- ---------- STORAGE BUCKET ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assembly-audio',
  'assembly-audio',
  false,
  524288000, -- 500 MB
  ARRAY['audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/x-m4a','audio/wav','audio/x-wav','audio/wave','audio/ogg','audio/opus','audio/webm']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read assembly audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assembly-audio' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins upload assembly audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assembly-audio' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update assembly audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assembly-audio' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete assembly audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assembly-audio' AND public.is_admin(auth.uid()));
