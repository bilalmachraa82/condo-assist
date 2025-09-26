-- Create new simplified enum types with different names
CREATE TYPE new_assistance_status AS ENUM (
  'pending',
  'awaiting_quotation', 
  'quotation_rejected',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE new_assistance_priority AS ENUM (
  'normal',
  'urgent', 
  'critical'
);

-- Add new temporary columns with new enum types
ALTER TABLE public.assistances ADD COLUMN new_status new_assistance_status;
ALTER TABLE public.assistances ADD COLUMN new_priority new_assistance_priority;

-- Update new columns with converted values
UPDATE public.assistances SET new_status = 'pending'::new_assistance_status WHERE status::text = 'pending';
UPDATE public.assistances SET new_status = 'awaiting_quotation'::new_assistance_status WHERE status::text = 'awaiting_quotation'; 
UPDATE public.assistances SET new_status = 'quotation_rejected'::new_assistance_status WHERE status::text = 'quotation_rejected';
UPDATE public.assistances SET new_status = 'in_progress'::new_assistance_status WHERE status::text = 'in_progress';
UPDATE public.assistances SET new_status = 'completed'::new_assistance_status WHERE status::text = 'completed';
UPDATE public.assistances SET new_status = 'cancelled'::new_assistance_status WHERE status::text = 'cancelled';

UPDATE public.assistances SET new_priority = 'normal'::new_assistance_priority WHERE priority::text = 'normal';
UPDATE public.assistances SET new_priority = 'urgent'::new_assistance_priority WHERE priority::text = 'urgent'; 
UPDATE public.assistances SET new_priority = 'critical'::new_assistance_priority WHERE priority::text = 'critical';

-- Set default values for new columns
ALTER TABLE public.assistances ALTER COLUMN new_status SET DEFAULT 'pending'::new_assistance_status;
ALTER TABLE public.assistances ALTER COLUMN new_priority SET DEFAULT 'normal'::new_assistance_priority;

-- Make new columns not null
ALTER TABLE public.assistances ALTER COLUMN new_status SET NOT NULL;
ALTER TABLE public.assistances ALTER COLUMN new_priority SET NOT NULL;

-- Do the same for follow_up_schedules
ALTER TABLE public.follow_up_schedules ADD COLUMN new_priority new_assistance_priority;
UPDATE public.follow_up_schedules SET new_priority = 'normal'::new_assistance_priority WHERE priority::text = 'normal';
UPDATE public.follow_up_schedules SET new_priority = 'urgent'::new_assistance_priority WHERE priority::text = 'urgent';
UPDATE public.follow_up_schedules SET new_priority = 'critical'::new_assistance_priority WHERE priority::text = 'critical';
ALTER TABLE public.follow_up_schedules ALTER COLUMN new_priority SET DEFAULT 'normal'::new_assistance_priority;
ALTER TABLE public.follow_up_schedules ALTER COLUMN new_priority SET NOT NULL;

-- Do the same for intervention_types
ALTER TABLE public.intervention_types ADD COLUMN new_urgency_level new_assistance_priority;
UPDATE public.intervention_types SET new_urgency_level = 'normal'::new_assistance_priority WHERE urgency_level::text = 'normal';
UPDATE public.intervention_types SET new_urgency_level = 'urgent'::new_assistance_priority WHERE urgency_level::text = 'urgent';
UPDATE public.intervention_types SET new_urgency_level = 'critical'::new_assistance_priority WHERE urgency_level::text = 'critical';
ALTER TABLE public.intervention_types ALTER COLUMN new_urgency_level SET DEFAULT 'normal'::new_assistance_priority;
ALTER TABLE public.intervention_types ALTER COLUMN new_urgency_level SET NOT NULL;