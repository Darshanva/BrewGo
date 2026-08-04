import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "brewgo-secret-change-me";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // 1. Try Replit session auth
  if (req.isAuthenticated?.() && (req as any).user?.isAdmin) {
    next();
    return;
  }

  // 2. Try JWT Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const payload = jwt.verify(token, JWT_SECRET) as { id: string; isAdmin?: boolean };
      if (payload.isAdmin) {
        (req as any).user = payload;
        next();
        return;
      }
      res.status(403).json({ error: "Admin access required" });
      return;
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
  }

  res.status(401).json({ error: "Authentication required" });
}