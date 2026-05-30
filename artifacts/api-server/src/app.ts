import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, please try again later" }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts, please try again in 15 minutes" }
});
const app: Express = express();
app.use(helmet({ contentSecurityPolicy: false }));
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
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "https://fatima-medical-store.netlify.app",
    "https://fatima-medical.pages.dev",
    /\.fatima-medical\.pages\.dev$/,
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Handle preflight requests
app.options("/(.*)", cors());
app.use(express.json({ limit: "10mb" }));
app.use(generalLimiter);
app.use("/api/auth", authLimiter);
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


app.use("/api", router);

// Global JSON error handler — ensures all errors return JSON, never HTML
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  logger.error({ err }, message);
  res.status(status).json({ error: message });
});

export default app;
