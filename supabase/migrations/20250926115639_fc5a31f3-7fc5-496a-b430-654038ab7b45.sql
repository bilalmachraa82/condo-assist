-- Phase 1: Just migrate existing data using current enum values
-- Convert quotation_received to awaiting_quotation (1 record)
UPDATE public.assistances 
SET status = 'awaiting_quotation'
WHERE status = 'quotation_received';

-- Convert awaiting_validation to in_progress (2 records)  
UPDATE public.assistances
SET status = 'in_progress'
WHERE status = 'awaiting_validation';

-- Convert any other legacy states to appropriate new states
UPDATE public.assistances 
SET status = 'pending'
WHERE status = 'sent_to_suppliers';

UPDATE public.assistances
SET status = 'awaiting_quotation'
WHERE status = 'quotes_received';

UPDATE public.assistances
SET status = 'in_progress'
WHERE status IN ('quote_approved', 'quotation_approved', 'awaiting_approval', 'accepted', 'scheduled');