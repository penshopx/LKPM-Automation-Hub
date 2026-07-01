import { Router, type IRouter } from "express";
import { randomBytes } from "node:crypto";
import {
  db,
  teamMembersTable,
  companySharesTable,
  companiesTable,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  InviteTeamMemberBody,
  ListTeamMembersResponse,
  InviteTeamMemberResponse,
  RemoveTeamMemberParams,
  AcceptInviteBody,
  AcceptInviteResponse,
  ListCompanyCollaboratorsParams,
  ListCompanyCollaboratorsResponse,
  ShareCompanyParams,
  ShareCompanyBody,
  ShareCompanyResponse,
  UnshareCompanyParams,
} from "@workspace/api-zod";
import type { TeamMember } from "@workspace/db";
import { getConsultantId } from "../middlewares/auth";
import { companyBelongsToConsultant } from "../lib/ownership";

const router: IRouter = Router();

// Pemilik melihat inviteCode agar bisa membagikannya; anggota lain tidak.
function serializeMember(row: TeamMember) {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    memberId: row.memberId,
    inviteCode: row.inviteCode,
    createdAt: row.createdAt,
  };
}

router.get("/team/members", async (req, res) => {
  const ownerId = getConsultantId(req);
  const rows = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.ownerId, ownerId))
    .orderBy(desc(teamMembersTable.createdAt));
  res.json(ListTeamMembersResponse.parse(rows.map(serializeMember)));
});

router.post("/team/members", async (req, res) => {
  const ownerId = getConsultantId(req);
  const body = InviteTeamMemberBody.parse(req.body);
  const inviteCode = randomBytes(6).toString("hex").toUpperCase();
  const [row] = await db
    .insert(teamMembersTable)
    .values({ ownerId, email: body.email, inviteCode, status: "pending" })
    .returning();
  res.status(201).json(InviteTeamMemberResponse.parse(serializeMember(row)));
});

router.delete("/team/members/:id", async (req, res) => {
  const ownerId = getConsultantId(req);
  const { id } = RemoveTeamMemberParams.parse(req.params);
  const [member] = await db
    .select()
    .from(teamMembersTable)
    .where(
      and(eq(teamMembersTable.id, id), eq(teamMembersTable.ownerId, ownerId)),
    );
  if (!member) {
    res.status(404).json({ error: "Anggota tim tidak ditemukan" });
    return;
  }
  // Cabut akses berbagi anggota ini pada seluruh perusahaan milik pemilik,
  // lalu hapus keanggotaannya. Isolasi tetap terjaga: hanya baris milik owner.
  if (member.memberId) {
    await db
      .delete(companySharesTable)
      .where(
        and(
          eq(companySharesTable.ownerId, ownerId),
          eq(companySharesTable.memberId, member.memberId),
        ),
      );
  }
  await db.delete(teamMembersTable).where(eq(teamMembersTable.id, id));
  res.status(204).send();
});

router.post("/team/accept", async (req, res) => {
  const userId = getConsultantId(req);
  const body = AcceptInviteBody.parse(req.body);
  const [invite] = await db
    .select()
    .from(teamMembersTable)
    .where(eq(teamMembersTable.inviteCode, body.inviteCode.trim()));
  if (!invite || invite.status === "revoked") {
    res.status(404).json({ error: "Kode undangan tidak valid" });
    return;
  }
  // Seseorang tidak dapat menjadi anggota tim miliknya sendiri.
  if (invite.ownerId === userId) {
    res
      .status(409)
      .json({ error: "Anda tidak dapat menerima undangan tim Anda sendiri." });
    return;
  }
  const [updated] = await db
    .update(teamMembersTable)
    .set({ memberId: userId, status: "active" })
    .where(eq(teamMembersTable.id, invite.id))
    .returning();
  res.json(
    AcceptInviteResponse.parse({
      ownerId: updated.ownerId,
      status: updated.status,
    }),
  );
});

router.get("/companies/:companyId/collaborators", async (req, res) => {
  const ownerId = getConsultantId(req);
  const { companyId } = ListCompanyCollaboratorsParams.parse(req.params);
  // Hanya pemilik perusahaan yang boleh mengelola/mengetahui daftar kolaborator.
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(
      and(
        eq(companiesTable.id, companyId),
        eq(companiesTable.consultantId, ownerId),
      ),
    );
  if (!company) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  const shares = await db
    .select({ share: companySharesTable, member: teamMembersTable })
    .from(companySharesTable)
    .leftJoin(
      teamMembersTable,
      and(
        eq(teamMembersTable.ownerId, companySharesTable.ownerId),
        eq(teamMembersTable.memberId, companySharesTable.memberId),
      ),
    )
    .where(eq(companySharesTable.companyId, companyId));
  const collaborators = [
    { userId: ownerId, name: "Pemilik akun", isOwner: true, shareId: null },
    ...shares.map((s) => ({
      userId: s.share.memberId,
      name: s.member?.email ?? s.share.memberId,
      isOwner: false,
      shareId: s.share.id,
    })),
  ];
  res.json(ListCompanyCollaboratorsResponse.parse(collaborators));
});

router.post("/companies/:companyId/shares", async (req, res) => {
  const ownerId = getConsultantId(req);
  const { companyId } = ShareCompanyParams.parse(req.params);
  const body = ShareCompanyBody.parse(req.body);
  if (!(await companyBelongsToConsultant(companyId, ownerId))) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  // Hanya anggota tim aktif milik pemilik yang boleh diberi akses.
  const [member] = await db
    .select()
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.ownerId, ownerId),
        eq(teamMembersTable.memberId, body.memberId),
        eq(teamMembersTable.status, "active"),
      ),
    );
  if (!member) {
    res
      .status(404)
      .json({ error: "Anggota tim aktif tidak ditemukan untuk dibagikan." });
    return;
  }
  await db
    .insert(companySharesTable)
    .values({ companyId, memberId: body.memberId, ownerId })
    .onConflictDoNothing({
      target: [companySharesTable.companyId, companySharesTable.memberId],
    });
  const [share] = await db
    .select()
    .from(companySharesTable)
    .where(
      and(
        eq(companySharesTable.companyId, companyId),
        eq(companySharesTable.memberId, body.memberId),
      ),
    );
  res.status(201).json(
    ShareCompanyResponse.parse({
      userId: body.memberId,
      name: member.email,
      isOwner: false,
      shareId: share.id,
    }),
  );
});

router.delete("/companies/:companyId/shares/:memberId", async (req, res) => {
  const ownerId = getConsultantId(req);
  const { companyId, memberId } = UnshareCompanyParams.parse(req.params);
  if (!(await companyBelongsToConsultant(companyId, ownerId))) {
    res.status(404).json({ error: "Perusahaan tidak ditemukan" });
    return;
  }
  const deleted = await db
    .delete(companySharesTable)
    .where(
      and(
        eq(companySharesTable.companyId, companyId),
        eq(companySharesTable.memberId, memberId),
      ),
    )
    .returning({ id: companySharesTable.id });
  if (deleted.length === 0) {
    res.status(404).json({ error: "Akses berbagi tidak ditemukan" });
    return;
  }
  res.status(204).send();
});

export default router;
