import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { inArray } from "drizzle-orm";
import {
  db,
  companiesTable,
  izinTable,
  reportsTable,
  dataPointsTable,
  constraintsTable,
} from "@workspace/db";
import {
  companyBelongsToConsultant,
  izinBelongsToConsultant,
  reportBelongsToConsultant,
  dataPointBelongsToConsultant,
  constraintBelongsToConsultant,
} from "./ownership";

// Two distinct consultants. The suffix keeps these fixtures isolated from
// seeded/real data and from concurrent runs.
const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const CONSULTANT_A = `test-consultant-a-${suffix}`;
const CONSULTANT_B = `test-consultant-b-${suffix}`;

// Resources owned by consultant A; consultant B must never see them.
let companyId = 0;
let izinId = 0;
let reportId = 0;
let dataPointId = 0;
let constraintId = 0;
const createdCompanyIds: number[] = [];

beforeAll(async () => {
  const [company] = await db
    .insert(companiesTable)
    .values({
      consultantId: CONSULTANT_A,
      name: `PT Uji Isolasi ${suffix}`,
      nib: `NIB-${suffix}`,
      scale: "menengah",
      operatingMode: "komersial",
    })
    .returning({ id: companiesTable.id });
  companyId = company.id;
  createdCompanyIds.push(companyId);

  const [izin] = await db
    .insert(izinTable)
    .values({
      companyId,
      idIzin: `IZIN-${suffix}`,
      scale: "menengah",
    })
    .returning({ id: izinTable.id });
  izinId = izin.id;

  const [report] = await db
    .insert(reportsTable)
    .values({
      izinId,
      scale: "menengah",
      periodType: "triwulan",
      periodLabel: "Triwulan I",
      year: 2026,
      deadline: "2026-04-15",
    })
    .returning({ id: reportsTable.id });
  reportId = report.id;

  const [dataPoint] = await db
    .insert(dataPointsTable)
    .values({
      reportId,
      category: "investasi",
      label: "Realisasi investasi",
    })
    .returning({ id: dataPointsTable.id });
  dataPointId = dataPoint.id;

  const [constraint] = await db
    .insert(constraintsTable)
    .values({
      reportId,
      issue: "Menunggu dokumen pendukung",
    })
    .returning({ id: constraintsTable.id });
  constraintId = constraint.id;
});

afterAll(async () => {
  // Deleting the companies cascades to izin, reports, data points, constraints.
  if (createdCompanyIds.length) {
    await db
      .delete(companiesTable)
      .where(inArray(companiesTable.id, createdCompanyIds));
  }
});

describe("multi-tenant ownership isolation", () => {
  it("grants the owning consultant access to every resource level", async () => {
    expect(await companyBelongsToConsultant(companyId, CONSULTANT_A)).toBe(true);
    expect(await izinBelongsToConsultant(izinId, CONSULTANT_A)).toBe(true);
    expect(await reportBelongsToConsultant(reportId, CONSULTANT_A)).toBe(true);
    expect(
      await dataPointBelongsToConsultant(dataPointId, CONSULTANT_A),
    ).toBe(true);
    expect(
      await constraintBelongsToConsultant(constraintId, CONSULTANT_A),
    ).toBe(true);
  });

  it("denies a different consultant access at every resource level", async () => {
    expect(await companyBelongsToConsultant(companyId, CONSULTANT_B)).toBe(
      false,
    );
    expect(await izinBelongsToConsultant(izinId, CONSULTANT_B)).toBe(false);
    expect(await reportBelongsToConsultant(reportId, CONSULTANT_B)).toBe(false);
    expect(
      await dataPointBelongsToConsultant(dataPointId, CONSULTANT_B),
    ).toBe(false);
    expect(
      await constraintBelongsToConsultant(constraintId, CONSULTANT_B),
    ).toBe(false);
  });

  it("denies access to non-existent resources at every level", async () => {
    expect(await companyBelongsToConsultant(-1, CONSULTANT_A)).toBe(false);
    expect(await izinBelongsToConsultant(-1, CONSULTANT_A)).toBe(false);
    expect(await reportBelongsToConsultant(-1, CONSULTANT_A)).toBe(false);
    expect(await dataPointBelongsToConsultant(-1, CONSULTANT_A)).toBe(false);
    expect(await constraintBelongsToConsultant(-1, CONSULTANT_A)).toBe(false);
  });
});
