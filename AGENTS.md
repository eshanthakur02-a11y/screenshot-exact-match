<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- UI never queries the database; all data access goes through server functions in `src/lib/data/*.functions.ts` — keeps backend swappable for a later move to an external Supabase project.
- AI provider calls live only in `src/lib/ai/*.server.ts`; output is validated with Zod schemas from `src/lib/task-schema.ts` before any write — provider can change without touching task logic.
- AI capture never writes; the user confirms a draft, then `createTask` saves and returns the real row — no false success.
- Keep `docs/MIGRATION.md` updated whenever schema, server functions, or external dependencies change.
- Multipart document/audio uploads use authenticated TanStack HTTP routes with bounded request bodies; ordinary reads and writes remain server functions so upload streaming does not bypass ownership checks.
- Document imports derive unique keys from owner-verified document IDs and candidate indices; database uniqueness makes retried confirmation safe.
- Reminders run through the managed authenticated HTTP scheduler and a bounded database processor with locking and an event ledger; no AI or page-view polling is involved.
- Weekly review metrics derive from recorded timestamps and explicitly distinguish current statuses from unavailable history; AI drafts never persist until confirmed.
- Load the full-viewport hero Spline runtime through a browser-enabled lazy component with an error boundary and bounded timeout on all screen sizes; use the black stage for loading/failure and pause the loaded scene for reduced motion so no decorative bitmap or overlay returns.
- Let Spline run authored Start/LookAt events without manual replay; keep the robot stage free of foreground HTML and place the site's existing navigation and lower sections after it so canvas input is unobstructed.
