import { describe, expect, it } from "vitest";
import { extractedTaskSchema, taskInputSchema } from "./task-schema";

const valid = {
  title: "Complete Generative AI assignment",
  description: null,
  priority: "high",
  status: null,
  due_date: "2026-10-23",
  estimated_minutes: 180,
  needs_clarification: false,
  clarification_question: null,
};

describe("AI task output validation", () => {
  it("accepts a well-formed extraction", () => {
    expect(extractedTaskSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects an unknown priority", () => {
    expect(extractedTaskSchema.safeParse({ ...valid, priority: "critical" }).success).toBe(false);
  });
  it("rejects a non-ISO date", () => {
    expect(extractedTaskSchema.safeParse({ ...valid, due_date: "Friday" }).success).toBe(false);
  });
  it("rejects an impossible calendar date", () => {
    expect(extractedTaskSchema.safeParse({ ...valid, due_date: "2026-02-30" }).success).toBe(false);
  });
  it("rejects extra fields", () => {
    expect(extractedTaskSchema.safeParse({ ...valid, user_id: "x" }).success).toBe(false);
  });
  it("rejects an empty title", () => {
    expect(extractedTaskSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
  });
});

describe("task save input", () => {
  it("defaults priority to medium and status to todo", () => {
    const r = taskInputSchema.parse({ title: "x" });
    expect(r.priority).toBe("medium");
    expect(r.status).toBe("todo");
  });
  it("does not accept a user_id from the client", () => {
    expect(taskInputSchema.safeParse({ title: "x", user_id: "someone" }).success).toBe(false);
  });
});
