# AetherMind — Architecture & Migration Checklist

Status legend: **Implemented** (code exists) · **Tested** (verified in this environment) · **Deployed** (published — not yet).

## Current backend (verified)
- Database: Lovable Cloud Postgres (Supabase-compatible). Single instance for preview and published app.
- Auth: email/password (email confirmation ON). No social providers yet.
- Server logic: TanStack Start server functions (`src/lib/data/*.functions.ts`), run on the app's own server. No Supabase Edge Functions.
- AI: Lovable AI Gateway (`src/lib/ai/extract-task.server.ts`), model `openai/gpt-6-astra`, server-side key `LOVABLE_API_KEY`. No Google Gemini key is configured.
- Storage, Realtime, cron: not used yet.

## Layers
| Layer | Location | Notes |
|---|---|---|
| UI | `src/routes`, `src/components` | Never queries the DB directly |
| Data access | `src/lib/data/tasks.functions.ts` | Auth via `requireSupabaseAuth`; RLS runs as the user |
| Schemas | `src/lib/task-schema.ts` | Zod; shared by client + server |
| AI adapter | `src/lib/ai/extract-task.server.ts` | Only file that knows the AI provider |

## Server functions
| Function | Input | Output |
|---|---|---|
| `listTasks` | — | user's task rows |
| `getDashboard` | — | `{ tasks, displayName }` |
| `createTask` | `taskInputSchema` | saved task row |
| `updateTask` | `taskUpdateSchema` (`id` + partial fields) | saved task row |
| `deleteTask` | `{ id }` | `{ id }` (errors if 0 rows deleted) |
| `captureTask` | `{ text, today }` | `{ ok, draft }` or `{ ok:false, error }` — never writes |

## Schema (migration: `drizzle/migrations/0000_migration.sql`)
All ids `uuid default gen_random_uuid()`; all tables have `created_at`, `updated_at` (trigger `set_updated_at`).
- `profiles(id → auth.users, display_name, timezone)` — auto-created by trigger `on_auth_user_created`.
- `projects(user_id, name, description, status ∈ active|on_hold|completed|archived)`
- `goals(user_id, title, description, target_date, status ∈ active|achieved|abandoned)`
- `milestones(user_id, goal_id → goals ON DELETE CASCADE, title, due_date, completed_at)`
- `tasks(user_id, project_id → projects SET NULL, goal_id → goals SET NULL, title, description, priority ∈ low|medium|high|urgent, status ∈ todo|in_progress|done, due_date, estimated_minutes 1–10000, source ∈ manual|ai_capture, completed_at)`
- `weekly_reviews(user_id, week_start, summary, UNIQUE(user_id, week_start))`
- `notifications(user_id, title, body, read_at)`

Indexes: `(user_id, created_at desc)` on every user table; `tasks(user_id, status, due_date)`; `milestones(goal_id)`.
RLS: every table enabled; select/insert/update/delete only where `auth.uid() = user_id` (profiles: `= id`). Only `authenticated` and `service_role` have grants; `anon` has none.

## Lovable-specific dependencies (not directly portable)
| Dependency | Replacement plan |
|---|---|
| Lovable AI Gateway + `LOVABLE_API_KEY` | Rewrite `extract-task.server.ts` to call Gemini (Google AI / Vertex) with your own key stored as a server secret. Schema validation stays unchanged. |
| Generated files in `src/integrations/supabase/*` | Keep; point env vars (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_*`) at the new project. |
| Hosting of server functions | Server functions are part of the app, not Supabase. They move with the app; no Edge Function port is required. |
| Auth email sender | Configure SMTP/templates in your Supabase project. |

## Migration checklist
- [ ] Export schema: re-run the migration SQL file(s) on the new project, in order.
- [ ] Export data: `pg_dump --data-only` per public table (or CSV export); import preserving UUIDs and timestamps.
- [ ] Verify FKs/constraints after import (`tasks.project_id`, `milestones.goal_id`).
- [ ] Users: auth users are **not** migrated automatically. Password hashes can only move if you get a full `auth` schema dump; otherwise users must reset passwords. Sessions never transfer — everyone signs in again.
- [ ] Remap `user_id` if user UUIDs change (avoid by importing `auth.users` with same ids).
- [ ] Storage: none yet.
- [ ] RLS policies & grants: included in the migration SQL — verify with a second test user.
- [ ] Secrets: add your AI provider key; remove `LOVABLE_API_KEY` dependency.
- [ ] Scheduled jobs/triggers: triggers `set_updated_at`, `on_auth_user_created` (in migration). No cron jobs yet.
- [ ] Env vars: update `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- [ ] Verify: sign up, create/edit/delete task, refresh, check second user cannot see it.
- [ ] Rollback: keep the old project read-only until verification passes; revert env vars to roll back.

## Stage status
| Stage | Status |
|---|---|
| 1. Auth + profile | Implemented |
| 2. Dashboard (real data) | Implemented |
| 3. AI Task Capture | Implemented |
| 4. Task CRUD + filters | Implemented |
| 5–8. Projects, goals/milestones, weekly reviews, documents | Tables only; UI not built |
| n8n | Not started (by design) |
