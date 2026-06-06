import { create } from "zustand";
import type { AnimeEntry, Character, SeiyuuGroup, SeiyuuEdge } from "../types";
import * as api from "../api/client";
import { getAnimeDetail } from "../api/anilist";

// ── Layout constants ─────────────────────────────────────────────────────────
export const ANIME_RADIUS = 56;
export const CHAR_RADIUS = 28;
export const CHAR_LABEL_H = 26;

export function charOrbitPos(index: number, total: number): { x: number; y: number } {
  const minOrbit = Math.max(
    ANIME_RADIUS + CHAR_RADIUS + 24,
    ((CHAR_RADIUS * 2 + 14) * Math.max(total, 1)) / (2 * Math.PI)
  );
  const angle = (2 * Math.PI / Math.max(total, 1)) * index - Math.PI / 2;
  return { x: Math.cos(angle) * minOrbit, y: Math.sin(angle) * minOrbit };
}

// Effective radius of an anime cluster (center bubble + orbit + char bubbles + padding)
function clusterRadius(numChars: number): number {
  const orbit = Math.max(
    ANIME_RADIUS + CHAR_RADIUS + 24,
    ((CHAR_RADIUS * 2 + 14) * Math.max(numChars, 1)) / (2 * Math.PI)
  );
  return orbit + CHAR_RADIUS + 36;
}

