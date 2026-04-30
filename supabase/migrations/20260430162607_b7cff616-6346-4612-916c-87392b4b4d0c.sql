-- Pendency reminders table
CREATE TABLE IF NOT EXISTS public.pendency_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pendency_id uuid NOT NULL REFERENCES public.email_pendencies(id) ON DELETE CASCADE,
  reminder_type text NOT NULL DEFAULT 'manual', -- 'manual' | 'sla_auto'
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'cancelled' | 'failed'
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  sent_at timestamptz,
  note text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pendency_reminders_due
  ON public.pendency_reminders (status, scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pendency_reminders_pendency
  ON public.pendency_reminders (pendency_id);

ALTER TABLE public.pendency_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pendency reminders"
  ON public.pendency_reminders FOR ALL TO authenticated
  USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE TRIGGER trg_pendency_reminders_updated
  BEFORE UPDATE ON public.pendency_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-cancel pending reminders when pendency is resolved/cancelled
CREATE OR REPLACE FUNCTION public.cancel_pendency_reminders_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolvido', 'cancelado') AND OLD.status <> NEW.status THEN
    UPDATE public.pendency_reminders
       SET status = 'cancelled',
           metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('cancel_reason', 'pendency_' || NEW.status::text)
     WHERE pendency_id = NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_pendency_reminders ON public.email_pendencies;
CREATE TRIGGER trg_cancel_pendency_reminders
  AFTER UPDATE ON public.email_pendencies
  FOR EACH ROW EXECUTE FUNCTION public.cancel_pendency_reminders_on_close();

-- Auto-create SLA reminders when pendency moves to 'aguarda_resposta'
-- 3-day, 7-day, 14-day escalation cadence (only if no pending sla_auto exists)
CREATE OR REPLACE FUNCTION public.schedule_pendency_sla_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_ts timestamptz;
  has_pending boolean;
BEGIN
  IF NEW.status = 'aguarda_resposta'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN

    SELECT EXISTS (
      SELECT 1 FROM public.pendency_reminders
       WHERE pendency_id = NEW.id
         AND reminder_type = 'sla_auto'
         AND status = 'pending'
    ) INTO has_pending;

    IF NOT has_pending THEN
      base_ts := COALESCE(NEW.email_sent_at, NEW.last_activity_at, now());
      INSERT INTO public.pendency_reminders (pendency_id, reminder_type, scheduled_for, max_attempts, note, metadata)
      VALUES
        (NEW.id, 'sla_auto', base_ts + interval '3 days', 3, 'SLA: sem resposta há 3 dias', jsonb_build_object('sla_step', 1)),
        (NEW.id, 'sla_auto', base_ts + interval '7 days', 3, 'SLA: sem resposta há 7 dias (rever)', jsonb_build_object('sla_step', 2)),
        (NEW.id, 'sla_auto', base_ts + interval '14 days', 3, 'SLA: sem resposta há 14 dias (escalar)', jsonb_build_object('sla_step', 3));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_schedule_pendency_sla ON public.email_pendencies;
CREATE TRIGGER trg_schedule_pendency_sla
  AFTER INSERT OR UPDATE OF status ON public.email_pendencies
  FOR EACH ROW EXECUTE FUNCTION public.schedule_pendency_sla_reminders();