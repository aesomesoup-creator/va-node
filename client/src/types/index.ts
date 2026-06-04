export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  isGuest: boolean;
}

export interface AnimeEntry {
  id: string;
  userId: string;
  anilistId: number;
  title: string;
  coverImage?: string;
  positionX: number;
  positionY: number;
  addedAt: string;
}

export interface Character {
  id: string;
  anilistAnimeId: number;
  anilistCharacterId: number;
  characterName: string;
  characterImage?: string;
  seiyuuId?: number;
  seiyuuName?: string;
  seiyuuImage?: string;
}

export interface SeiyuuGroup {
  seiyuuId: number;
  seiyuuName: string | null;
  seiyuuImage: string | null;
  characters: Character[];
}

export interface GraphData {
  anime: AnimeEntry[];
  characters: Character[];
  seiyuuGroups: SeiyuuGroup[];
}

export interface AnilistSearchResult {
  id: number;
  title: { romaji: string; english?: string; native?: string };
  coverImage: { large: string; medium: string };
  episodes?: number;
  status: string;
  seasonYear?: number;
  genres: string[];
}

// Canvas types
export interface Vec2 {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scale: number;
}

// Character position within a bubble (relative coords)
export interface CharNodePosition {
  charId: number;
  animeId: number;
  relX: number;
  relY: number;
}

// Resolved edge between two characters
export interface SeiyuuEdge {
  id: string;
  fromChar: Character;
  toChar: Character;
  seiyuuName: string | null;
  seiyuuImage: string | null;
}
