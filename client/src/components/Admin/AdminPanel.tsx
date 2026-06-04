import { useState, useEffect } from "react";
import { adminGetAnime, adminGetCharacters, adminGetUsers } from "../../api/client";
import { useUiStore } from "../../stores/uiStore";
import "./AdminPanel.css";

type Tab = "anime" | "characters" | "users";

export default function AdminPanel() {
  const { showAdmin, toggleAdmin } = useUiStore();
  const [tab, setTab] = useState<Tab>("anime");
  const [data, setData] = useState<{ items: any[]; page: number } | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showAdmin) return;
    setLoading(true);
    setError(null);
    const fetch = tab === "anime" ? adminGetAnime(page) : tab === "characters" ? adminGetCharacters(page) : adminGetUsers();
    fetch
      .then((d) => setData(Array.isArray(d) ? { items: d, page: 1 } : d))
      .catch((e) => setError(e?.response?.data?.error || "Access denied"))
      .finally(() => setLoading(false));
  }, [tab, page, showAdmin]);

  if (!showAdmin) return null;

  return (
    <div className="modal-overlay" onClick={toggleAdmin}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="panel-title">⚙ Admin Panel</h2>
          <button className="modal-close" onClick={toggleAdmin}>✕</button>
        </div>

        <div className="admin-tabs">
          {(["anime", "characters", "users"] as Tab[]).map((t) => (
            <button
              key={t}
              className={`admin-tab${tab === t ? " active" : ""}`}
              onClick={() => { setTab(t); setPage(1); }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="admin-error">{error}</div>}
        {loading && <div className="admin-loading"><div className="spinner" /></div>}

        {!loading && !error && data && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {tab === "anime" && <><th>Anime ID</th><th>Title</th><th>User</th><th>Added</th></>}
                  {tab === "characters" && <><th>Char ID</th><th>Name</th><th>Seiyuu</th><th>Anime ID</th></>}
                  {tab === "users" && <><th>ID</th><th>Name</th><th>Email</th><th>Type</th><th>Since</th></>}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, i) => (
                  <tr key={i}>
                    {tab === "anime" && (
                      <>
                        <td className="mono">{item.anilistId}</td>
                        <td>{item.title}</td>
                        <td className="mono">{item.userId?.slice(0, 8)}…</td>
                        <td>{new Date(item.addedAt).toLocaleDateString()}</td>
                      </>
                    )}
                    {tab === "characters" && (
                      <>
                        <td className="mono">{item.anilistCharacterId}</td>
                        <td>{item.characterName}</td>
                        <td>{item.seiyuuName || "—"}</td>
                        <td className="mono">{item.anilistAnimeId}</td>
                      </>
                    )}
                    {tab === "users" && (
                      <>
                        <td className="mono">{item.id?.slice(0, 8)}…</td>
                        <td>{item.name}</td>
                        <td>{item.email || "—"}</td>
                        <td>
                          <span className={`badge ${item.isGuest ? "badge-guest" : "badge-auth"}`}>
                            {item.isGuest ? "Guest" : "Auth"}
                          </span>
                        </td>
                        <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && tab !== "users" && (
          <div className="admin-pagination">
            <button
              className="nav-btn nav-btn-sm nav-btn-ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </button>
            <span>Page {page}</span>
            <button
              className="nav-btn nav-btn-sm nav-btn-ghost"
              disabled={data.items.length < 20}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
