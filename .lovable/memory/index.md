# Project Memory

## Core
Display buildings as 'Code - Name' globally (e.g., 'GAL - Cond. Rua Alexandre Herculano').
Assistance status 'Agendado' is derived from `scheduled_start_date` presence; never stored directly.
Primary contact/system email is `geral@luvimg.com` (never use older alternatives).
Use `upload-supplier-file` edge function for supplier file uploads; never use direct client storage access.

## Memories
- [Assistance Status Logic](mem://architecture/assistance-status-logic) — 'Agendado' status is a derived state based on scheduled_start_date
- [Automated Notifications Cron](mem://features/automated-notifications-cron) — Supabase edge functions and pg_cron for notification pipelines
- [Real-time Search](mem://features/search-and-highlighting) — Search functionality, HighlightText component, and searchable fields
- [Magic Code Rate Limiting](mem://security/magic-code-rate-limiting) — Rate limiting rules for supplier portal magic codes
- [Building Display Standard](mem://style/building-info-display-standard) — Format buildings as 'Code - Name' globally
- [Secure Supplier Uploads](mem://security/secure-supplier-uploads) — Use upload-supplier-file edge function for validation, not direct storage
- [PDF Preview & Customization](mem://features/pdf-preview-and-customization) — Admin workflow for reviewing and customizing assistance PDFs
- [Database RLS Policies](mem://security/database-access-control-and-rls) — Granular RLS for profiles, suppliers, and buildings
- [Admin First Email Workflow](mem://features/admin-first-email-workflow) — Premium PDFs sent to administration for manual review based on email_mode
- [Official Contact Email](mem://style/official-contact-email) — Primary project email is geral@luvimg.com
- [Resend Email Configuration](mem://technical/resend-email-configuration) — Domain luvimg.com verification and 'from' address constraints
- [Premium PDF Design Standard](mem://style/premium-pdf-design-standard) — Layout, font sizes, and layout constraints for assistance PDFs
- [Form Data Persistence](mem://features/form-data-persistence) — Assistance form localStorage draft saving and restoration
- [External API Access](mem://features/external-api-access) — agent-api edge function with 14 REST endpoints, dual auth, rate limiting
- [Knowledge Base](mem://features/knowledge-base) — Knowledge articles CRUD, 14 categories, /knowledge page, 4 API endpoints in agent-api
