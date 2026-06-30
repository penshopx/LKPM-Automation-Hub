import { getUncachableStripeClient } from "./stripeClient";

/**
 * Create the LKPM-Flow products and prices in Stripe. Idempotent: products are
 * matched by name and skipped if they already exist. Run after connecting the
 * Stripe integration with:
 *
 *   pnpm --filter @workspace/scripts exec tsx src/seed-products.ts
 *
 * Currency is IDR. Stripe treats IDR as a 2-decimal currency, so amounts are in
 * sen (rupiah * 100). Pricing below is a reasonable starting point and can be
 * adjusted freely (or edited later from the Stripe dashboard).
 */

const CURRENCY = "idr";

interface PriceSpec {
  rupiah: number;
  interval?: "month" | "year";
}

interface ProductSpec {
  name: string;
  description: string;
  metadata: Record<string, string>;
  prices: PriceSpec[];
}

const PRODUCTS: ProductSpec[] = [
  {
    name: "LKPM-Flow Mandiri",
    description:
      "Untuk perusahaan yang melapor LKPM sendiri: 1 perusahaan dan 5 kredit pendampingan AI per bulan.",
    metadata: {
      kind: "subscription",
      tier: "mandiri",
      role: "perusahaan",
      maxCompanies: "1",
      monthlyCredits: "5",
    },
    prices: [
      { rupiah: 99_000, interval: "month" },
      { rupiah: 990_000, interval: "year" },
    ],
  },
  {
    name: "LKPM-Flow Konsultan",
    description:
      "Untuk firma konsultan: kelola hingga 25 perusahaan klien dan 30 kredit pendampingan AI per bulan.",
    metadata: {
      kind: "subscription",
      tier: "konsultan",
      role: "konsultan",
      maxCompanies: "25",
      monthlyCredits: "30",
    },
    prices: [{ rupiah: 499_000, interval: "month" }],
  },
  {
    name: "LKPM-Flow Konsultan Pro",
    description:
      "Untuk firma konsultan besar: perusahaan klien tanpa batas dan 100 kredit pendampingan AI per bulan.",
    metadata: {
      kind: "subscription",
      tier: "konsultan_pro",
      role: "konsultan",
      maxCompanies: "-1",
      monthlyCredits: "100",
    },
    prices: [{ rupiah: 1_499_000, interval: "month" }],
  },
  {
    name: "Paket 10 Kredit Pendampingan AI",
    description: "Tambahan 10 kredit pendampingan AI (sekali beli, tidak hangus).",
    metadata: { kind: "credit", credits: "10" },
    prices: [{ rupiah: 150_000 }],
  },
  {
    name: "Paket 50 Kredit Pendampingan AI",
    description: "Tambahan 50 kredit pendampingan AI (sekali beli, tidak hangus).",
    metadata: { kind: "credit", credits: "50" },
    prices: [{ rupiah: 600_000 }],
  },
];

async function main() {
  const stripe = await getUncachableStripeClient();
  console.log("Menyiapkan produk dan harga LKPM-Flow di Stripe...");

  for (const spec of PRODUCTS) {
    const existing = await stripe.products.search({
      query: `name:'${spec.name}' AND active:'true'`,
    });
    if (existing.data.length > 0) {
      console.log(`- Lewati (sudah ada): ${spec.name}`);
      continue;
    }

    const product = await stripe.products.create({
      name: spec.name,
      description: spec.description,
      metadata: spec.metadata,
    });
    console.log(`+ Produk: ${spec.name} (${product.id})`);

    for (const price of spec.prices) {
      const created = await stripe.prices.create({
        product: product.id,
        unit_amount: price.rupiah * 100,
        currency: CURRENCY,
        ...(price.interval
          ? { recurring: { interval: price.interval } }
          : {}),
      });
      const label = price.interval ? `/${price.interval}` : " (sekali beli)";
      console.log(
        `  + Harga: Rp${price.rupiah.toLocaleString("id-ID")}${label} (${created.id})`,
      );
    }
  }

  console.log("Selesai. Webhook akan menyinkronkan data ini ke database.");
}

main().catch((err) => {
  console.error("Gagal membuat produk:", err);
  process.exit(1);
});
