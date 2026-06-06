import { create } from "zustand";
import type { AnimeDetailRaw } from "../api/anilist";

interface UiState {
  showAnimePanel: boolean;
  showSearch: boolean;
  showAdmin: boolean;
  showLogin: boolean;
  isQuizMode: boolean;
  quizAnime: AnimeDetailRaw | null;
  showQuiz: boolean;
  showVaQuiz: boolean;
  showAnilistImport: boolean;
  hoveredAnimeId: number | null;
  hoveredCharId: number | null;
  hoveredSeiyuuId: number | null;

  toggleAnimePanel: () => void;
  toggleSearch: () => void;
  openSearchForQuiz: () => void;
  toggleAdmin: () => void;
  openLogin: () => void;
  closeLogin: () => void;
  setHoveredAnime: (id: number | null) => void;
  setHoveredChar: (charId: number | null) => void;
  setHoveredSeiyuu: (id: number | null) => void;
  openQuiz: (anime: AnimeDetailRaw) => void;
  closeQuiz: () => void;
  openVaQuiz: () => void;
  closeVaQuiz: () => void;
  openAnilistImport: () => void;
  closeAnilistImport: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  showAnimePanel: false,
  showSearch: false,
  showAdmin: false,
  showLogin: false,
  isQuizMode: false,
  quizAnime: null,
  showQuiz: false,
  showVaQuiz: false,
  showAnilistImport: false,
  hoveredAnimeId: null,
  hoveredCharId: null,
  hoveredSeiyuuId: null,

  toggleAnimePanel:   () => set((s) => ({ showAnimePanel: !s.showAnimePanel })),
  toggleSearch:       () => set((s) => ({ showSearch: !s.showSearch, isQuizMode: false })),
  openSearchForQuiz:  () => set({ showSearch: true, isQuizMode: true }),
  toggleAdmin:        () => set((s) => ({ showAdmin: !s.showAdmin })),
  openLogin:          () => set({ showLogin: true }),
  closeLogin:         () => set({ showLogin: false }),
  setHoveredAnime:    (id) => set({ hoveredAnimeId: id, hoveredCharId: null }),
  setHoveredChar:     (charId) => set({ hoveredCharId: charId, hoveredAnimeId: null }),
  setHoveredSeiyuu:   (id) => set({ hoveredSeiyuuId: id }),
  openQuiz:           (anime) => set({ quizAnime: anime, showQuiz: true, showSearch: false }),
  closeQuiz:          () => set({ quizAnime: null, showQuiz: false, isQuizMode: false }),
  openVaQuiz:         () => set({ showVaQuiz: true }),
  closeVaQuiz:        () => set({ showVaQuiz: false }),
  openAnilistImport:  () => set({ showAnilistImport: true }),
  closeAnilistImport: () => set({ showAnilistImport: false }),
}));
