import {
  db,
  companiesTable,
  izinTable,
  reportsTable,
  dataPointsTable,
  constraintsTable,
  basisPermitsTable,
  attachmentsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export async function companyBelongsToConsultant(
  companyId: number,
  consultantId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(
      and(
        eq(companiesTable.id, companyId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  return Boolean(row);
}

export async function izinBelongsToConsultant(
  izinId: number,
  consultantId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: izinTable.id })
    .from(izinTable)
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(izinTable.id, izinId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  return Boolean(row);
}

export async function basisPermitBelongsToConsultant(
  basisPermitId: number,
  consultantId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: basisPermitsTable.id })
    .from(basisPermitsTable)
    .innerJoin(izinTable, eq(basisPermitsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(basisPermitsTable.id, basisPermitId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  return Boolean(row);
}

export async function reportBelongsToConsultant(
  reportId: number,
  consultantId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: reportsTable.id })
    .from(reportsTable)
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(reportsTable.id, reportId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  return Boolean(row);
}

export async function dataPointBelongsToConsultant(
  dataPointId: number,
  consultantId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: dataPointsTable.id })
    .from(dataPointsTable)
    .innerJoin(reportsTable, eq(dataPointsTable.reportId, reportsTable.id))
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(dataPointsTable.id, dataPointId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  return Boolean(row);
}

export async function constraintBelongsToConsultant(
  constraintId: number,
  consultantId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: constraintsTable.id })
    .from(constraintsTable)
    .innerJoin(reportsTable, eq(constraintsTable.reportId, reportsTable.id))
    .innerJoin(izinTable, eq(reportsTable.izinId, izinTable.id))
    .innerJoin(companiesTable, eq(izinTable.companyId, companiesTable.id))
    .where(
      and(
        eq(constraintsTable.id, constraintId),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  return Boolean(row);
}

/**
 * Resolves an attachment to its owning consultant via whichever parent it is
 * linked to (report → izin → company, izin → company, or basisPermit → izin →
 * company). Returns the attachment row only when it belongs to the consultant,
 * so callers can 404 on both missing and cross-tenant access without leaking
 * existence.
 */
export async function getAttachmentForConsultant(
  attachmentId: number,
  consultantId: string,
): Promise<typeof attachmentsTable.$inferSelect | null> {
  const [row] = await db.select().from(attachmentsTable).where(
    eq(attachmentsTable.id, attachmentId),
  );
  if (!row) return null;
  if (row.reportId != null) {
    return (await reportBelongsToConsultant(row.reportId, consultantId))
      ? row
      : null;
  }
  if (row.izinId != null) {
    return (await izinBelongsToConsultant(row.izinId, consultantId))
      ? row
      : null;
  }
  if (row.basisPermitId != null) {
    return (await basisPermitBelongsToConsultant(row.basisPermitId, consultantId))
      ? row
      : null;
  }
  return null;
}
