import { z } from "zod";

// Client-safe schemas shared by UI and server. Server re-validates everything.
export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const STATUSES = ["todo", "in_progress", "done"] as const;

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Enter a valid calendar date");

/** Shape the AI must return. Unknown values are null — never guessed. */
export const extractedTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable(),
    priority: z.enum(PRIORITIES).nullable(),
    status: z.enum(STATUSES).nullable(),
    due_date: calendarDateSchema.nullable(),
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
    due_date: calendarDateSchema.nullable().optional(),
    estimated_minutes: z.number().int().min(1).max(10000).nullable().optional(),
    project_id: z.string().uuid().nullable().optional(),
    goal_id: z.string().uuid().nullable().optional(),
    document_import: z
      .object({ document_id: z.string().uuid(), index: z.number().int().min(0).max(29) })
      .strict()
      .optional(),
    source: z.enum(["manual", "ai_capture"]).default("manual"),
  })
  .strict();

export type TaskInput = z.input<typeof taskInputSchema>;

export const taskUpdateSchema = taskInputSchema
  .omit({ source: true, document_import: true })
  .partial()
  .extend({ id: z.string().uuid() })
  .strict();

export const weeklyInsightSchema = z
  .object({
    accomplishments: z.array(z.string().min(1).max(1000)).max(12),
    blockers: z.array(z.string().min(1).max(1000)).max(12),
    goal_progress: z.array(z.string().min(1).max(1000)).max(12),
    patterns: z.array(z.string().min(1).max(1000)).max(12),
    next_priorities: z.array(z.string().min(1).max(1000)).length(3),
    follow_up: z.array(z.string().min(1).max(1000)).max(12),
  })
  .strict();
export type WeeklyInsight = z.infer<typeof weeklyInsightSchema>;

export const documentCandidateSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).nullable(),
    responsible_person: z.string().max(200).nullable(),
    due_date: calendarDateSchema.nullable(),
    priority: z.enum(PRIORITIES).nullable(),
    project_id: z.string().uuid().nullable(),
    goal_id: z.string().uuid().nullable(),
    evidence: z.string().trim().min(1).max(1500),
    uncertainties: z.array(z.string().max(500)).max(8),
  })
  .strict();
export const documentExtractionSchema = z
  .object({ items: z.array(documentCandidateSchema).max(30) })
  .strict();
export type DocumentCandidate = z.infer<typeof documentCandidateSchema>;

export const reminderPreferencesSchema = z
  .object({ enabled: z.boolean(), days_before: z.number().int().min(0).max(7) })
  .strict();
