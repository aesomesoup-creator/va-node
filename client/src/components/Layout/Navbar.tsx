import { useState, useEffect } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { toggleSearch, openSearchForQuiz, toggleAnimePanel, toggleAdmin, openLogin } = useUiStore();
  const [dark, setDark] = useState(() => localStorage.getItem("vanode-dark") === "1");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("vanode-dark", dark ? "1" : "0");
  }, [dark]);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-name">VA<span className="brand-node">NODE</span></span>
      </div>

      <div className="navbar-actions">
        <button className="nav-btn" onClick={toggleSearch} title="Add anime">
          <span className="btn-label">+ Add Anime</span>
        </button>

        <button className="nav-btn nav-btn-quiz" onClick={openSearchForQuiz} title="Add anime by quiz">
          <span className="btn-label">Add Anime by Quiz</span>
        </button>

        <button className="nav-btn nav-btn-ghost" onClick={toggleAnimePanel} title="My anime">
          <span className="btn-label">My Anime</span>
        </button>

        {user?.isGuest === false && (
          <button className="nav-btn nav-btn-ghost" onClick={toggleAdmin} title="Admin">
            <span className="btn-label">Admin</span>
          </button>
        )}

        <button
          className="nav-btn nav-btn-ghost theme-toggle"
          onClick={() => setDark((d) => !d)}
          title={dark ? "Light mode" : "Dark mode"}
        >
          {dark ? "Light" : "Dark"}
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
