import {
  db,
  companiesTable,
  izinTable,
  reportsTable,
  dataPointsTable,
  constraintsTable,
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
