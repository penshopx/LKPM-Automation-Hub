import { describe, it, expect, afterAll } from "vitest";
import { inArray } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import express from "express";
import { db, usersTable, companiesTable } from "@workspace/db";

const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const PERUSAHAAN = `test-me-perusahaan-${suffix}`;
const KONSULTAN = `test-me-konsultan-${suffix}`;

const { default: meRouter } = await import("./me");
const { default: companiesRouter } = await import("./companies");

let server: ReturnType<express.Express["listen"]>;
let baseUrl = "";
const createdCompanyIds: number[] = [];

// Mount the real routers behind a stub auth middleware that lets each test
// choose which consultant id (Clerk userId) the request is made as.
function makeApp(consultantId: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.consultantId = consultantId;
    (req as unknown as { log: Record<string, () => void> }).log = {
      warn: () => {},
      error: () => {},
      info: () => {},
    };
    next();
  });
  app.use("/api", meRouter);
  app.use("/api", companiesRouter);
  return app;
}

async function startServer(consultantId: string) {
  const app = makeApp(consultantId);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
}

async function stopServer() {
  if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
}

const companyBody = {
  name: `PT Uji Peran ${suffix}`,
  nib: `NIB-${suffix}`,
  scale: "kecil",
  operatingMode: "penuh",
  permitType: "nib",
};

afterAll(async () => {
  if (createdCompanyIds.length) {
    await db
      .delete(companiesTable)
      .where(inArray(companiesTable.id, createdCompanyIds));
  }
  await db
    .delete(usersTable)
    .where(inArray(usersTable.userId, [PERUSAHAAN, KONSULTAN]));
});

describe("/me identity & role", () => {
  it("returns role null for a user who has not onboarded", async () => {
    await startServer(KONSULTAN);
    try {
      const res = await fetch(`${baseUrl}/api/me`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ role: null });
    } finally {
      await stopServer();
    }
  });

  it("sets the role once and is idempotent on later calls", async () => {
    await startServer(PERUSAHAAN);
    try {
      const set = await fetch(`${baseUrl}/api/me/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "perusahaan" }),
      });
      expect(set.status).toBe(200);
      expect(await set.json()).toEqual({ role: "perusahaan" });

      // A second call must not overwrite the established role.
      const again = await fetch(`${baseUrl}/api/me/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "konsultan" }),
      });
      expect(again.status).toBe(200);
      expect(await again.json()).toEqual({ role: "perusahaan" });

      const get = await fetch(`${baseUrl}/api/me`);
      expect(await get.json()).toEqual({ role: "perusahaan" });
    } finally {
      await stopServer();
    }
  });
});

describe("perusahaan single-company limit", () => {
  it("rejects company creation when no role has been chosen", async () => {
    const NOROLE = `test-me-norole-${suffix}`;
    await startServer(NOROLE);
    try {
      const res = await fetch(`${baseUrl}/api/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...companyBody, nib: `NIB-NR-${suffix}` }),
      });
      expect(res.status).toBe(409);
      const err = (await res.json()) as { error: string };
      expect(err.error).toContain("Pilih peran");
    } finally {
      await stopServer();
    }
  });

  it("allows the first company but blocks a second with 409", async () => {
    // Ensure the role is set to perusahaan for this consultant.
    await db
      .insert(usersTable)
      .values({ userId: PERUSAHAAN, role: "perusahaan" })
      .onConflictDoNothing({ target: usersTable.userId });

    await startServer(PERUSAHAAN);
    try {
      const first = await fetch(`${baseUrl}/api/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companyBody),
      });
      expect(first.status).toBe(201);
      const created = (await first.json()) as { id: number };
      createdCompanyIds.push(created.id);

      const second = await fetch(`${baseUrl}/api/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...companyBody, nib: `NIB2-${suffix}` }),
      });
      expect(second.status).toBe(409);
      const err = (await second.json()) as { error: string };
      expect(err.error).toContain("satu perusahaan");
    } finally {
      await stopServer();
    }
  });

  it("limits a free konsultan to one company until they upgrade", async () => {
    // Without an active subscription a konsultan resolves to the free plan,
    // which (like perusahaan) caps the workspace at a single company. Paid
    // konsultan tiers raise this cap; that path needs a live Stripe sync and is
    // covered by the billing logic, not this route test.
    await db
      .insert(usersTable)
      .values({ userId: KONSULTAN, role: "konsultan" })
      .onConflictDoNothing({ target: usersTable.userId });

    await startServer(KONSULTAN);
    try {
      const first = await fetch(`${baseUrl}/api/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...companyBody,
          name: `PT Klien 0 ${suffix}`,
          nib: `NIB-K0-${suffix}`,
        }),
      });
      expect(first.status).toBe(201);
      const created = (await first.json()) as { id: number };
      createdCompanyIds.push(created.id);

      const second = await fetch(`${baseUrl}/api/companies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...companyBody,
          name: `PT Klien 1 ${suffix}`,
          nib: `NIB-K1-${suffix}`,
        }),
      });
      expect(second.status).toBe(409);
    } finally {
      await stopServer();
    }
  });
});
