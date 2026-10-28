# AetherMind — Architecture & Migration Checklist

Status legend: **Implemented** (code exists) · **Tested** (verified in this environment) · **Deployed** (published — not yet).

## Current backend (verified)
- Database: Lovable Cloud Postgres (Supabase-compatible). Single instance for preview and published app.
- Auth: email/password (email confirmation ON). No social providers yet.
- Server logic: TanStack Start server functions (`src/lib/data/*.functions.ts`), run on the app's own server. No Supabase Edge Functions.
- AI: Lovable AI Gateway (`src/lib/ai/extract-task.server.ts`), model `openai/gpt-6-astra`, server-side key `LOVABLE_API_KEY`. No Google Gemini key is configured.
- Storage: private `source-documents` bucket (10 MB); notifications use Realtime; managed hourly HTTP reminders enabled.

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
| 5–8. Projects, goals/milestones, weekly reviews, documents | Implemented; verified against real records |
| n8n | Not started (by design) |

## Workspace server functions (src/lib/data/workspace.functions.ts)
getShell, updateProfile; listProjects/createProject/updateProject/deleteProject (progress = done/total tasks, 0% when empty);
listGoals/createGoal/updateGoal/deleteGoal, addMilestone/setMilestoneDone/deleteMilestone (progress = done/total milestones, achieved = 100%);
listNotifications/markNotifications/deleteNotification; getWeeklyReview/saveWeeklyReview (upsert per user+week);
createBriefing — AI daily briefing via src/lib/ai/briefing.server.ts, not persisted. No schema changes.

## Hero 3D dependency
- `@splinetool/react-spline` and `@splinetool/runtime` render the user's scene at `https://prod.spline.design/38OnHj7aK4PmVYp8/scene.splinecode` in `src/components/hero-spline.tsx`.
- Browser-only lazy rendering on every screen size in a full-viewport black stage; loading/failure leaves a black background with no overlays. Reduced motion pauses the loaded original scene. No data access or schema changes.
- When migrating hosting, keep the scene URL reachable or change the component's scene URL to a hosted export of the supplied `scene.splinecode`; do not embed the binary in the repository.
- Runtime updated to `2.0.100` (newest version eligible under the package release-age policy during this fix). The exported scene has Start transitions and cursor-target LookAt events; render continuously with no foreground hero HTML. No manual replay or invented looping animation is added.

## October feature completion
- Schema: `0001_review_documents_reminder_foundation.sql` adds reminder preferences, document text/metadata/candidates, unique task import keys, notification links and reminder event ledger. `0002_prevent_reminder_batch_starvation.sql` excludes processed events before the 500-item batch and locks tasks while issuing notifications. Existing data is preserved.
- Private uploads: `source-documents`, owner UUID folder policies, 10 MB per file; TXT/Markdown/PDF up to 80,000 extracted characters and 100 PDF pages. `unpdf` performs bundled text extraction; scanned/image-only PDFs need OCR elsewhere and return a clear error. Failed or redundant uploads remove their newly created storage object.
- Server functions: `review.functions.ts` supplies period metrics, AI draft and history; `documents.functions.ts` stores/reopens/analyzes sources; `reminders.functions.ts` saves preferences. `createTask` uses owner-checked `task-write.server.ts` and database uniqueness for retried document imports.
- Authenticated HTTP routes: `/api/documents` (multipart private source upload), `/api/transcribe` (audio transcription SSE). Ordinary data operations stay in server functions; UI only reads auth session for bearer attachment.
- AI: streamed structured weekly reviews/document candidates through existing `openai/gpt-6-astra`; source evidence and enum/date validity checked before writes. Speech uses `openai/gpt-transcribe`; complete PCM WAV recording or audio uploads, 10 MB limit and 60-second microphone sessions. Dependencies added: `unpdf`, `eventsource-parser`. Microphone permission is required; uploaded speech was tested end to end.
- Reminders: managed schedule `aethermind-task-reminders`, hourly at minute zero, calls `/api/public/jobs/reminders` with `{}`. Generated managed credential verification precedes privileged RPC. No email/push provider or AI background calls. At most one upcoming and one overdue event per task/deadline, timezone-aware, no repeats for unchanged overdue tasks; completion/rescheduling clears stale displayed notifications and deletion cascades. The hourly schedule runs 24 times/day, up to about an hour plus 30 seconds after eligibility; recurring checks can keep Cloud active. Published delivery requires publishing the app; preview processor was verified directly.
- Required server configuration (platform-managed): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for secured reminder RPC, `LOVABLE_API_KEY` for existing AI/transcription, `LOVABLE_CRON_SECRET` with optional rotating `LOVABLE_CRON_SECRET_PREVIOUS`. No secrets added to browser config; no optional email/push credentials configured.
- Verification: actual AI document extraction, edited/selected confirmed task import, duplicate reimport, text PDF upload, unreadable PDF error, AI weekly review generation/edit/save/reopen, real spoken upload/transcript/task save, overdue processor/retry/auth rejection/completion cleanup, and existing workspace page navigation passed. Mobile documents have no horizontal overflow. Controlled QA records removed after verification.
- Limitations: no task status audit history; historical outstanding counts are explicitly current-state approximations. No OCR, external notification delivery, or deployed verification. Existing repository-wide lint formatting debt is reported separately; changed feature code is checked independently.
