import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() || req.session?.guestId) {
    return next();
  }
  res.status(401).json({ error: "Not authenticated" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as { email?: string } | undefined;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim());
  if (user?.email && adminEmails.includes(user.email)) {
    return next();
  }
  res.status(403).json({ error: "Forbidden" });
}
