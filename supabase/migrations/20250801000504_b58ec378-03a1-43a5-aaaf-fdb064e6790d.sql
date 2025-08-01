-- Enable password strength requirements and leaked password protection
UPDATE auth.config SET 
  password_min_length = 8,
  password_require_letters = true,
  password_require_numbers = true,
  password_require_uppercase = true,
  password_require_lowercase = true,
  password_require_symbols = false,
  password_require_special_characters = false,
  security_update_password_require_reauthentication = true,
  security_manual_linking_enabled = false,
  security_captcha_enabled = false
WHERE TRUE;

-- Enable leaked password protection (if available in your Supabase version)
-- This will need to be configured in the Supabase dashboard under Authentication > Settings