import {
  db,
  reportsTable,
  izinTable,
  companiesTable,
  notificationsTable,
  notificationPreferencesTable,
  type NotificationPreferences,
} from "@workspace/db";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, isEmailAvailable } from "./replitmail";
import {
  DEFAULT_REMINDER_LEAD_DAYS,
  daysUntil,
  computeDueReminder,
  type DueReminder,
} from "./reminder-logic";

export {
  DEFAULT_REMINDER_LEAD_DAYS,
  daysUntil,
  computeDueReminder,
  type DueReminder,
};

const SUBMITTED_STATUSES = ["submit", "monitor", "archive"];

export const DEFAULT_PREFERENCES = {
  enabled: true,
  inAppEnabled: true,
  emailEnabled: true,
  reminderLeadDays: DEFAULT_REMINDER_LEAD_DAYS,
};

export type Preferences = Pick<
  NotificationPreferences,
  "enabled" | "inAppEnabled" | "emailEnabled" | "email" | "reminderLeadDays"
>;

export async function getPreferences(
  consultantId: string,
): Promise<Preferences> {
  const [row] = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.consultantId, consultantId));
  if (!row) return { ...DEFAULT_PREFERENCES, email: null };
  return {
    enabled: row.enabled,
    inAppEnabled: row.inAppEnabled,
    emailEnabled: row.emailEnabled,
    email: row.email,
    // Respect an explicitly empty array (user chose "no upcoming reminders,
    // overdue only"); only fall back to defaults when the value is missing.
    reminderLeadDays: Array.isArray(row.reminderLeadDays)
      ? row.reminderLeadDays
      : DEFAULT_REMINDER_LEAD_DAYS,
  };
}

export async function upsertPreferences(
  consultantId: string,
  patch: Partial<Preferences>,
): Promise<Preferences> {
  const current = await getPreferences(consultantId);
  const next: Preferences = {
    enabled: patch.enabled ?? current.enabled,
    inAppEnabled: patch.inAppEnabled ?? current.inAppEnabled,
    emailEnabled: patch.emailEnabled ?? current.emailEnabled,
    email: patch.email !== undefined ? patch.email : current.email,
    reminderLeadDays: patch.reminderLeadDays ?? current.reminderLeadDays,
  };
  await db
    .insert(notificationPreferencesTable)
    .values({ consultantId, ...next })
    .onConflictDoUpdate({
      target: notificationPreferencesTable.consultantId,
      set: { ...next, updatedAt: new Date() },
    });
  return next;
}

function buildReminder(
  due: Exclude<DueReminder, null>,
  ctx: {
    reportId: number;
    remaining: number;
    deadline: string;
    periodLabel: string;
    companyName: string;
    label: string;
  },
): {
  type: "deadline_upcoming" | "deadline_overdue";
  dedupeKey: string;
  title: string;
  body: string;
} {
  const formattedDeadline = new Date(ctx.deadline).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (due.kind === "overdue") {
    const late = Math.abs(ctx.remaining);
    return {
      type: "deadline_overdue",
      dedupeKey: `report:${ctx.reportId}:overdue`,
      title: `Laporan LKPM terlambat — ${ctx.companyName}`,
      body: `Laporan LKPM periode ${ctx.periodLabel} untuk ${ctx.label} telah melewati tenggat ${formattedDeadline} (terlambat ${late} hari). Segera sampaikan melalui OSS untuk menghindari sanksi.`,
    };
  }
  return {
    type: "deadline_upcoming",
    dedupeKey: `report:${ctx.reportId}:d-${due.leadDay}`,
    title: `Tenggat LKPM mendatang — ${ctx.companyName}`,
    body: `Laporan LKPM periode ${ctx.periodLabel} untuk ${ctx.label} jatuh tempo ${formattedDeadline} (sisa ${ctx.remaining} hari). Siapkan dan sampaikan sebelum tenggat.`,
  };
}

/**
 * Generate deadline reminders for a single consultant, idempotently. Newly
 * created in-app notifications are optionally summarized in a best-effort email.
 * Safe to call repeatedly (e.g. on every notifications fetch).
 */
