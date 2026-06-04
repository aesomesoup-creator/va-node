import { create } from "zustand";
import type { AnimeEntry, Character, SeiyuuGroup, SeiyuuEdge } from "../types";
import * as api from "../api/client";

// ── Layout constants ─────────────────────────────────────────────────────────
export const ANIME_RADIUS = 56;  // anime center circle radius
export const CHAR_RADIUS = 28;   // character orbit circle radius
export const CHAR_LABEL_H = 26;  // space below char for name

/** Character position relative to anime center (circular orbit). */
export function charOrbitPos(index: number, total: number): { x: number; y: number } {
  const minOrbit = Math.max(
    ANIME_RADIUS + CHAR_RADIUS + 24,
    ((CHAR_RADIUS * 2 + 14) * Math.max(total, 1)) / (2 * Math.PI)
  );
  const angle = (2 * Math.PI / Math.max(total, 1)) * index - Math.PI / 2;
  return { x: Math.cos(angle) * minOrbit, y: Math.sin(angle) * minOrbit };
}

// ── Edge computation ─────────────────────────────────────────────────────────
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
  loadGraph: () => Promise<void>;
  addAnime: (anilistId: number) => Promise<void>;
  removeAnime: (anilistId: number) => Promise<void>;
  updatePosition: (anilistId: number, x: number, y: number) => void;
  persistPosition: (anilistId: number, x: number, y: number) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  anime: [], characters: [], seiyuuGroups: [], edges: [], connectedCharIds: new Set(), isLoading: false,

  loadGraph: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getGraph();
      let anime = data.anime;
      if (anime.length === 0) anime = await api.getMyAnime();
      const { connectedIds, edges } = computeEdges(data.seiyuuGroups);
      set({ anime, characters: data.characters, seiyuuGroups: data.seiyuuGroups, edges, connectedCharIds: connectedIds, isLoading: false });
    } catch (err) {
      console.error("loadGraph error:", err);
      set({ isLoading: false });
    }
  },

  addAnime: async (anilistId) => {
    const entry = await api.addAnime(anilistId);
    // Show immediately (optimistic), then reload for seiyuu connections
    set((s) => ({ anime: [...s.anime, entry] }));
    get().loadGraph().catch(console.error);
  },

  removeAnime: async (anilistId) => {
    await api.removeAnime(anilistId);
    set((s) => {
      const anime = s.anime.filter((a) => a.anilistId !== anilistId);
      const characters = s.characters.filter((c) => c.anilistAnimeId !== anilistId);
      const seiyuuGroups = s.seiyuuGroups
        .map((g) => ({ ...g, characters: g.characters.filter((c) => c.anilistAnimeId !== anilistId) }))
        .filter((g) => new Set(g.characters.map((c) => c.anilistAnimeId)).size > 1);
      const { connectedIds, edges } = computeEdges(seiyuuGroups);
      return { anime, characters, seiyuuGroups, edges, connectedCharIds: connectedIds };
    });
  },

  updatePosition: (anilistId, x, y) =>
    set((s) => ({ anime: s.anime.map((a) => a.anilistId === anilistId ? { ...a, positionX: x, positionY: y } : a) })),

  persistPosition: (anilistId, x, y) =>
    api.updateAnimePosition(anilistId, x, y).catch(console.error),
}));
