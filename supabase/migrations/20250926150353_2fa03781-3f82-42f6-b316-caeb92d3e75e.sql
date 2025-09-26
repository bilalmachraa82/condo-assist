-- Add missing assistance status values that are used in the application
ALTER TYPE assistance_status ADD VALUE 'accepted';
ALTER TYPE assistance_status ADD VALUE 'scheduled';