// Single Vercel serverless function that wraps the entire Express API.
// vercel.json rewrites every /api/* request here; Express's own router
// (mounted at app.use("/api", ...)) handles the rest of the routing
// exactly the same way it does when running locally on Replit.
import app from "../artifacts/api-server/src/app";

export default app;
