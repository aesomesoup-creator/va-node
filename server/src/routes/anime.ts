import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { requireAuth, getGuestId } from "../middleware/auth.js";
import { getDb, isDbAvailable, schema } from "../db/index.js";
import { searchAnime, getAnimeWithCharacters } from "../services/anilist.js";
import { getGuestData } from "../stores/guestStore.js";

const router = Router();

function getUserId(req: any): string | null {
  if (req.user) return req.user.id;
  return getGuestId(req) ?? null;
}

function isGuest(req: any): boolean {
  return !req.user && Boolean(getGuestId(req));
}

router.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    const results = await searchAnime(q);
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(502).json({ error: "AniList search failed" });
  }
});

router.get("/", requireAuth, async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  if (isGuest(req)) {
    return res.json(getGuestData(userId).anime);
  }

  if (!isDbAvailable()) return res.json([]);
  const db = getDb();
  const anime = await db.select().from(schema.userAnime).where(eq(schema.userAnime.userId, userId));
  res.json(anime);
});

router.get("/:anilistId/characters", requireAuth, async (req: any, res) => {
  const anilistId = Number(req.params.anilistId);
  const userId = getUserId(req);

  if (isGuest(req) && userId) {
    const chars = getGuestData(userId).characters.filter((c: any) => c.anilistAnimeId === anilistId);
    return res.json(chars);
  }

  if (!isDbAvailable()) return res.json([]);
  const db = getDb();
  const chars = await db.select().from(schema.animeCharacters).where(eq(schema.animeCharacters.anilistAnimeId, anilistId));
  res.json(chars);
});

router.post("/", requireAuth, async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Not authenticated" });

  const { anilistId } = req.body as { anilistId: number };
  if (!anilistId) return res.status(400).json({ error: "anilistId required" });

  try {
    const detail = await getAnimeWithCharacters(anilistId);

    const animeEntry = {
      userId,
      anilistId: detail.id,
      title: detail.title,
      coverImage: detail.coverImage,
      positionX: Math.round(Math.random() * 600 + 100),
      positionY: Math.round(Math.random() * 400 + 100),
    };

    const charEntries = detail.characters.map((c) => ({
      anilistAnimeId: detail.id,
      anilistCharacterId: c.id,
      characterName: c.name,
      characterImage: c.image,
      seiyuuId: c.seiyuuId,
      seiyuuName: c.seiyuuName,
      seiyuuImage: c.seiyuuImage,
    }));

    if (isGuest(req)) {
      const data = getGuestData(userId);
      if (data.anime.some((a: any) => a.anilistId === detail.id)) {
        return res.status(409).json({ error: "Already added" });
      }
      const entry = { id: crypto.randomUUID(), addedAt: new Date(), ...animeEntry };
      data.anime.push(entry);
      data.characters.push(...charEntries.map((c) => ({ id: crypto.randomUUID(), ...c })));
      return res.json(entry);
    }

    if (!isDbAvailable()) return res.status(503).json({ error: "Database not configured" });
    const db = getDb();
    const [inserted] = await db.insert(schema.userAnime).values(animeEntry).onConflictDoNothing().returning();
    if (!inserted) return res.status(409).json({ error: "Already added" });
    if (charEntries.length > 0) await db.insert(schema.animeCharacters).values(charEntries).onConflictDoNothing();
    res.json(inserted);
  } catch (err) {
    console.error("Add anime error:", err);
    res.status(502).json({ error: "Failed to fetch anime data" });
  }
});

router.delete("/:anilistId", requireAuth, async (req: any, res) => {
  const anilistId = Number(req.params.anilistId);
  const userId = getUserId(req);

  if (isGuest(req) && userId) {
    const data = getGuestData(userId);
    data.anime = data.anime.filter((a: any) => a.anilistId !== anilistId);
    data.characters = data.characters.filter((c: any) => c.anilistAnimeId !== anilistId);
    return res.json({ ok: true });
  }

  if (!isDbAvailable()) return res.json({ ok: true });
  const db = getDb();
  await db.delete(schema.userAnime).where(and(eq(schema.userAnime.userId, userId!), eq(schema.userAnime.anilistId, anilistId)));
  res.json({ ok: true });
});

router.patch("/:anilistId/position", requireAuth, async (req: any, res) => {
  const anilistId = Number(req.params.anilistId);
  const { x, y } = req.body as { x: number; y: number };
  const userId = getUserId(req);

  if (isGuest(req) && userId) {
    const data = getGuestData(userId);
    const a = data.anime.find((a: any) => a.anilistId === anilistId);
    if (a) { a.positionX = x; a.positionY = y; }
    return res.json({ ok: true });
  }

  if (!isDbAvailable()) return res.json({ ok: true });
  const db = getDb();
  await db.update(schema.userAnime).set({ positionX: x, positionY: y })
    .where(and(eq(schema.userAnime.userId, userId!), eq(schema.userAnime.anilistId, anilistId)));
  res.json({ ok: true });
});

export default router;
