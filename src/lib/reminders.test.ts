import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { readFileSync } from "node:fs";
afterEach(() => vi.unstubAllEnvs());
describe("scheduler authentication", () => {
  it("rejects missing and invalid credentials", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "test-current");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "");
    expect((await authenticateCronRequest(new Request("https://example.test")))?.status).toBe(401);
    expect(
      (
        await authenticateCronRequest(
          new Request("https://example.test", { headers: { Authorization: "Bearer wrong" } }),
        )
      )?.status,
    ).toBe(401);
  });
  it("accepts only managed current or rotating credentials", async () => {
    vi.stubEnv("LOVABLE_CRON_SECRET", "test-current");
    vi.stubEnv("LOVABLE_CRON_SECRET_PREVIOUS", "test-previous");
    expect(
      await authenticateCronRequest(
        new Request("https://example.test", { headers: { Authorization: "Bearer test-current" } }),
      ),
    ).toBeNull();
    expect(
      await authenticateCronRequest(
        new Request("https://example.test", { headers: { Authorization: "Bearer test-previous" } }),
      ),
    ).toBeNull();
  });
});
describe("reminder SQL contract", () => {
  const sql = readFileSync("drizzle/migrations/0002_prevent_reminder_batch_starvation.sql", "utf8");
  it("filters processed events before the bounded batch", () => {
    expect(sql.indexOf("AND NOT EXISTS")).toBeGreaterThan(0);
    expect(sql.indexOf("AND NOT EXISTS")).toBeLessThan(sql.indexOf("LIMIT 500"));
  });
  it("uses per-user timezone and configurable timing", () => {
    expect(sql).toContain("now() AT TIME ZONE p.timezone");
    expect(sql).toContain("p.reminders_enabled");
    expect(sql).toContain("date-p.reminder_days_before");
  });
  it("locks concurrent runs and ignores duplicate events", () => {
    expect(sql).toContain("pg_try_advisory_xact_lock");
    expect(sql).toContain("ON CONFLICT DO NOTHING");
    expect(sql).toContain("FOR UPDATE OF t");
  });
});
