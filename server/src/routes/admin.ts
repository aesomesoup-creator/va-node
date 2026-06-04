import { Router } from "express";
import { sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { getDb, isDbAvailable, schema } from "../db/index.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/anime", async (req, res) => {
  if (!isDbAvailable()) return res.json({ items: [], total: 0 });
  const db = getDb();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const q = String(req.query.q || "").trim();

  const items = await db
    .select()
    .from(schema.userAnime)
    .limit(limit)
    .offset(offset);

  res.json({ items, page, limit });
});

router.get("/characters", async (req, res) => {
  if (!isDbAvailable()) return res.json({ items: [], total: 0 });
  const db = getDb();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const offset = (page - 1) * limit;
  const q = String(req.query.q || "").trim();

  const items = await db
    .select()
    .from(schema.animeCharacters)
    .limit(limit)
    .offset(offset);

  res.json({ items, page, limit });
});

router.get("/users", async (_req, res) => {
  if (!isDbAvailable()) return res.json([]);
  const db = getDb();
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      isGuest: schema.users.isGuest,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users);
  res.json(users);
});

export default router;
