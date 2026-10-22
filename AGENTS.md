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
- Load the hero Spline runtime through a browser-enabled lazy component with an error boundary and bounded loading timeout; use the existing bitmap for mobile and reduced motion so SSR and essential controls never depend on WebGL.
- Keep illustrative hero previews pointer-transparent except real links, and let Spline run authored Start/LookAt events continuously; no repeated manual animation triggers, because foreground hit-testing must not block cursor-following motion.
