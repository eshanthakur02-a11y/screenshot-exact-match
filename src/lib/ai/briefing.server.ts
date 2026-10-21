// AI daily briefing. Provider details stay in this folder.
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

const MODEL = "openai/gpt-6-astra";

export const briefingSchema = z.object({
  focus: z.string().min(1).max(300),
  top_task_ids: z.array(z.string()).max(3),
  plan: z.array(z.string().min(1).max(200)).max(6),
  warnings: z.array(z.string().min(1).max(200)).max(4),
});
export type Briefing = z.infer<typeof briefingSchema>;

export async function generateBriefing(input: { today: string; tasks: unknown[]; projects: unknown[] }): Promise<Briefing> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured on the server.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const instructions = `You are a calm personal chief of staff. Today is ${input.today}.
Using ONLY the JSON tasks and projects given, write a short daily briefing.
- focus: one sentence naming the main focus for today.
- top_task_ids: up to 3 ids from the tasks list, ordered by priority, then deadline proximity (overdue first), then estimated duration.
- plan: up to 5 short steps for the day, referencing real task titles.
- warnings: only real issues visible in the data (overdue tasks, many tasks due the same day, total estimated time over 8 hours today). Empty if none.
Never mention meetings, calendars or documents — none are provided. Never invent tasks.`;
  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions,
      prompt: JSON.stringify({ tasks: input.tasks, projects: input.projects }),
      output: Output.object({ schema: briefingSchema }),
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false, include: ["reasoning.encrypted_content"] } },
    });
    const parsed = briefingSchema.safeParse(await result.output);
    if (!parsed.success) throw new Error("The AI returned an unusable briefing.");
    return parsed.data;
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    console.error("generateBriefing failed", status, err);
    if (status === 402) throw new Error("AI credits are used up. Add credits to continue.");
    if (status === 429) throw new Error("AI is busy right now. Try again in a moment.");
    throw new Error(err instanceof Error && !status ? err.message : "Could not create your briefing.");
  }
}
