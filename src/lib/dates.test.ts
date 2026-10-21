import { describe, expect, it } from "vitest";
import { activitySeries, taskMetrics, weekStart } from "./dates";

const t = (o: Partial<{ status: string; due_date: string | null; completed_at: string | null; created_at: string }>) => ({
  status: "todo", due_date: null, completed_at: null, created_at: "2026-10-01T10:00:00Z", ...o,
});

describe("dashboard metrics", () => {
  const today = "2026-10-22";
  it("counts due today only for open tasks due on today's date", () => {
    const m = taskMetrics([t({ due_date: "2026-10-22T12:00:00Z" }), t({ status: "done", due_date: "2026-10-22T12:00:00Z" })], today, "UTC");
    expect(m.dueToday).toBe(1);
  });
  it("counts overdue as open tasks due before today", () => {
    const m = taskMetrics([t({ due_date: "2026-10-21T12:00:00Z" }), t({ due_date: "2026-10-23T12:00:00Z" })], today, "UTC");
    expect(m.overdue).toBe(1);
  });
  it("counts completed today in the user's timezone", () => {
    // 20:00 UTC on the 21st is 01:30 on the 22nd in Colombo
    const m = taskMetrics([t({ status: "done", completed_at: "2026-10-21T20:00:00Z" })], today, "Asia/Colombo");
    expect(m.completedToday).toBe(1);
  });
  it("builds a series of the requested length", () => {
    expect(activitySeries([], today, "UTC", 7)).toHaveLength(7);
  });
  it("weeks start on Monday", () => {
    expect(weekStart("2026-10-22")).toBe("2026-10-19");
  });
});
