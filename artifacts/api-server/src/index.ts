import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { logger } from "./lib/logger";
import { getStripeSync } from "./lib/stripeClient";

/**
 * Best-effort Stripe bootstrap. Runs the stripe-schema migrations, registers a
 * managed webhook, and backfills existing data so the synced tables are warm.
 * Intentionally non-fatal: if the Stripe integration is not connected yet the
 * server must still boot and serve all non-billing features.
 */
async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL tidak ada; lewati inisialisasi Stripe.");
    return;
  }
  try {
    await runMigrations({ databaseUrl });
    const sync = await getStripeSync();
    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    if (domain) {
      await sync.findOrCreateManagedWebhook(
        `https://${domain}/api/stripe/webhook`,
      );
    }
    await sync.syncBackfill();
    logger.info("Inisialisasi Stripe selesai.");
  } catch (err) {
    logger.warn(
      { err },
      "Inisialisasi Stripe dilewati (integrasi belum terhubung). Fitur penagihan nonaktif sampai Stripe disambungkan.",
    );
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  void initStripe();
});
