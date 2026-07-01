import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./lib/webhookHandlers";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));

// Stripe webhook MUST be registered before express.json() so the raw body is
// preserved for signature verification.
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, signature);
      res.json({ received: true });
    } catch (err) {
      req.log.error({ err }, "Stripe webhook processing failed");
      res.status(400).json({ error: "Webhook processing failed" });
    }
  },
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// The publishable key is the SAME value the frontend uses
// (VITE_CLERK_PUBLISHABLE_KEY). Derive it from a single source so the two can't
// silently diverge: prefer CLERK_PUBLISHABLE_KEY when set, otherwise fall back
// to VITE_CLERK_PUBLISHABLE_KEY.
const clerkPublishableKey =
  process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      clerkPublishableKey,
    ),
  })),
);

app.use("/api", router);

app.use(
  (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (err && typeof err === "object" && (err as { name?: string }).name === "ZodError") {
      req.log.warn({ err }, "Validation error");
      res.status(400).json({ error: "Permintaan tidak valid" });
      return;
    }
    req.log.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  },
);

export default app;
