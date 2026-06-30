import { Router, type IRouter, type Request } from "express";
import { db, companiesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  GetBillingSummaryResponse,
  ListBillingPlansResponse,
  CreateBillingCheckoutBody,
  CreateBillingCheckoutResponse,
  CreateBillingPortalResponse,
  ClaimBillingCreditsBody,
  ClaimBillingCreditsResponse,
} from "@workspace/api-zod";
import { getConsultantId } from "../middlewares/auth";
import { getUserRole } from "../lib/user";
import { UNLIMITED } from "../lib/plans";
import {
  resolvePlan,
  getCreditState,
  listPlans,
  createCheckout,
  createPortal,
  claimCheckoutCredits,
  getCreditStateAvailable,
} from "../lib/billing";

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
  return domain ? `https://${domain}` : `${req.protocol}://${req.get("host")}`;
}

async function getEmail(userId: string): Promise<string | undefined> {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user.primaryEmailAddress?.emailAddress ?? undefined;
  } catch {
    return undefined;
  }
}

router.get("/billing/summary", async (req, res) => {
  const consultantId = getConsultantId(req);
  const role = await getUserRole(consultantId);
  const plan = await resolvePlan(consultantId, role);
  const credits = await getCreditState(consultantId, plan);
  const [{ value }] = await db
    .select({ value: count() })
    .from(companiesTable)
    .where(eq(companiesTable.consultantId, consultantId));

  res.json(
    GetBillingSummaryResponse.parse({
      role,
      plan: { tier: plan.tier, name: plan.name, status: plan.status },
      credits,
      limits: {
        maxCompanies:
          plan.maxCompanies === UNLIMITED ? null : plan.maxCompanies,
        companyCount: value,
      },
    }),
  );
});

router.get("/billing/plans", async (_req, res) => {
  const plans = await listPlans();
  res.json(ListBillingPlansResponse.parse(plans));
});

router.post("/billing/checkout", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = CreateBillingCheckoutBody.parse(req.body);
  const role = await getUserRole(consultantId);
  if (role === null) {
    res.status(409).json({
      error: "Pilih peran akun terlebih dahulu sebelum berlangganan.",
    });
    return;
  }
  try {
    const email = await getEmail(consultantId);
    const result = await createCheckout(
      consultantId,
      email,
      body.priceId,
      getOrigin(req),
      role,
    );
    if ("forbidden" in result) {
      res.status(403).json({
        error: "Paket ini tidak tersedia untuk akun Anda.",
      });
      return;
    }
    res.json(CreateBillingCheckoutResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "Gagal membuat sesi checkout Stripe");
    res.status(502).json({
      error:
        "Layanan pembayaran belum siap. Pastikan integrasi Stripe sudah terhubung.",
    });
  }
});

router.post("/billing/portal", async (req, res) => {
  const consultantId = getConsultantId(req);
  try {
    const result = await createPortal(consultantId, getOrigin(req));
    if (!result) {
      res.status(404).json({
        error: "Belum ada langganan. Mulai berlangganan terlebih dahulu.",
      });
      return;
    }
    res.json(CreateBillingPortalResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "Gagal membuka portal pelanggan Stripe");
    res.status(502).json({
      error:
        "Layanan pembayaran belum siap. Pastikan integrasi Stripe sudah terhubung.",
    });
  }
});

router.post("/billing/credits/claim", async (req, res) => {
  const consultantId = getConsultantId(req);
  const body = ClaimBillingCreditsBody.parse(req.body);
  try {
    const { granted } = await claimCheckoutCredits(consultantId, body.sessionId);
    const available = await getCreditStateAvailable(consultantId);
    res.json(ClaimBillingCreditsResponse.parse({ granted, available }));
  } catch (err) {
    req.log.error({ err }, "Gagal mengklaim kredit dari sesi checkout");
    res.status(502).json({
      error:
        "Layanan pembayaran belum siap. Pastikan integrasi Stripe sudah terhubung.",
    });
  }
});

export default router;
