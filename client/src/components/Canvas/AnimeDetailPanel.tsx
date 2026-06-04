import { useEffect, useState } from "react";
import { getAnimeCharacters } from "../../api/client";
import { useGraphStore } from "../../stores/graphStore";
import { useAuthStore } from "../../stores/authStore";
import type { AnimeEntry, Character } from "../../types";
import "./AnimeDetailPanel.css";

interface Props {
  anime: AnimeEntry;
  onClose: () => void;
}

export default function AnimeDetailPanel({ anime, onClose }: Props) {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { isGuest, characters: storeChars, removeAnime } = useGraphStore();
  const { user } = useAuthStore();

  useEffect(() => {
    setLoading(true);
    setError(null);
    if (isGuest) {
      setCharacters(storeChars.filter((c) => c.anilistAnimeId === anime.anilistId));
      setLoading(false);
      return;
    }
    getAnimeCharacters(anime.anilistId)
      .then((chars) => { setCharacters(Array.isArray(chars) ? chars : []); setLoading(false); })
      .catch(() => { setError("Failed to load characters"); setLoading(false); });
  }, [anime.anilistId, isGuest, storeChars]);

  const handleDelete = async () => {
    await removeAnime(anime.anilistId, user?.isGuest ?? true);
    onClose();
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="detail-header">
          {anime.coverImage && (
            <img src={anime.coverImage} alt={anime.title ?? ""} className="detail-cover" />
          )}
          <div className="detail-title-block">
            <h2 className="detail-title">{anime.title ?? "Unknown"}</h2>
            <span className="detail-count">{characters.length} characters with voice actors</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Delete button */}
        <div className="detail-delete-section">
          {!confirmDelete ? (
            <button className="btn-delete-anime" onClick={() => setConfirmDelete(true)}>
              🗑 Remove from graph
            </button>
          ) : (
            <div className="delete-confirm-bubble">
              <span>Remove <strong>{anime.title ?? "this anime"}</strong> from your graph?</span>
              <div className="delete-confirm-actions">
                <button className="btn-confirm-yes" onClick={handleDelete}>Yes, remove</button>
                <button className="btn-confirm-cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Character list */}
        <div className="detail-chars">
          {loading && <div className="detail-loading"><div className="spinner" /></div>}
          {error && <div className="detail-error">{error}</div>}
          {!loading && !error && characters.length === 0 && (
            <div className="detail-empty">No linked characters yet. Add more anime to reveal connections.</div>
          )}
          {!loading && characters.map((char) => (
            <div key={char.anilistCharacterId} className="detail-char-row">
              <div className="char-avatar-wrap">
                {char.characterImage ? (
                  <img src={char.characterImage} alt={char.characterName} className="detail-char-img" />
                ) : (
                  <div className="detail-char-letter">{char.characterName[0]}</div>
                )}
              </div>
              <div className="detail-char-info">
                <span className="detail-char-name">{char.characterName}</span>
              </div>
              {char.seiyuuName && (
                <div className="detail-va">
                  {char.seiyuuImage && (
                    <img src={char.seiyuuImage} alt={char.seiyuuName} className="detail-va-img" />
                  )}
                  <div className="detail-va-info">
                    <span className="detail-va-label">CV</span>
                    <span className="detail-va-name">{char.seiyuuName}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
