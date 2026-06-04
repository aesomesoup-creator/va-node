import { create } from "zustand";

interface UiState {
  showAnimePanel: boolean;
  showSearch: boolean;
  showAdmin: boolean;
  showLogin: boolean;
  hoveredSeiyuuId: number | null;
  toggleAnimePanel: () => void;
  toggleSearch: () => void;
  toggleAdmin: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  setHoveredSeiyuu: (id: number | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  showAnimePanel: false,
  showSearch: false,
  showAdmin: false,
  showLogin: false,
  hoveredSeiyuuId: null,

  toggleAnimePanel: () => set((s) => ({ showAnimePanel: !s.showAnimePanel })),
  toggleSearch: () => set((s) => ({ showSearch: !s.showSearch })),
  toggleAdmin: () => set((s) => ({ showAdmin: !s.showAdmin })),
  openLogin: () => set({ showLogin: true }),
  closeLogin: () => set({ showLogin: false }),
  setHoveredSeiyuu: (id) => set({ hoveredSeiyuuId: id }),
}));
