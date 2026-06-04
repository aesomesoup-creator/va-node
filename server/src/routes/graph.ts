import { Router } from "express";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { getDb, isDbAvailable, schema } from "../db/index.js";
import { getGuestData } from "../stores/guestStore.js";

const router = Router();

function buildSeiyuuGroups(characters: any[]) {
  const seiyuuMap = new Map<number, any[]>();
  for (const char of characters) {
    if (!char.seiyuuId) continue;
    if (!seiyuuMap.has(char.seiyuuId)) seiyuuMap.set(char.seiyuuId, []);
    seiyuuMap.get(char.seiyuuId)!.push(char);
  }

  return Array.from(seiyuuMap.entries())
    .filter(([, chars]) => new Set(chars.map((c: any) => c.anilistAnimeId)).size > 1)
    .map(([seiyuuId, chars]) => ({
      seiyuuId,
      seiyuuName: chars[0].seiyuuName,
      seiyuuImage: chars[0].seiyuuImage,
      characters: chars,
    }));
}

router.get("/", requireAuth, async (req: any, res) => {
  try {
    // ── Guest path ─────────────────────────────────────────────────────────
    if (req.session?.guestId && !req.user) {
      const data = getGuestData(req.session.guestId);
      const seiyuuGroups = buildSeiyuuGroups(data.characters);
      const connectedIds = new Set(
        seiyuuGroups.flatMap((g) => g.characters.map((c: any) => c.anilistCharacterId))
      );
      const filteredChars = data.characters.filter((c: any) =>
        connectedIds.has(c.anilistCharacterId)
      );
      return res.json({ anime: data.anime, characters: filteredChars, seiyuuGroups });
    }

    // ── Authenticated path ─────────────────────────────────────────────────
    if (!isDbAvailable()) return res.json({ anime: [], characters: [], seiyuuGroups: [] });

    const userId = req.user?.id;
    const db = getDb();

    const animeList = await db
      .select()
      .from(schema.userAnime)
      .where(eq(schema.userAnime.userId, userId));

    if (animeList.length === 0) {
      return res.json({ anime: animeList, characters: [], seiyuuGroups: [] });
    }

    const anilistIds = animeList.map((a) => a.anilistId);
    const characters = await db
      .select()
      .from(schema.animeCharacters)
      .where(inArray(schema.animeCharacters.anilistAnimeId, anilistIds));

    const seiyuuGroups = buildSeiyuuGroups(characters);
    const connectedIds = new Set(
      seiyuuGroups.flatMap((g) => g.characters.map((c) => c.anilistCharacterId))
    );
    const filteredChars = characters.filter((c) => connectedIds.has(c.anilistCharacterId));

    res.json({ anime: animeList, characters: filteredChars, seiyuuGroups });
  } catch (err) {
    console.error("Graph error:", err);
    res.status(500).json({ error: "Failed to build graph" });
  }
});

export default router;
