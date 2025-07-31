-- Revert workflow intelligence tables and columns
DROP TABLE IF EXISTS public.workflow_rules CASCADE;
DROP TABLE IF EXISTS public.workflow_states CASCADE;

-- Remove workflow columns from assistances table
ALTER TABLE public.assistances 
DROP COLUMN IF EXISTS escalation_level,
DROP COLUMN IF EXISTS sla_deadline,
DROP COLUMN IF EXISTS workflow_stage;