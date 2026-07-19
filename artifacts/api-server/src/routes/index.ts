import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import customersRouter from "./customers.js";
import productsRouter from "./products.js";
import ordersRouter from "./orders.js";
import referralsRouter from "./referrals.js";
import chatRouter from "./chat.js";
import adminRouter from "./admin.js";
import familyRouter from "./family.js";
import healthRecordsRouter from "./healthrecords.js";
import scanRouter from "./scan.js";
import billingRouter from "./billing.js";
import settingsRouter from "./settings.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/customers", customersRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/referrals", referralsRouter);
router.use("/chat", chatRouter);
router.use("/admin", adminRouter);
router.use("/family", familyRouter);
router.use("/health-records", healthRecordsRouter);
router.use("/scan", scanRouter);
router.use("/billing", billingRouter);
router.use("/settings", settingsRouter);

export default router;
