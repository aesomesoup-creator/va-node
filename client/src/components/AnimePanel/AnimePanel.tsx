import { useUiStore } from "../../stores/uiStore";
import { useGraphStore } from "../../stores/graphStore";
import "./AnimePanel.css";

export default function AnimePanel() {
  const { showAnimePanel, toggleAnimePanel } = useUiStore();
  const { anime, removeAnime, edges, seiyuuGroups } = useGraphStore();

  if (!showAnimePanel) return null;

  const seiyuuCount = seiyuuGroups.length;
  const edgeCount = edges.length;

  return (
    <div className="modal-overlay" onClick={toggleAnimePanel}>
      <div className="anime-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="panel-title">◈ My Anime</h2>
          <button className="modal-close" onClick={toggleAnimePanel}>✕</button>
        </div>

        <div className="panel-stats">
          <div className="stat">
            <span className="stat-value">{anime.length}</span>
            <span className="stat-label">Anime</span>
          </div>
          <div className="stat">
            <span className="stat-value">{seiyuuCount}</span>
            <span className="stat-label">Shared VA</span>
          </div>
          <div className="stat">
            <span className="stat-value">{edgeCount}</span>
            <span className="stat-label">Links</span>
          </div>
        </div>

        {anime.length === 0 ? (
          <div className="panel-empty">
            <span>No anime added yet.</span>
            <p>Use "Add Anime" to start building your graph.</p>
          </div>
        ) : (
          <div className="panel-list">
            {anime.map((a) => {
              const charCount = seiyuuGroups.flatMap((g) => g.characters).filter((c) => c.anilistAnimeId === a.anilistId).length;
              return (
                <div key={a.anilistId} className="panel-item">
                  {a.coverImage && (
                    <img src={a.coverImage} alt={a.title} className="panel-cover" />
                  )}
                  <div className="panel-info">
                    <span className="panel-name">{a.title}</span>
                    <span className="panel-meta">{charCount} connected characters</span>
                  </div>
                  <button
                    className="btn-remove"
                    onClick={() => removeAnime(a.anilistId)}
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {seiyuuGroups.length > 0 && (
          <div className="panel-section">
            <h3 className="panel-section-title">Shared Voice Actors</h3>
            <div className="panel-seiyuu-list">
              {seiyuuGroups.map((g) => (
                <div key={g.seiyuuId} className="seiyuu-item">
                  {g.seiyuuImage && (
                    <img src={g.seiyuuImage} alt={g.seiyuuName ?? ""} className="seiyuu-img" />
                  )}
                  <div className="seiyuu-info">
                    <span className="seiyuu-name">{g.seiyuuName || "Unknown VA"}</span>
                    <span className="seiyuu-roles">
                      {g.characters.map((c) => c.characterName).join(", ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
