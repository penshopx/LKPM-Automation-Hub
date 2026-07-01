export const DEFAULT_REMINDER_LEAD_DAYS = [7, 3, 1];

export function daysUntil(deadline: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(deadline);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export type DueReminder =
  | { kind: "overdue" }
  | { kind: "upcoming"; leadDay: number }
  | null;

/**
 * Decide which single reminder (if any) applies to a report right now.
 *
 * - Overdue reports (remaining < 0) get one overdue reminder.
 * - Upcoming reports fire the *smallest* configured lead day L for which the
 *   remaining days is <= L. As the deadline approaches, each smaller threshold
 *   becomes applicable and fires exactly once (dedupe handles idempotency).
 *   This is robust to the scheduler missing the exact H-N day (e.g. downtime).
 */
export function computeDueReminder(
  remaining: number,
  leadDays: number[],
): DueReminder {
  if (remaining < 0) return { kind: "overdue" };
  const applicable = leadDays
    .filter((l) => Number.isFinite(l) && remaining <= l)
    .sort((a, b) => a - b);
  if (applicable.length === 0) return null;
  return { kind: "upcoming", leadDay: applicable[0] };
}
