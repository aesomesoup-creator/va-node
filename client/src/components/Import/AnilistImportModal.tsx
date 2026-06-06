import { useState, useRef, useEffect } from "react";
import { getUserCompletedAnime, type AnilistUserAnime } from "../../api/anilist";
import { useGraphStore } from "../../stores/graphStore";
import { useUiStore } from "../../stores/uiStore";
import { useAuthStore } from "../../stores/authStore";
import "./AnilistImportModal.css";

type Phase = "input" | "loading" | "results" | "importing" | "done";

export default function AnilistImportModal() {
  const closeAnilistImport = useUiStore((s) => s.closeAnilistImport);
  const { addAnime, anime: canvasAnime } = useGraphStore();

  const [username, setUsername] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [results, setResults] = useState<AnilistUserAnime[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const canvasIds = new Set(canvasAnime.map((a) => a.anilistId));

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    if (!u) return;
    setPhase("loading");
    setError("");
    try {
      const list = await getUserCompletedAnime(u);
      if (list.length === 0) {
        setError("No completed anime found. Make sure the username is correct and the list is public.");
        setPhase("input");
        return;
      }
      setResults(list);
      setSelected(new Set(list.filter((a) => !canvasIds.has(a.id)).map((a) => a.id)));
      setPhase("results");
    } catch {
      setError("Could not find that AniList user. Check the username and try again.");
      setPhase("input");
    }
  };

  const toggleSelect = (id: number) => {
    if (canvasIds.has(id)) return;
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    const isGuest = useAuthStore.getState().user?.isGuest ?? true;
    const toImport = results.filter((a) => selected.has(a.id));
    setImportTotal(toImport.length);
    setImportProgress(0);
    setPhase("importing");
    let count = 0;
    for (const anime of toImport) {
      try {
        await addAnime(anime.id, isGuest);
      } catch {}
      count++;
      setImportProgress(count);
      if (count < toImport.length) await new Promise((r) => setTimeout(r, 350));
    }
    setImportedCount(count);
    setPhase("done");
  };

  const alreadyAddedCount = results.filter((a) => canvasIds.has(a.id)).length;
  const notAddedCount = results.length - alreadyAddedCount;

  return (
    <div
      className="import-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) closeAnilistImport(); }}
    >
      <div className="import-box">
        <button className="import-close" onClick={closeAnilistImport}>✕</button>

        {/* ── Input / Loading ── */}
        {(phase === "input" || phase === "loading") && (
          <div className="import-input-phase">
            <div className="import-title">Import from AniList</div>
            <div className="import-subtitle">
              Enter your AniList username to import your completed anime list.
            </div>
            <form className="import-form" onSubmit={handleSearch}>
              <input
                ref={inputRef}
                className="import-username-input"
                type="text"
                placeholder="AniList username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={phase === "loading"}
                maxLength={50}
              />
              <button
                className="btn-import-search"
                type="submit"
                disabled={phase === "loading" || !username.trim()}
              >
                {phase === "loading" ? <span className="mini-spinner" /> : "Search"}
              </button>
            </form>
            {error && <div className="import-error">{error}</div>}
          </div>
        )}

        {/* ── Results ── */}
        {phase === "results" && (
          <>
            <div className="import-results-header">
              <div>
                <div className="import-title">Import from AniList</div>
                <div className="import-meta">
                  <strong>{notAddedCount}</strong> to import
                  {alreadyAddedCount > 0 && (
                    <span className="import-meta-added"> · {alreadyAddedCount} already on canvas</span>
                  )}
                </div>
              </div>
              <div className="import-selectors">
                <button
                  className="import-sel-btn"
                  onClick={() => setSelected(new Set(results.filter((a) => !canvasIds.has(a.id)).map((a) => a.id)))}
                >
                  All
                </button>
                <button className="import-sel-btn" onClick={() => setSelected(new Set())}>
                  None
                </button>
              </div>
            </div>

            <div className="import-grid">
              {results.map((anime) => {
                const added = canvasIds.has(anime.id);
                const sel = selected.has(anime.id);
                return (
                  <button
                    key={anime.id}
                    className={`import-card ${added ? "added" : sel ? "selected" : ""}`}
                    onClick={() => toggleSelect(anime.id)}
                    disabled={added}
                    title={anime.title}
                  >
                    <div className="import-card-img-wrap">
                      {anime.coverImage ? (
                        <img src={anime.coverImage} alt={anime.title} className="import-card-cover" />
                      ) : (
                        <div className="import-card-cover import-card-fallback">
                          {anime.title[0]}
                        </div>
                      )}
                      {sel && !added && <div className="import-check">✓</div>}
                      {added && <div className="import-added-badge">✓</div>}
                    </div>
                    <div className="import-card-title">{anime.title}</div>
                  </button>
                );
              })}
            </div>

            <div className="import-footer">
              <button
                className="btn-import-go"
                onClick={handleImport}
                disabled={selected.size === 0}
              >
                Import {selected.size} anime
              </button>
            </div>
          </>
        )}

        {/* ── Importing ── */}
        {phase === "importing" && (
          <div className="import-progress-phase">
            <div className="import-title">Importing...</div>
            <div className="import-prog-track">
              <div
                className="import-prog-fill"
                style={{ width: `${(importProgress / importTotal) * 100}%` }}
              />
            </div>
            <div className="import-prog-label">{importProgress} / {importTotal}</div>
          </div>
        )}

        {/* ── Done ── */}
        {phase === "done" && (
          <div className="import-done-phase">
            <div className="import-done-icon">✓</div>
            <div className="import-title">Done!</div>
            <div className="import-subtitle">
              {importedCount} anime added to your graph.
            </div>
            <button className="btn-import-go" onClick={closeAnilistImport}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
