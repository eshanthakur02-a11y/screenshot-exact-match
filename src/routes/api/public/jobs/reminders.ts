import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/reminders")({ server: { handlers: { POST: async ({ request }) => {
  const authFailure = await authenticateCronRequest(request);
  if (authFailure) return authFailure;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("process_task_reminders");
  if (error) { console.error("Reminder processing failed", error.code); return Response.json({ error: "Reminder processing failed" }, { status: 500 }); }
  return Response.json({ processed: data });
} } } });