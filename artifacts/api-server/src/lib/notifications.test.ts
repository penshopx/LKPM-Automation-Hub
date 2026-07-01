import { describe, it, expect } from "vitest";
import { computeDueReminder } from "./reminder-logic";

describe("computeDueReminder", () => {
  const leadDays = [7, 3, 1];

  it("returns overdue for any negative remaining", () => {
    expect(computeDueReminder(-1, leadDays)).toEqual({ kind: "overdue" });
    expect(computeDueReminder(-30, leadDays)).toEqual({ kind: "overdue" });
  });

  it("returns null when remaining is beyond the largest lead day", () => {
    expect(computeDueReminder(8, leadDays)).toBeNull();
    expect(computeDueReminder(100, leadDays)).toBeNull();
  });

  it("fires the largest applicable threshold first as the deadline nears", () => {
    // remaining 7 -> only 7 applies
    expect(computeDueReminder(7, leadDays)).toEqual({
      kind: "upcoming",
      leadDay: 7,
    });
    // remaining 5 -> still the 7-day threshold (smallest L with remaining<=L)
    expect(computeDueReminder(5, leadDays)).toEqual({
      kind: "upcoming",
      leadDay: 7,
    });
  });

  it("steps down to smaller thresholds so each fires exactly once", () => {
    expect(computeDueReminder(3, leadDays)).toEqual({
      kind: "upcoming",
      leadDay: 3,
    });
    expect(computeDueReminder(2, leadDays)).toEqual({
      kind: "upcoming",
      leadDay: 3,
    });
    expect(computeDueReminder(1, leadDays)).toEqual({
      kind: "upcoming",
      leadDay: 1,
    });
    expect(computeDueReminder(0, leadDays)).toEqual({
      kind: "upcoming",
      leadDay: 1,
    });
  });

  it("ignores non-finite lead days and handles empty config", () => {
    expect(computeDueReminder(0, [])).toBeNull();
    expect(
      computeDueReminder(2, [Number.NaN, Number.POSITIVE_INFINITY, 3]),
    ).toEqual({ kind: "upcoming", leadDay: 3 });
  });

  it("still reports overdue even when no lead days are configured", () => {
    expect(computeDueReminder(-1, [])).toEqual({ kind: "overdue" });
  });
});
