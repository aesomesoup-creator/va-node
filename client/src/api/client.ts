import axios from "axios";
import type { AnimeEntry, AnilistSearchResult, GraphData, User, Character } from "../types";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Auth
export const getMe = () =>
  api.get<{ user: User | null; isGuest?: boolean }>("/auth/me").then((r) => r.data);

export const loginAsGuest = () =>
  api.post<{ user: User }>("/auth/guest").then((r) => r.data.user);

export const logout = () => api.post("/auth/logout");

// Anime
export const searchAnime = (q: string) =>
  api.get<AnilistSearchResult[]>("/anime/search", { params: { q } }).then((r) => r.data);

export const getMyAnime = () =>
  api.get<AnimeEntry[]>("/anime").then((r) => r.data);

export const getAnimeCharacters = (anilistId: number) =>
  api.get<Character[]>(`/anime/${anilistId}/characters`).then((r) => r.data);

export const addAnime = (anilistId: number) =>
  api.post<AnimeEntry>("/anime", { anilistId }).then((r) => r.data);

export const removeAnime = (anilistId: number) =>
  api.delete(`/anime/${anilistId}`);

export const updateAnimePosition = (anilistId: number, x: number, y: number) =>
  api.patch(`/anime/${anilistId}/position`, { x, y });

// Graph
export const getGraph = () =>
  api.get<GraphData>("/graph").then((r) => r.data);

// Admin
export const adminGetAnime = (page = 1) =>
  api.get("/admin/anime", { params: { page } }).then((r) => r.data);

export const adminGetCharacters = (page = 1) =>
  api.get("/admin/characters", { params: { page } }).then((r) => r.data);

export const adminGetUsers = () =>
  api.get("/admin/users").then((r) => r.data);
