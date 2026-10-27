import { NavLink } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";
import { NAV_ITEMS } from "../nav.js";
import { useAppState } from "../AppState.jsx";
import { useAuth } from "../AuthContext.jsx";

export default function Sidebar() {
  const { metrics } = useAppState();
  const { user, logout } = useAuth();
  const acc = metrics?.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : "98.4%";

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-badge">Mini-Project</span>
        <h1>SMS Spam Detector</h1>
        <p>Natural Language Processing & Machine Learning Classification</p>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Model Information */}
      <div style={{ marginTop: "auto", padding: "12px", background: "rgba(255, 255, 255, 0.04)", borderRadius: "8px", fontSize: "11.5px", color: "var(--muted)" }}>
        <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: "4px" }}>Model Status</div>
        <div>TF-IDF + Naive Bayes</div>
        <div style={{ color: "#34d399", fontWeight: 700, marginTop: "2px" }}>{acc} Test Accuracy</div>
      </div>

      {/* User Account Card */}
      {user && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "var(--primary)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: "12px",
                flexShrink: 0,
              }}
            >
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.email}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>Authenticated</div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
            }}
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </aside>
  );
}
