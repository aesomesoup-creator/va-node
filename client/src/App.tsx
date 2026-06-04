import { useEffect } from "react";
import { useAuthStore } from "./stores/authStore";
import { useGraphStore } from "./stores/graphStore";
import { useUiStore } from "./stores/uiStore";
import Navbar from "./components/Layout/Navbar";
import GraphCanvas from "./components/Canvas/GraphCanvas";
import SearchBar from "./components/SearchBar/SearchBar";
import AnimePanel from "./components/AnimePanel/AnimePanel";
import AdminPanel from "./components/Admin/AdminPanel";
import LoginModal from "./components/Auth/LoginModal";
import "./App.css";

export default function App() {
  const { user, isLoading, init } = useAuthStore();
  const { loadGraph } = useGraphStore();
  const { showLogin, openLogin } = useUiStore();

  // Init auth on mount
  useEffect(() => {
    init();
  }, []);

  // Load graph once user is known
  useEffect(() => {
    if (isLoading) return;
    if (user) {
      loadGraph();
    } else {
      // Show login prompt after a short delay
      const t = setTimeout(openLogin, 600);
      return () => clearTimeout(t);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-logo">
          <span className="app-loading-icon">⬡</span>
          <span className="app-loading-name">
            VA<span>node</span>
          </span>
        </div>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />

      <main className="app-main">
        <GraphCanvas />
      </main>

      {/* Modals */}
      <SearchBar />
      <AnimePanel />
      <AdminPanel />
      {showLogin && <LoginModal />}
    </div>
  );
}
