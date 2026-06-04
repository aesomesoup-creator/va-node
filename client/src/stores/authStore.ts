import { create } from "zustand";
import type { User } from "../types";
import * as api from "../api/client";

const GUEST_KEY = "vanode_guest_id";

function getOrCreateGuestId(): string {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(GUEST_KEY, id); }
  return id;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  init: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  init: async () => {
    // Try to restore authenticated session
    try {
      const data = await api.getMe();
      if (data.user) {
        set({ user: data.user, isLoading: false });
        return;
      }
    } catch { /* server unreachable — fall back to guest */ }

    // Guest: always available, no server needed
    const guestId = getOrCreateGuestId();
    set({ user: { id: guestId, name: "Guest", isGuest: true }, isLoading: false });
  },

  logout: async () => {
    await api.logout().catch(() => {});
    set({ user: null });
  },
}));
