-- Fix foreign key constraints to allow CASCADE DELETE for assistances
-- This will allow deleting assistances and automatically clean up related records

-- First, drop the existing foreign key constraint
ALTER TABLE activity_log 
DROP CONSTRAINT IF EXISTS activity_log_assistance_id_fkey;

-- Add the foreign key constraint with CASCADE DELETE
ALTER TABLE activity_log 
ADD CONSTRAINT activity_log_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;

-- Also fix other related tables that might have the same issue

-- Check and fix assistance_photos table
ALTER TABLE assistance_photos 
DROP CONSTRAINT IF EXISTS assistance_photos_assistance_id_fkey;

ALTER TABLE assistance_photos 
ADD CONSTRAINT assistance_photos_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;

-- Check and fix assistance_progress table  
ALTER TABLE assistance_progress 
DROP CONSTRAINT IF EXISTS assistance_progress_assistance_id_fkey;

ALTER TABLE assistance_progress 
ADD CONSTRAINT assistance_progress_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;

-- Check and fix quotations table
ALTER TABLE quotations 
DROP CONSTRAINT IF EXISTS quotations_assistance_id_fkey;

ALTER TABLE quotations 
ADD CONSTRAINT quotations_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;

-- Check and fix supplier_responses table
ALTER TABLE supplier_responses 
DROP CONSTRAINT IF EXISTS supplier_responses_assistance_id_fkey;

ALTER TABLE supplier_responses 
ADD CONSTRAINT supplier_responses_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;

-- Check and fix supplier_magic_codes table
ALTER TABLE supplier_magic_codes 
DROP CONSTRAINT IF EXISTS supplier_magic_codes_assistance_id_fkey;

ALTER TABLE supplier_magic_codes 
ADD CONSTRAINT supplier_magic_codes_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;

-- Check and fix communications_log table
ALTER TABLE communications_log 
DROP CONSTRAINT IF EXISTS communications_log_assistance_id_fkey;

ALTER TABLE communications_log 
ADD CONSTRAINT communications_log_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;

-- Check and fix email_logs table
ALTER TABLE email_logs 
DROP CONSTRAINT IF EXISTS email_logs_assistance_id_fkey;

ALTER TABLE email_logs 
ADD CONSTRAINT email_logs_assistance_id_fkey 
FOREIGN KEY (assistance_id) 
REFERENCES assistances(id) 
ON DELETE CASCADE;