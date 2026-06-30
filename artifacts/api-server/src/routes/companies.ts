import { Router, type IRouter } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq, ilike, or, and, desc, count } from "drizzle-orm";
import { getUserRole } from "../lib/user";
import { resolvePlan } from "../lib/billing";
import { UNLIMITED } from "../lib/plans";
import {
  ListCompaniesQueryParams,
  ListCompaniesResponse,
  CreateCompanyBody,
  CreateCompanyResponse,
  GetCompanyParams,
  GetCompanyResponse,
  UpdateCompanyParams,
  UpdateCompanyBody,
  UpdateCompanyResponse,
  DeleteCompanyParams,
} from "@workspace/api-zod";
import type { Company } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";

const router: IRouter = Router();

function serialize(row: Company) {
  return {
    ...row,
    capital: row.capital === null ? null : Number(row.capital),
  };
}

router.get("/companies", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { scale, search } = ListCompaniesQueryParams.parse(req.query);
  const conditions = [eq(companiesTable.consultantId, consultantId)];
  if (scale) conditions.push(eq(companiesTable.scale, scale));
  if (search)
    conditions.push(
      or(
        ilike(companiesTable.name, `%${search}%`),
        ilike(companiesTable.nib, `%${search}%`),
      )!,
    );
  const rows = await db
    .select()
    .from(companiesTable)
    .where(and(...conditions))
    .orderBy(desc(companiesTable.createdAt));
  res.json(ListCompaniesResponse.parse(rows.map(serialize)));
});

router.post("/companies", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = CreateCompanyBody.parse(req.body);
  // Peran harus sudah dipilih sebelum membuat perusahaan; tanpa peran,
  // batasan tidak dapat ditegakkan sehingga permintaan ditolak.
  const role = await getUserRole(consultantId);
  if (role === null) {
    res.status(409).json({
      error: "Pilih peran akun terlebih dahulu sebelum menambah perusahaan.",
    });
    return;
  }
  // Batas jumlah perusahaan ditentukan oleh paket langganan aktif. Akun
  // perusahaan dan konsultan gratis dibatasi satu perusahaan; paket berbayar
  // menaikkan atau menghapus batas ini (maxCompanies === -1 berarti tanpa batas).
  const plan = await resolvePlan(consultantId, role);
  if (plan.maxCompanies !== UNLIMITED) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(companiesTable)
      .where(eq(companiesTable.consultantId, consultantId));
    if (value >= plan.maxCompanies) {
      res.status(409).json({
        error:
          role === "perusahaan"
            ? "Akun perusahaan hanya dapat mengelola satu perusahaan. Tingkatkan ke paket konsultan untuk mengelola lebih banyak."
            : `Paket Anda mencapai batas ${plan.maxCompanies} perusahaan. Tingkatkan paket untuk menambah lebih banyak.`,
      });
      return;
    }
  }
  const [row] = await db
    .insert(companiesTable)
    .values({
      consultantId,
      name: body.name,
      nib: body.nib,
      scale: body.scale,
      operatingMode: body.operatingMode,
      permitType: body.permitType,
      ssStatus: body.ssStatus ?? "tidak_ada",
      kbli: body.kbli ?? [],
      capital: body.capital === undefined ? null : String(body.capital),
      address: body.address ?? null,
      picName: body.picName ?? null,
    })
    .returning();
  res.status(201).json(CreateCompanyResponse.parse(serialize(row)));
});

router.get("/companies/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = GetCompanyParams.parse(req.params);
  const [row] = await db
    .select()
    .from(companiesTable)
    .where(
      and(
        eq(companiesTable.id, id),
        eq(companiesTable.consultantId, consultantId),
      ),
    );
  if (!row) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  res.json(GetCompanyResponse.parse(serialize(row)));
});

router.patch("/companies/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = UpdateCompanyParams.parse(req.params);
  const body = UpdateCompanyBody.parse(req.body);
  const [row] = await db
    .update(companiesTable)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.nib !== undefined && { nib: body.nib }),
      ...(body.scale !== undefined && { scale: body.scale }),
      ...(body.operatingMode !== undefined && {
        operatingMode: body.operatingMode,
      }),
      ...(body.permitType !== undefined && { permitType: body.permitType }),
      ...(body.ssStatus !== undefined && { ssStatus: body.ssStatus }),
      ...(body.kbli !== undefined && { kbli: body.kbli }),
      ...(body.capital !== undefined && { capital: String(body.capital) }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.picName !== undefined && { picName: body.picName }),
    })
    .where(
      and(
        eq(companiesTable.id, id),
        eq(companiesTable.consultantId, consultantId),
      ),
    )
    .returning();
  if (!row) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  res.json(UpdateCompanyResponse.parse(serialize(row)));
});

router.delete("/companies/:id", async (req, res) => {
  const consultantId = getConsultantId(req);
  const { id } = DeleteCompanyParams.parse(req.params);
  const deleted = await db
    .delete(companiesTable)
    .where(
      and(
        eq(companiesTable.id, id),
        eq(companiesTable.consultantId, consultantId),
      ),
    )
    .returning({ id: companiesTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

export default router;
