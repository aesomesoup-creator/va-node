import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { toggleSearch, openSearchForQuiz, openLogin, openVaQuiz, openAnilistImport } = useUiStore();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-name">VA<span className="brand-node">NODE</span></span>
      </div>

      <div className="navbar-actions">
        <button className="nav-btn" onClick={toggleSearch} title="Add anime">
          <span className="btn-label">+ Add Anime</span>
        </button>

        <button className="nav-btn nav-btn-yellow" onClick={openSearchForQuiz} title="Add anime by quiz">
          <span className="btn-label">+ Add Anime by Quiz</span>
        </button>

        <button className="nav-btn nav-btn-quiz" onClick={openVaQuiz} title="VA Quiz">
          <span className="btn-label">QUIZ</span>
        </button>

        <button className="nav-btn nav-btn-anilist" onClick={openAnilistImport} title="Import AniList">
          <span className="btn-label">Import AniList</span>
        </button>

        {user && !user.isGuest ? (
          <div className="nav-user">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="nav-avatar" />
            ) : (
              <div className="nav-avatar-fallback">{user.name[0]?.toUpperCase()}</div>
            )}
            <div className="nav-user-info">
              <span className="nav-username">{user.name}</span>
              {user.email && <span className="nav-email">{user.email}</span>}
            </div>
            <button className="nav-btn nav-btn-sm nav-btn-ghost" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="nav-btn nav-btn-accent" onClick={openLogin}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
