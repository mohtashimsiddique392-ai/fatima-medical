import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { attachClerk } from "./middleware/customerAuth";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Too many requests, please try again later" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, please try again in 15 minutes" },
});

const app: Express = express();
app.set("trust proxy", 1); // required on Vercel so express-rate-limit sees the real client IP
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "10mb" }));
app.use(generalLimiter);
app.use("/api/auth", authLimiter);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Populates req.auth from a Clerk session token (if the request has one).
// Individual routes that need a signed-in customer use requireCustomer.
app.use(attachClerk);

app.use("/api", router);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  logger.error({ err }, message);
  res.status(status).json({ error: message });
});

export default app;
