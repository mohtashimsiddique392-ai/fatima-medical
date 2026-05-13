import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import ordersRouter from "./orders";
import referralsRouter from "./referrals";
import chatRouter from "./chat";
import adminRouter from "./admin";
import familyRouter from "./family";
import healthRecordsRouter from "./healthrecords";
import otpRouter from "./otp";
import scanRouter from "./scan";
import billingRouter from "./billing";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/referrals", referralsRouter);
router.use("/chat", chatRouter);
router.use("/admin", adminRouter);
router.use("/family", familyRouter);
router.use("/health-records", healthRecordsRouter);
router.use("/otp", otpRouter);
router.use("/scan", scanRouter);
router.use("/billing", billingRouter);

export default router;