import { useState, useEffect } from "react";
import { useUiStore } from "../../stores/uiStore";
import "./LoginModal.css";

export default function LoginModal() {
  const { closeLogin } = useUiStore();
  const { init } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  // Detect ?auth=error redirect from failed Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "error") {
      setError("Google sign-in failed. Make sure the redirect URI is correctly configured in Google Console.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleGoogle = () => {
    const apiBase = import.meta.env.VITE_API_URL ?? "";
    window.location.href = `${apiBase}/api/auth/google`;
  };

  return (
    <div className="modal-overlay" onClick={closeLogin}>
      <div className="modal-box login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={closeLogin}>✕</button>

        <div className="login-logo">
          <span className="login-icon">⬡</span>
          <h1 className="login-title">VA<span>node</span></h1>
        </div>

        <p className="login-desc">
          Sign in to save your graph across sessions.
        </p>

        <div className="login-actions">
          <button className="btn-google" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {error && <p className="login-error">{error}</p>}

          <div className="login-divider"><span>or</span></div>

          <button className="btn-guest" onClick={closeLogin}>
            Continue as Guest
            <small>Already active · Graph saved locally in your browser</small>
          </button>
        </div>

        <p className="login-note">
          Guest data is stored in your browser. Sign in with Google to sync across devices.
        </p>
      </div>
    </div>
  );
}
