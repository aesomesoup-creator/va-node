import { Component, type ReactNode } from "react";

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: "fixed", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "#020817",
          color: "#e2f4ff", gap: 16, padding: 32, fontFamily: "monospace",
        }}>
          <div style={{ fontSize: 32, color: "#ff4757" }}>⚠ App Error</div>
          <div style={{ color: "#ff8a96", fontSize: 14, maxWidth: 600, textAlign: "center" }}>
            {this.state.error.message}
          </div>
          <pre style={{
            background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)",
            borderRadius: 10, padding: 16, fontSize: 11, maxWidth: 700, overflow: "auto",
            color: "#ff8a96", maxHeight: 300,
          }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(0,200,255,0.4)",
              background: "rgba(0,200,255,0.1)", color: "#00c8ff", cursor: "pointer",
              fontSize: 14, fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
