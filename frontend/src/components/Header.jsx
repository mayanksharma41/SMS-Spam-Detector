import { LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import { useAppState } from "../AppState.jsx";
import { useAuth } from "../AuthContext.jsx";
import { useTheme } from "../useTheme.js";

export default function Header({ title, subtitle }) {
  const { health, metrics } = useAppState();
  const { user, logout } = useAuth();
  const [isDark, toggleTheme] = useTheme();

  const connected = Boolean(health?.ok);
  const acc = metrics?.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}% Acc` : "Model Active";

  return (
    <header className="header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {/* Backend health status pill */}
        <span className={`status-pill ${connected ? "ok" : "bad"}`}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: connected ? "#059669" : "#dc2626",
            }}
          />
          {connected ? `Backend Connected • ${acc}` : "Backend Disconnected"}
        </span>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="btn-icon theme-btn"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* User email & logout */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "4px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 10px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--text)",
              }}
              title={`Logged in as ${user.email}`}
            >
              <UserIcon size={13} style={{ color: "var(--primary)" }} />
              <span style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email.split("@")[0]}
              </span>
            </span>

            <button
              type="button"
              onClick={logout}
              className="btn-icon logout-btn"
              title="Log Out"
              aria-label="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
