import { useState, useRef, useEffect, useCallback } from "react";
import { searchAnilist, type AnilistResult } from "../../api/anilist";
import { useGraphStore } from "../../stores/graphStore";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";

import "./SearchBar.css";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchBar() {
  const { showSearch, toggleSearch } = useUiStore();
  const { addAnime, anime: myAnime } = useGraphStore();
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnilistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (showSearch) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults([]); setError(null); }
  }, [showSearch]);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    searchAnilist(debouncedQuery)
      .then((r) => { setResults(r); setLoading(false); })
      .catch(() => { setError("Search failed — check your internet connection."); setLoading(false); });
  }, [debouncedQuery]);

  const handleAdd = useCallback(async (id: number) => {
    setAdding(id);
    setError(null);
    try {
      const isGuest = useAuthStore.getState().user?.isGuest ?? true;
      await addAnime(id, isGuest);
      toggleSearch();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError("This anime is already in your graph.");
      } else if (!err.response) {
        setError("Could not fetch anime data. Check your internet connection.");
      } else {
        setError(err?.response?.data?.error || "Failed to add anime. Is the server running?");
      }
    } finally {
      setAdding(null);
    }
  }, [addAnime, toggleSearch]);

  const myAnimeIds = new Set(myAnime.map((a) => a.anilistId));

  if (!showSearch) return null;

  return (
    <div className="modal-overlay" onClick={toggleSearch}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search anime — e.g. Fullmetal, Demon Slayer…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && toggleSearch()}
          />
          {loading && <div className="search-spinner" />}
          <button className="modal-close" onClick={toggleSearch}>✕</button>
        </div>

        {error && <div className="search-error">{error}</div>}

        <div className="search-results">
          {results.length === 0 && !loading && query && (
            <div className="search-empty">No results for "{query}"</div>
          )}
          {results.length === 0 && !query && (
            <div className="search-hint">
              <p>Search for any anime to add it to your VAnode graph.</p>
              <p>Characters with shared voice actors will be automatically connected.</p>
            </div>
          )}

          {results.map((anime) => {
            const added = myAnimeIds.has(anime.id);
            return (
              <div key={anime.id} className={`search-result${added ? " added" : ""}`}>
                <img
                  src={anime.coverImage.large || anime.coverImage.medium}
                  alt={anime.title.romaji}
                  className="result-cover"
                />
                <div className="result-info">
                  <span className="result-title">{anime.title.english || anime.title.romaji}</span>
                  {anime.title.romaji !== (anime.title.english || anime.title.romaji) && (
                    <span className="result-sub">{anime.title.romaji}</span>
                  )}
                  <div className="result-meta">
                    {anime.seasonYear && <span>{anime.seasonYear}</span>}
                    {anime.episodes && <span>{anime.episodes} eps</span>}
                    <span className="result-status">{anime.status.replace(/_/g, " ").toLowerCase()}</span>
                  </div>
                </div>
                <button
                  className={`btn-add${added ? " btn-added" : ""}`}
                  disabled={added || adding === anime.id}
                  onClick={() => !added && handleAdd(anime.id)}
                >
                  {adding === anime.id ? (
                    <span className="mini-spinner" />
                  ) : added ? "Added ✓" : "+ Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
