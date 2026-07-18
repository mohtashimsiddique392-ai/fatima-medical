import type { Request, Response, NextFunction } from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { db, customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerId?: number;
      clerkUserId?: string;
    }
  }
}

/** Attaches Clerk session info (if any) to the request. Mount this once on the app. */
export const attachClerk = clerkMiddleware();

/**
 * Requires a signed-in Clerk customer AND a matching row in our `customers`
 * table (created via POST /api/customers/sync right after sign-up/sign-in).
 * Populates req.customerId with the trusted, server-derived id — routes
 * should never trust a client-supplied customerId.
 */
export async function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: "Sign in required" });

  const [customer] = await db
    .select({ id: customersTable.id })
    .from(customersTable)
    .where(eq(customersTable.clerkUserId, userId))
    .limit(1);

  if (!customer) {
    return res.status(409).json({ error: "Account not set up yet. Call /api/customers/sync first." });
  }

  req.customerId = customer.id;
  req.clerkUserId = userId;
  return next();
}
