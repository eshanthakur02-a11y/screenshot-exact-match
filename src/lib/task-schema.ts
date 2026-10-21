import { z } from "zod";

// Client-safe schemas shared by UI and server. Server re-validates everything.
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const STATUSES = ["todo", "in_progress", "done"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

/** Shape the AI must return. Unknown values are null — never guessed. */
export const extractedTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable(),
    priority: z.enum(PRIORITIES).nullable(),
    status: z.enum(STATUSES).nullable(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "due_date must be YYYY-MM-DD")
      .nullable(),
    estimated_minutes: z.number().int().min(1).max(10000).nullable(),
    needs_clarification: z.boolean(),
    clarification_question: z.string().max(500).nullable(),
  })
  .strict();

export type ExtractedTask = z.infer<typeof extractedTaskSchema>;

/** Input for saving a task (manual or confirmed AI draft). */
export const taskInputSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().max(2000).nullable().optional(),
    priority: z.enum(PRIORITIES).default("medium"),
    status: z.enum(STATUSES).default("todo"),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    estimated_minutes: z.number().int().min(1).max(10000).nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
    source: z.enum(["manual", "ai_capture"]).default("manual"),
  })
  .strict();

export type TaskInput = z.input<typeof taskInputSchema>;

export const taskUpdateSchema = taskInputSchema
  .omit({ source: true })
  .partial()
  .extend({ id: z.string().uuid() })
  .strict();
