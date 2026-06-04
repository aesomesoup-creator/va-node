import { useState, useRef, useEffect, useCallback } from "react";
import { searchAnilist, getAnimeDetail, type AnilistResult } from "../../api/anilist";
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
  const { showSearch, toggleSearch, isQuizMode, openQuiz, anime: canvasAnime } = useUiStore() as any;
  const { showSearch: show, isQuizMode: quizMode, toggleSearch: close, openQuiz: startQuiz } = useUiStore();
  const { addAnime, anime: myAnime } = useGraphStore();
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AnilistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (show) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults([]); setError(null); }
  }, [show]);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return; }
    setLoading(true);
    setError(null);
    searchAnilist(debouncedQuery)
      .then((r) => { setResults(r); setLoading(false); })
      .catch(() => { setError("Search failed — check your internet connection."); setLoading(false); });
  }, [debouncedQuery]);

  const handleAdd = useCallback(async (id: number) => {
    setActing(id);
    setError(null);
    try {
      const isGuest = useAuthStore.getState().user?.isGuest ?? true;
      await addAnime(id, isGuest);
      close();
    } catch (err: any) {
      if (err.response?.status === 409) setError("This anime is already in your graph.");
      else setError("Could not fetch anime data. Check your internet connection.");
    } finally {
      setActing(null);
    }
  }, [addAnime, close]);

  const handleQuiz = useCallback(async (id: number) => {
    setActing(id);
    setError(null);
    try {
      const detail = await getAnimeDetail(id);
      startQuiz(detail);
    } catch {
      setError("Could not fetch anime data. Check your internet connection.");
    } finally {
      setActing(null);
    }
  }, [startQuiz]);

  const myAnimeIds = new Set(myAnime.map((a) => a.anilistId));

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-header">
          <span className="search-icon">{quizMode ? "🎯" : "🔍"}</span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder={quizMode
              ? "Search anime to quiz yourself on…"
              : "Search anime — e.g. Fullmetal, Demon Slayer…"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && close()}
          />
          {loading && <div className="search-spinner" />}
          <button className="modal-close" onClick={close}>✕</button>
        </div>

        {quizMode && (
          <div className="search-quiz-banner">
            🎯 Quiz mode — pick an anime to test your VA knowledge
          </div>
        )}
        {error && <div className="search-error">{error}</div>}

        <div className="search-results">
          {results.length === 0 && !loading && query && (
            <div className="search-empty">No results for "{query}"</div>
          )}
          {results.length === 0 && !query && (
            <div className="search-hint">
              {quizMode
                ? <p>Search an anime — its characters with shared VAs will become quiz questions.</p>
                : <><p>Search for any anime to add it to your VAnode graph.</p>
                    <p>Characters with shared voice actors will be automatically connected.</p></>}
            </div>
          )}

          {results.map((anime) => {
            const added = myAnimeIds.has(anime.id);
            return (
              <div key={anime.id} className={`search-result${added ? " added" : ""}`}>
                <img src={anime.coverImage.large || anime.coverImage.medium}
                  alt={anime.title.romaji} className="result-cover" />
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
                {quizMode ? (
                  <button
                    className="btn-add btn-quiz-start"
                    disabled={acting === anime.id}
                    onClick={() => handleQuiz(anime.id)}
                  >
                    {acting === anime.id ? <span className="mini-spinner" /> : "🎯 Quiz"}
                  </button>
                ) : (
                  <button
                    className={`btn-add${added ? " btn-added" : ""}`}
                    disabled={added || acting === anime.id}
                    onClick={() => !added && handleAdd(anime.id)}
                  >
                    {acting === anime.id ? <span className="mini-spinner" /> : added ? "Added ✓" : "+ Add"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
