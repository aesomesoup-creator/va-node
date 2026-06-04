import axios from "axios";
import type { AnimeEntry, AnilistSearchResult, GraphData, User, Character } from "../types";

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const api = axios.create({ baseURL: BASE, withCredentials: true });

// Auth (server only — guests don't need this)
export const getMe = () =>
  api.get<{ user: User | null }>("/auth/me").then((r) => r.data);
export const logout = () => api.post("/auth/logout");

// Anime — server API for authenticated users only
export const searchAnime = (q: string) =>
  api.get<AnilistSearchResult[]>("/anime/search", { params: { q } }).then((r) => r.data);
export const getMyAnime = () =>
  api.get<AnimeEntry[]>("/anime").then((r) => r.data);
export const addAnime = (anilistId: number) =>
  api.post<AnimeEntry>("/anime", { anilistId }).then((r) => r.data);
export const removeAnime = (anilistId: number) =>
  api.delete(`/anime/${anilistId}`);
export const updateAnimePosition = (anilistId: number, x: number, y: number) =>
  api.patch(`/anime/${anilistId}/position`, { x, y });
export const getAnimeCharacters = (anilistId: number) =>
  api.get<Character[]>(`/anime/${anilistId}/characters`).then((r) => r.data);

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