export async function generateNotificationsForConsultant(
  consultantId: string,
): Promise<void> {
  const prefs = await getPreferences(consultantId);
  if (!prefs.enabled) return;
  if (!prefs.inAppEnabled && !prefs.emailEnabled) return;

  const rows = await db
    .select({
      reportId: reportsTable.id,
      deadline: reportsTable.deadline,
      status: reportsTable.status,
      periodLabel: reportsTable.periodLabel,
      idIzin: izinTable.idIzin,
      projectName: izinTable.projectName,
      companyName: companiesTable.name,
    })
    .from(reportsTable)
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(eq(companiesTable.consultantId, consultantId));

  const created: {
    id: number;
    title: string;
    body: string;
  }[] = [];

  for (const r of rows) {
    if (SUBMITTED_STATUSES.includes(r.status)) continue;
    const remaining = daysUntil(r.deadline);
    const due = computeDueReminder(remaining, prefs.reminderLeadDays);
    if (!due) continue;

    const label = r.projectName ? `${r.projectName} (${r.idIzin})` : r.idIzin;
    const reminder = buildReminder(due, {
      reportId: r.reportId,
      remaining,
      deadline: r.deadline,
      periodLabel: r.periodLabel,
      companyName: r.companyName,
      label,
    });

    const inserted = await db
      .insert(notificationsTable)
      .values({
        consultantId,
        reportId: r.reportId,
        type: reminder.type,
        title: reminder.title,
        body: reminder.body,
        deadline: r.deadline,
        dedupeKey: reminder.dedupeKey,
        // Honor the in-app channel at generation time: reminders created while
        // in-app is off are kept only as an email/dedupe record and never
        // surface in the center, even if the channel is re-enabled later.
        inApp: prefs.inAppEnabled,
      })
      .onConflictDoNothing({
        target: [
          notificationsTable.consultantId,
          notificationsTable.dedupeKey,
        ],
      })
      .returning({ id: notificationsTable.id });

    if (inserted[0]) {
      created.push({
        id: inserted[0].id,
        title: reminder.title,
        body: reminder.body,
      });
    }
  }

  // Email is delivered to the consultant's own synced address. Without it we
  // skip email (rather than misdeliver) — in-app notifications still apply.
  if (
    created.length &&
    prefs.emailEnabled &&
    prefs.email &&
    isEmailAvailable()
  ) {
    await emailReminderDigest(prefs.email, created).catch((err) => {
      logger.warn(
        { err, consultantId },
        "Pengiriman email pengingat gagal; notifikasi in-app tetap dibuat.",
      );
    });
  }
}

async function emailReminderDigest(
  to: string,
  created: { id: number; title: string; body: string }[],
): Promise<void> {
  const lines = created.map((c) => `- ${c.title}\n  ${c.body}`).join("\n\n");
  const text = `Ada ${created.length} pengingat tenggat LKPM baru:\n\n${lines}\n\nBuka LKPM-Flow untuk detail selengkapnya.`;
  const htmlItems = created
    .map(
      (c) =>
        `<li style="margin-bottom:12px"><strong>${escapeHtml(
          c.title,
        )}</strong><br/>${escapeHtml(c.body)}</li>`,
    )
    .join("");
  const html = `<p>Ada ${created.length} pengingat tenggat LKPM baru:</p><ul>${htmlItems}</ul><p>Buka LKPM-Flow untuk detail selengkapnya.</p>`;

  await sendEmail({
    to,
    subject: `Pengingat tenggat LKPM — ${created.length} laporan`,
    text,
    html,
  });

  await db
    .update(notificationsTable)
    .set({ emailedAt: new Date() })
    .where(
      and(
        inArray(
          notificationsTable.id,
          created.map((c) => c.id),
        ),
        isNull(notificationsTable.emailedAt),
      ),
    );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Generate reminders for every consultant that owns at least one company.
 * Used by the startup/interval scheduler.
 */
export async function generateAllNotifications(): Promise<void> {
  const consultants = await db
    .select({ consultantId: companiesTable.consultantId })
    .from(companiesTable)
    .groupBy(companiesTable.consultantId);

  for (const { consultantId } of consultants) {
    try {
      await generateNotificationsForConsultant(consultantId);
    } catch (err) {
      logger.warn(
        { err, consultantId },
        "Gagal membuat pengingat tenggat untuk konsultan.",
      );
    }
  }
}

let schedulerStarted = false;

/**
 * Start the deadline-reminder scheduler: an immediate run on boot, then every
 * hour. Guarded so repeated calls are no-ops.
 */
export function startNotificationScheduler(intervalMs = 60 * 60 * 1000): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const run = () => {
    generateAllNotifications().catch((err) => {
      logger.warn({ err }, "Penjadwalan pengingat tenggat gagal.");
    });
  };

  run();
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
}
