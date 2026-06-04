// Shared in-memory store for guest sessions
// Used by both anime.ts and graph.ts routes

interface GuestData {
  anime: any[];
  characters: any[];
}

const store = new Map<string, GuestData>();

export function getGuestData(guestId: string): GuestData {
  if (!store.has(guestId)) {
    store.set(guestId, { anime: [], characters: [] });
  }
  return store.get(guestId)!;
}
