// AI provider adapter. Only this file knows which AI provider is used, so it
// can be swapped (e.g. for a direct Google Gemini key) without touching task logic.
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { extractedTaskSchema, type ExtractedTask } from "@/lib/task-schema";

const MODEL = "openai/gpt-6-astra";
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export class AiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function extractTask(text: string, today: string): Promise<ExtractedTask> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError("AI is not configured on the server.", 401);

  const provider = createOpenAI({
    baseURL: GATEWAY,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });

  const instructions = `You extract ONE task from the user's message for a personal productivity app.
Today is ${today} (YYYY-MM-DD). Resolve relative dates like "Friday" or "tomorrow" against today; the next occurrence of a weekday is the upcoming one.
Rules:
- Never invent information. If something is not stated, use null.
- due_date: YYYY-MM-DD only if the user stated or clearly implied a date; else null.
- estimated_minutes: convert durations to minutes only if stated; else null.
- priority: map words like "urgent", "high priority", "low priority"; else null.
- status: only if stated (e.g. "already started" -> in_progress); else null.
- description: short extra context the user gave, else null.
- needs_clarification: true only when ambiguity matters (e.g. no clear action, or a date that could mean two things). Then ask one short clarification_question; otherwise null.`;

  try {
    const result = streamText({
      model: provider.responses(MODEL),
      instructions,
      prompt: text,
      output: Output.object({ schema: extractedTaskSchema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const raw = await result.output;
    // Re-validate independently of the SDK so invalid output can never be saved.
    const parsed = extractedTaskSchema.safeParse(raw);
    if (!parsed.success) throw new AiError("The AI returned an invalid task. Please rephrase.", 422);
    return parsed.data;
  } catch (err) {
    if (err instanceof AiError) throw err;
    const status = (err as { statusCode?: number })?.statusCode ?? 500;
    console.error("extractTask failed", status, err);
    if (status === 402) throw new AiError("AI credits are used up. Add credits to continue.", 402);
    if (status === 429) throw new AiError("AI is busy right now. Try again in a moment.", 429);
    if (status === 403) throw new AiError("AI access is blocked for this workspace.", 403);
    throw new AiError("Could not read that task. Please try again.", status);
  }
}
