import { create } from "zustand";
import type { User } from "../types";
import * as api from "../api/client";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  init: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  init: async () => {
    try {
      const data = await api.getMe();
      set({ user: data.user, isLoading: false });
    } catch {
      set({ user: null, isLoading: false });
    }
  },

  loginAsGuest: async () => {
    const user = await api.loginAsGuest();
    set({ user });
  },

  logout: async () => {
    await api.logout();
    set({ user: null });
  },
}));
