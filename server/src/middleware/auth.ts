import type { Request, Response, NextFunction } from "express";

export function getGuestId(req: Request): string | undefined {
  // Prefer header-based guest ID (works cross-origin without cookies)
  const header = req.headers["x-guest-id"];
  if (typeof header === "string" && header.length > 0) return header;
  return req.session?.guestId;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() || getGuestId(req)) {
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
