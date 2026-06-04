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
      if (data.user) {
        set({ user: data.user, isLoading: false });
        return;
      }
    } catch {
      // server unreachable or not logged in
    }

    // Auto-restore guest session from localStorage
    const guestId = api.getOrCreateGuestId();
    set({
      user: { id: guestId, name: "Guest", isGuest: true },
      isLoading: false,
    });
  },

  loginAsGuest: async () => {
    // Guest ID is already in localStorage — just set the user state
    const guestId = api.getOrCreateGuestId();
    // Notify server to acknowledge this guest (optional, fire-and-forget)
    api.loginAsGuest().catch(() => {});
    set({ user: { id: guestId, name: "Guest", isGuest: true } });
  },

  logout: async () => {
    await api.logout().catch(() => {});
    api.clearGuestId();
    set({ user: null });
  },
}));
