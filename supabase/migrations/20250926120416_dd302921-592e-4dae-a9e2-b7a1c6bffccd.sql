-- Remove old columns and rename new ones
ALTER TABLE public.assistances DROP COLUMN status;
ALTER TABLE public.assistances DROP COLUMN priority;
ALTER TABLE public.assistances RENAME COLUMN new_status TO status;
ALTER TABLE public.assistances RENAME COLUMN new_priority TO priority;

ALTER TABLE public.follow_up_schedules DROP COLUMN priority;
ALTER TABLE public.follow_up_schedules RENAME COLUMN new_priority TO priority;

ALTER TABLE public.intervention_types DROP COLUMN urgency_level;
ALTER TABLE public.intervention_types RENAME COLUMN new_urgency_level TO urgency_level;

-- Drop old enum types with CASCADE to remove dependent functions
DROP TYPE assistance_status CASCADE;
DROP TYPE assistance_priority CASCADE;

-- Rename new enum types to original names
ALTER TYPE new_assistance_status RENAME TO assistance_status;
ALTER TYPE new_assistance_priority RENAME TO assistance_priority;