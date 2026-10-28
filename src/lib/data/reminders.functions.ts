import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reminderPreferencesSchema } from "@/lib/task-schema";

export const saveReminderPreferences = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reminderPreferencesSchema.parse(i)).handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.from("profiles").update({ reminders_enabled: data.enabled, reminder_days_before: data.days_before }).eq("id", context.userId).select("reminders_enabled,reminder_days_before").single();
    if (error || !row) throw new Error("Reminder preferences could not be saved.");
    return row;
  });