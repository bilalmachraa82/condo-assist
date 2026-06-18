# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Condo-assist ("Luvimg - Administração de Condomínios") is a Portuguese-language condominium management web app. It tracks building assistance/maintenance requests, suppliers, quotations, follow-ups, inspections, insurances, assemblies, and a knowledge base. Built on Vite + React + TypeScript + shadcn-ui + Tailwind, backed by Supabase (Postgres, Auth, Storage, Edge Functions). Also packaged as a mobile app via Capacitor. Originated as a Lovable project (changes pushed here sync with Lovable).

## Commands

```sh
npm run dev        # Vite dev server on http://localhost:8080
npm run build      # production build
npm run build:dev  # development-mode build
npm run lint       # eslint .
npm run preview    # preview production build
```

There is no test runner configured in this repo. Manual API smoke tests live in `scripts/`:

```sh
./scripts/test-api.sh <API_URL> <API_KEY>   # smoke-test the agent-api Edge Function
./scripts/check-email-dns.sh                # verify email/DNS setup
```

Package manager: both `bun.lock`/`bun.lockb` and `package-lock.json` are present; npm is the documented workflow.

## Architecture

### Frontend (`src/`)
- **Routing**: All routes are declared in `src/App.tsx`. Most pages are wrapped in `<ProtectedRoute>` + `<DashboardLayout>`. Public routes: `/auth`, `/supplier-portal`, `/unsubscribe`, `/mcp-diagnostics`. Routes and UI labels are in Portuguese (e.g. `/edificios` = buildings, `/fornecedores` = suppliers, `/orcamentos` = quotations).
- **Pages** (`src/pages/`) are thin; the real logic lives in feature components under `src/components/<feature>/` (e.g. `assistance`, `suppliers`, `quotations`, `assembly`, `inspections`, `insurances`, `knowledge`, `followups`, `pendencies`).
- **Data layer**: TanStack Query is the source of truth for server state. Each domain has a hook in `src/hooks/` (e.g. `useAssistances`, `useSuppliers`, `useQuotations`) that wraps Supabase calls. Global `QueryClient` config (retry policy, staleTime, mutation error toasts) is in `App.tsx`. Add new data access as a hook, not inline in components.
- **Supabase client**: `src/integrations/supabase/client.ts` (auto-generated, do not hand-edit). `src/integrations/supabase/types.ts` is the generated DB type definitions (~3800 lines) — regenerate from the schema rather than editing manually.
- **Auth**: `src/hooks/useAuth.tsx` provides `AuthProvider`; `ProtectedRoute` gates pages; `useIsAdmin` checks role.
- **UI**: shadcn-ui components in `src/components/ui/` (configured via `components.json`). Import alias `@/` → `src/` (see `vite.config.ts` / `tsconfig`). Use `lucide-react` icons, `sonner`/toaster for notifications.
- **Utilities** (`src/utils/`): cross-cutting helpers including `errorHandler.ts`/`showErrorToast`, `logger.ts` + `secureLogger.ts`, `inputSanitization.ts`, `validation.ts`, domain state machines (`assistanceStates.ts`), and `magicCodeGenerator.ts`/`sendMagicCode.ts` (supplier portal passwordless access codes).
- **Mobile**: Capacitor (`capacitor.config.ts`, app id `app.lovable...`). Native hooks (`useNativeCamera`, `useNativeGeolocation`, `useNativePushNotifications`, `useNativeStorage`) and `src/components/mobile/` gate native features. PWA/offline support via `usePWA`, `useOfflineStorage`.

### Backend (`supabase/`)
- **Edge Functions** (`supabase/functions/`, Deno + esm.sh imports) handle all server-side work: email sending (`send-email` and many `send-*` variants), cron jobs (`*-cron`, `process-followups`, `process-notifications`), file uploads with signed URLs (`upload-*`, `sign-assistance-photos`), PDF parsing (`parse-assembly-minutes`, `parse-pendency-pdf`), and supplier session validation (`validate-supplier-session`).
- **External integration surface**: `agent-api` is a REST API (see its `openapi.yaml`) authenticated via `x-api-key` (SHA-256 hashed keys, PII masking, UUID/input validation). `mcp-server` wraps `agent-api` as MCP tools over Streamable HTTP (`mcp-lite` + Hono) for Claude Desktop / agents. These two plus `send-email`, `send-assistance-pdf-to-admin`, and `email-unsubscribe` run with `verify_jwt = false` — see `supabase/config.toml`.
- **Migrations**: `supabase/migrations/` (~154 files). Add schema changes as new migration files; never edit applied ones.
- Per-function JWT settings and local ports are in `supabase/config.toml` (project id `zmpitnpmplemfozvtbam`).

## Conventions & Gotchas

- **Language**: User-facing strings, routes, and many identifiers are Portuguese. Keep new UI text consistent.
- **Generated files**: `src/integrations/supabase/client.ts` and `types.ts` are generated — regenerate, don't hand-edit.
- **Config**: `src/config/production.ts` centralizes security headers (CSP), rate limits, file-upload constraints, feature flags, and cache config. Check feature flags here before assuming a capability is live (e.g. `pushNotifications` is currently disabled).
- **Edge Function env vars**: functions read `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `EXTERNAL_API_KEY`, etc. from the Deno environment, not from `src/`.
- The Supabase anon (publishable) key is intentionally committed in `client.ts`/`production.ts`; service-role and other secrets must stay in the Supabase function environment / `.env` (gitignored where applicable).
