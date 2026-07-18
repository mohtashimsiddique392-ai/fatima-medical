import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AdminTokenPayload {
  sub: number;
  username: string;
  role: "admin" | "subadmin";
  permissions?: Record<string, boolean>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

function getSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error("ADMIN_JWT_SECRET environment variable is required.");
  }
  return secret;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: "12h" });
}

/** Requires a valid admin (or sub-admin) JWT in the Authorization header. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing admin token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), getSecret()) as AdminTokenPayload;
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

/** Requires a valid admin/sub-admin token AND (for sub-admins) a specific permission. */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    requireAdmin(req, res, () => {
      if (req.admin!.role === "admin") return next();
      if (req.admin!.permissions?.[permission]) return next();
      return res.status(403).json({ error: "You don't have permission to do this" });
    });
  };
}
