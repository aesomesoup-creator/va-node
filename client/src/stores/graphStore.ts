import { create } from "zustand";
import type { AnimeEntry, Character, SeiyuuGroup, SeiyuuEdge } from "../types";
import * as api from "../api/client";

// Layout constants — must match AnimeBubble render
export const BUBBLE_WIDTH = 280;
export const BUBBLE_HEADER_H = 70; // cover(48) + padding(10+10) + border(2)
export const CHAR_SIZE = 52;
export const CHAR_GAP = 8;
export const BUBBLE_PADDING = 14;
export const COLS = 3;

export function charRelativePos(index: number) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: BUBBLE_PADDING + col * (CHAR_SIZE + CHAR_GAP) + CHAR_SIZE / 2,
    y: BUBBLE_HEADER_H + BUBBLE_PADDING + row * (CHAR_SIZE + CHAR_GAP) + CHAR_SIZE / 2,
  };
}

// Compute which characters have cross-anime seiyuu links and build edges
function computeEdges(seiyuuGroups: SeiyuuGroup[]): { connectedIds: Set<number>; edges: SeiyuuEdge[] } {
  const connectedIds = new Set<number>();
  const edges: SeiyuuEdge[] = [];

  for (const group of seiyuuGroups) {
    // Group characters by anime
    const byAnime = new Map<number, Character[]>();
    for (const char of group.characters) {
      const list = byAnime.get(char.anilistAnimeId) ?? [];
      list.push(char);
      byAnime.set(char.anilistAnimeId, list);
    }
    const animeGroups = Array.from(byAnime.values());
    if (animeGroups.length < 2) continue;

    // Mark all as connected
    group.characters.forEach((c) => connectedIds.add(c.anilistCharacterId));

    // Create one edge per pair of anime groups (using first char from each)
    for (let i = 0; i < animeGroups.length; i++) {
      for (let j = i + 1; j < animeGroups.length; j++) {
        const fromChar = animeGroups[i][0];
        const toChar = animeGroups[j][0];
        edges.push({
          id: `${group.seiyuuId}-${fromChar.anilistCharacterId}-${toChar.anilistCharacterId}`,
          fromChar,
          toChar,
          seiyuuName: group.seiyuuName,
          seiyuuImage: group.seiyuuImage,
        });
      }
    }
  }
  return { connectedIds, edges };
}

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
  anime: [],
  characters: [],
  seiyuuGroups: [],
  edges: [],
  connectedCharIds: new Set(),
  isLoading: false,

  loadGraph: async () => {
    set({ isLoading: true });
    try {
      const data = await api.getGraph();
      // If graph route returned empty (guest), fall back to anime list
      let anime = data.anime;
      if (anime.length === 0) {
        anime = await api.getMyAnime();
      }
      const { connectedIds, edges } = computeEdges(data.seiyuuGroups);
      set({
        anime,
        characters: data.characters,
        seiyuuGroups: data.seiyuuGroups,
        edges,
        connectedCharIds: connectedIds,
        isLoading: false,
      });
    } catch (err) {
      console.error("loadGraph error:", err);
      set({ isLoading: false });
    }
  },

  addAnime: async (anilistId) => {
    const entry = await api.addAnime(anilistId);
    set((s) => ({ anime: [...s.anime, entry] }));
    // Reload full graph to get new characters and recompute edges
    await get().loadGraph();
  },

  removeAnime: async (anilistId) => {
    await api.removeAnime(anilistId);
    set((s) => {
      const anime = s.anime.filter((a) => a.anilistId !== anilistId);
      const characters = s.characters.filter((c) => c.anilistAnimeId !== anilistId);
      const seiyuuGroups = s.seiyuuGroups
        .map((g) => ({ ...g, characters: g.characters.filter((c) => c.anilistAnimeId !== anilistId) }))
        .filter((g) => {
          const distinctAnime = new Set(g.characters.map((c) => c.anilistAnimeId));
          return distinctAnime.size > 1;
        });
      const { connectedIds, edges } = computeEdges(seiyuuGroups);
      return { anime, characters, seiyuuGroups, edges, connectedCharIds: connectedIds };
    });
  },

  updatePosition: (anilistId, x, y) => {
    set((s) => ({
      anime: s.anime.map((a) => (a.anilistId === anilistId ? { ...a, positionX: x, positionY: y } : a)),
    }));
  },

  persistPosition: (anilistId, x, y) => {
    api.updateAnimePosition(anilistId, x, y).catch(console.error);
  },
}));
