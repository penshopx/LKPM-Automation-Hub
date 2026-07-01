import { Router, type IRouter } from "express";
import healthRouter from "./health";
import companiesRouter from "./companies";
import izinRouter from "./izin";
import basisPermitsRouter from "./basisPermits";
import reportsRouter from "./reports";
import dataPointsRouter from "./dataPoints";
import constraintsRouter from "./constraints";
import activitiesRouter from "./activities";
import attachmentsRouter from "./attachments";
import dashboardRouter from "./dashboard";
import anthropicRouter from "./anthropic";
import orchestratorRouter from "./orchestrator";
import helpdeskRouter from "./helpdesk";
import meRouter from "./me";
import billingRouter from "./billing";
import notificationsRouter from "./notifications";
import teamRouter from "./team";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.use(healthRouter);

// Helpdesk publik: tersedia untuk pengunjung (termasuk landing page) tanpa login.
router.use(helpdeskRouter);

// Semua endpoint di bawah ini memerlukan konsultan yang terautentikasi.
router.use(requireAuth);

router.use(meRouter);
router.use(companiesRouter);
router.use(izinRouter);
router.use(basisPermitsRouter);
router.use(reportsRouter);
router.use(dataPointsRouter);
router.use(constraintsRouter);
router.use(activitiesRouter);
router.use(attachmentsRouter);
router.use(dashboardRouter);
router.use(anthropicRouter);
router.use(orchestratorRouter);
router.use(billingRouter);
router.use(notificationsRouter);
router.use(teamRouter);

export default router;
