import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { toggleSearch, openSearchForQuiz, toggleAnimePanel, toggleAdmin, openLogin } = useUiStore();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">⬡</span>
        <span className="brand-name">
          VA<span className="brand-accent">node</span>
        </span>
      </div>

      <div className="navbar-actions">
        <button className="nav-btn" onClick={toggleSearch} title="Add anime">
          <span>＋</span><span className="btn-label"> Add Anime</span>
        </button>

        <button className="nav-btn nav-btn-quiz" onClick={openSearchForQuiz} title="Add anime by quiz">
          🎯<span className="btn-label"> Quiz</span>
        </button>

        <button className="nav-btn nav-btn-ghost" onClick={toggleAnimePanel} title="My anime">
          <span>◈</span><span className="btn-label"> My Anime</span>
        </button>

        {user?.isGuest === false && (
          <button className="nav-btn nav-btn-ghost" onClick={toggleAdmin} title="Admin">
            <span>⚙</span>
          </button>
        )}

        {user && !user.isGuest ? (
          <div className="nav-user">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt={user.name} className="nav-avatar" />
            )}
            <span className="nav-username">{user.name}</span>
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
