import { create } from "zustand";

interface UiState {
  showAnimePanel: boolean;
  showSearch: boolean;
  showAdmin: boolean;
  showLogin: boolean;
  hoveredAnimeId: number | null;
  hoveredCharId: number | null;        // specific character being hovered
  toggleAnimePanel: () => void;
  toggleSearch: () => void;
  toggleAdmin: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  setHoveredAnime: (id: number | null) => void;
  setHoveredChar: (charId: number | null) => void;
  // legacy (CharNode still uses this for orbit highlighting)
  hoveredSeiyuuId: number | null;
  setHoveredSeiyuu: (id: number | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  showAnimePanel: false,
  showSearch: false,
  showAdmin: false,
  showLogin: false,
  hoveredAnimeId: null,
  hoveredCharId: null,
  hoveredSeiyuuId: null,

  toggleAnimePanel: () => set((s) => ({ showAnimePanel: !s.showAnimePanel })),
  toggleSearch:     () => set((s) => ({ showSearch: !s.showSearch })),
  toggleAdmin:      () => set((s) => ({ showAdmin: !s.showAdmin })),
  openLogin:        () => set({ showLogin: true }),
  closeLogin:       () => set({ showLogin: false }),
  setHoveredAnime:  (id) => set({ hoveredAnimeId: id, hoveredCharId: null }),
  setHoveredChar:   (charId) => set({ hoveredCharId: charId, hoveredAnimeId: null }),
  setHoveredSeiyuu: (id) => set({ hoveredSeiyuuId: id }),
}));
