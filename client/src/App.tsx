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
import QuizModal from "./components/Quiz/QuizModal";
import "./App.css";

export default function App() {
  const { user, isLoading, init } = useAuthStore();
  const { loadGraph } = useGraphStore();
  const { showLogin, showQuiz } = useUiStore();

  useEffect(() => { init(); }, []);

  // Auto-open login modal if redirected back from a failed Google OAuth
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("auth") === "error") {
      useUiStore.getState().openLogin();
    }
  }, []);

  useEffect(() => {
    if (isLoading || !user) return;
    loadGraph(user.isGuest);
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading-logo">
          <span className="app-loading-icon">⬡</span>
          <span className="app-loading-name">VA<span>node</span></span>
        </div>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />
      <main className="app-main"><GraphCanvas /></main>
      <SearchBar />
      <AnimePanel />
      <AdminPanel />
      {showLogin && <LoginModal />}
      {showQuiz && <QuizModal />}
    </div>
  );
}