// Push overlapping anime clusters apart; returns new positions
function resolvePositions(
  anime: AnimeEntry[],
  charCounts: Map<number, number>
): Array<{ anilistId: number; x: number; y: number }> {
  if (anime.length < 2) return anime.map(a => ({ anilistId: a.anilistId, x: a.positionX, y: a.positionY }));

  const pos = anime.map(a => ({ anilistId: a.anilistId, x: a.positionX, y: a.positionY }));
  const radii = anime.map(a => clusterRadius(charCounts.get(a.anilistId) ?? 0));

  for (let iter = 0; iter < 80; iter++) {
    let moved = false;
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        const minDist = radii[i] + radii[j];
        const dx = pos[j].x - pos[i].x;
        const dy = pos[j].y - pos[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist < minDist) {
          const push = (minDist - dist) * 0.52;
          const nx = dx / dist, ny = dy / dist;
          pos[i].x -= nx * push;
          pos[i].y -= ny * push;
          pos[j].x += nx * push;
          pos[j].y += ny * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return pos;
}

// ── Guest localStorage persistence ──────────────────────────────────────────
const LS_ANIME = "vanode_anime";
const LS_CHARS = "vanode_chars";

function guestLoad(): { anime: AnimeEntry[]; characters: Character[] } {
  try {
    return {
      anime: JSON.parse(localStorage.getItem(LS_ANIME) || "[]"),
      characters: JSON.parse(localStorage.getItem(LS_CHARS) || "[]"),
    };
  } catch { return { anime: [], characters: [] }; }
}

function guestSave(anime: AnimeEntry[], characters: Character[]) {
  try {
    localStorage.setItem(LS_ANIME, JSON.stringify(anime));
    localStorage.setItem(LS_CHARS, JSON.stringify(characters));
  } catch {}
}

// ── Seiyuu group + edge computation ─────────────────────────────────────────
function buildSeiyuuGroups(characters: Character[]): SeiyuuGroup[] {
  const map = new Map<number, Character[]>();
  for (const char of characters) {
    if (!char.seiyuuId) continue;
    const list = map.get(char.seiyuuId) ?? [];
    list.push(char);
    map.set(char.seiyuuId, list);
  }
  return Array.from(map.entries())
    .filter(([, chars]) => new Set(chars.map((c) => c.anilistAnimeId)).size > 1)
    .map(([seiyuuId, chars]) => ({
      seiyuuId,
      seiyuuName: chars[0].seiyuuName ?? null,
      seiyuuImage: chars[0].seiyuuImage ?? null,
      characters: chars,
    }));
}

function computeEdges(seiyuuGroups: SeiyuuGroup[]): { connectedIds: Set<number>; edges: SeiyuuEdge[] } {
  const connectedIds = new Set<number>();
  const edges: SeiyuuEdge[] = [];
  for (const group of seiyuuGroups) {
    const byAnime = new Map<number, Character[]>();
    for (const char of group.characters) {
      const list = byAnime.get(char.anilistAnimeId) ?? [];
      list.push(char);
      byAnime.set(char.anilistAnimeId, list);
    }
    const animeGroups = Array.from(byAnime.values());
    if (animeGroups.length < 2) continue;
    group.characters.forEach((c) => connectedIds.add(c.anilistCharacterId));
    for (let i = 0; i < animeGroups.length; i++) {
      for (let j = i + 1; j < animeGroups.length; j++) {
        edges.push({
          id: `${group.seiyuuId}-${animeGroups[i][0].anilistCharacterId}-${animeGroups[j][0].anilistCharacterId}`,
          fromChar: animeGroups[i][0],
          toChar: animeGroups[j][0],
          seiyuuName: group.seiyuuName,
          seiyuuImage: group.seiyuuImage,
        });
      }
    }
  }
  return { connectedIds, edges };
}

// ── Store ─────────────────────────────────────────────────────────────────────
interface GraphState {
  anime: AnimeEntry[];
  characters: Character[];
  seiyuuGroups: SeiyuuGroup[];
  edges: SeiyuuEdge[];
  connectedCharIds: Set<number>;
  isLoading: boolean;
  isGuest: boolean;
  loadGraph: (isGuest: boolean) => Promise<void>;
  addAnime: (anilistId: number, isGuest: boolean) => Promise<void>;
  removeAnime: (anilistId: number, isGuest: boolean) => Promise<void>;
  updatePosition: (anilistId: number, x: number, y: number) => void;
  persistPosition: (anilistId: number, x: number, y: number) => void;
  resolveCollisions: () => void;
}

function applyCharacters(characters: Character[]) {
  const seiyuuGroups = buildSeiyuuGroups(characters);
  const { connectedIds, edges } = computeEdges(seiyuuGroups);
  return { characters, seiyuuGroups, edges, connectedCharIds: connectedIds };
}

export const useGraphStore = create<GraphState>((set, get) => ({
  anime: [], characters: [], seiyuuGroups: [], edges: [],
  connectedCharIds: new Set(), isLoading: false, isGuest: false,

  loadGraph: async (isGuest) => {
    set({ isLoading: true, isGuest });
    if (isGuest) {
      const { anime, characters } = guestLoad();
      set({ anime, ...applyCharacters(characters), isLoading: false });
      return;
    }
    try {
      const data = await api.getGraph();
      let anime = Array.isArray(data.anime) ? data.anime : [];
      if (anime.length === 0) anime = await api.getMyAnime().catch(() => []);
      const characters = Array.isArray(data.characters) ? data.characters : [];
      const seiyuuGroups = Array.isArray(data.seiyuuGroups) ? data.seiyuuGroups : [];
      const { connectedIds, edges } = computeEdges(seiyuuGroups);
      set({ anime, characters, seiyuuGroups, edges, connectedCharIds: connectedIds, isLoading: false });
    } catch (err) {
      console.error("loadGraph error:", err);
      set({ isLoading: false });
    }
  },

  addAnime: async (anilistId, isGuest) => {
    if (isGuest) {
      const detail = await getAnimeDetail(anilistId);
      const guestId = localStorage.getItem("vanode_guest_id") || crypto.randomUUID();
      const entry: AnimeEntry = {
        id: crypto.randomUUID(),
        userId: guestId,
        anilistId: detail.id,
        title: detail.title,
        coverImage: detail.coverImage,
        positionX: Math.round(Math.random() * 600 + 200),
        positionY: Math.round(Math.random() * 400 + 150),
        addedAt: new Date().toISOString(),
      };
      const newChars: Character[] = detail.characters.map((c) => ({
        id: crypto.randomUUID(),
        anilistAnimeId: detail.id,
        anilistCharacterId: c.id,
        characterName: c.name,
        characterImage: c.image,
        seiyuuId: c.seiyuuId,
        seiyuuName: c.seiyuuName,
        seiyuuImage: c.seiyuuImage,
      }));

      set((s) => {
        const anime = [...s.anime, entry];
        const characters = [...s.characters, ...newChars];
        guestSave(anime, characters);
        return { anime, ...applyCharacters(characters) };
      });

      // Resolve collisions after state update
      setTimeout(() => get().resolveCollisions(), 50);
      return;
    }

    const entry = await api.addAnime(anilistId);
    set((s) => ({ anime: [...s.anime, entry] }));
    api.getGraph().then((data) => {
      if (!data) return;
      const characters = Array.isArray(data.characters) ? data.characters : [];
      const seiyuuGroups = Array.isArray(data.seiyuuGroups) ? data.seiyuuGroups : [];
      const { connectedIds, edges } = computeEdges(seiyuuGroups);
      set({ characters, seiyuuGroups, edges, connectedCharIds: connectedIds });
      setTimeout(() => get().resolveCollisions(), 50);
    }).catch(console.error);
  },

  removeAnime: async (anilistId, isGuest) => {
    if (isGuest) {
      set((s) => {
        const anime = s.anime.filter((a) => a.anilistId !== anilistId);
        const characters = s.characters.filter((c) => c.anilistAnimeId !== anilistId);
        guestSave(anime, characters);
        return { anime, ...applyCharacters(characters) };
      });
      return;
    }
    await api.removeAnime(anilistId);
    set((s) => {
      const anime = s.anime.filter((a) => a.anilistId !== anilistId);
      const characters = s.characters.filter((c) => c.anilistAnimeId !== anilistId);
      const seiyuuGroups = buildSeiyuuGroups(characters);
      const { connectedIds, edges } = computeEdges(seiyuuGroups);
      return { anime, characters, seiyuuGroups, edges, connectedCharIds: connectedIds };
    });
  },

  updatePosition: (anilistId, x, y) =>
    set((s) => {
      const anime = s.anime.map((a) => a.anilistId === anilistId ? { ...a, positionX: x, positionY: y } : a);
      if (get().isGuest) guestSave(anime, s.characters);
      return { anime };
    }),

  persistPosition: (anilistId, x, y) => {
    if (!get().isGuest) api.updateAnimePosition(anilistId, x, y).catch(console.error);
  },

  resolveCollisions: () => {
    const { anime, characters } = get();
    if (anime.length < 2) return;

    const charCounts = new Map<number, number>();
    for (const c of characters) {
      charCounts.set(c.anilistAnimeId, (charCounts.get(c.anilistAnimeId) ?? 0) + 1);
    }

    const resolved = resolvePositions(anime, charCounts);
    const moved = resolved.filter(r => {
      const orig = anime.find(a => a.anilistId === r.anilistId);
      return orig && (Math.abs(orig.positionX - r.x) > 1 || Math.abs(orig.positionY - r.y) > 1);
    });
    if (moved.length === 0) return;

    set(s => ({
      anime: s.anime.map(a => {
        const r = resolved.find(p => p.anilistId === a.anilistId);
        return r ? { ...a, positionX: r.x, positionY: r.y } : a;
      })
    }));

    // Persist new positions for auth users
    if (!get().isGuest) {
      for (const r of moved) {
        api.updateAnimePosition(r.anilistId, r.x, r.y).catch(() => {});
      }
    } else {
      const { anime: newAnime, characters: chars } = get();
      guestSave(newAnime, chars);
    }
  },
}));
