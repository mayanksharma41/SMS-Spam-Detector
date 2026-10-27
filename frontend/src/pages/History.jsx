import { useEffect, useState, useMemo } from "react";
import {
  History as HistoryIcon,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Filter,
  Lock,
  Eye,
  Info,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";
import { clearUserHistory, deleteHistoryItem, getUserHistory } from "../api.js";
import ErrorBanner from "../components/ErrorBanner.jsx";
import StatCard from "../components/StatCard.jsx";

export default function History() {
  const { user, toggleHistoryOptIn } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'spam' | 'ham'
  const [updatingOptIn, setUpdatingOptIn] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getUserHistory();
      setHistory(data.history || []);
    } catch (err) {
      setError(err.message || "Failed to load prediction history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all prediction history? This cannot be undone.")) {
      return;
    }
    try {
      await clearUserHistory();
      setHistory([]);
    } catch (err) {
      setError(err.message || "Failed to clear history.");
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete item.");
    }
  };

  const handleOptInChange = async (e) => {
    const checked = e.target.checked;
    setUpdatingOptIn(true);
    await toggleHistoryOptIn(checked);
    setUpdatingOptIn(false);
  };

  const filteredHistory = useMemo(() => {
    if (filter === "spam") return history.filter((h) => h.is_spam);
    if (filter === "ham") return history.filter((h) => !h.is_spam);
    return history;
  }, [history, filter]);

  const spamCount = useMemo(() => history.filter((h) => h.is_spam).length, [history]);
  const hamCount = useMemo(() => history.filter((h) => !h.is_spam).length, [history]);

  return (
    <div className="page">
      <ErrorBanner message={error} />

      {/* Stats row */}
      <div className="cards three-col">
        <StatCard label="Total Scans" value={history.length} />
        <StatCard label="Spam Detected" value={spamCount} />
        <StatCard label="Ham (Safe)" value={hamCount} />
      </div>

      {/* Privacy Opt-in Card */}
      <div className="card privacy-card" style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Lock size={18} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Privacy & Data Storage Settings</h3>
            </div>
            <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              By default, message contents are <strong>never stored</strong> in full; only an 80-character preview is saved to protect privacy.
              Check the box if you explicitly wish to store full SMS texts for your historical reviews.
            </p>
          </div>

          <label className="toggle-label" style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(user?.store_history_opt_in)}
              onChange={handleOptInChange}
              disabled={updatingOptIn}
              style={{ width: "18px", height: "18px", accentColor: "var(--primary)", cursor: "pointer" }}
            />
            <span style={{ fontSize: "13.5px", fontWeight: 600 }}>
              {updatingOptIn ? "Updating…" : "Store Full Message Text"}
            </span>
          </label>
        </div>
      </div>

      {/* History Controls Bar */}
      <div className="history-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", marginBottom: "12px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Filter size={16} style={{ color: "var(--muted)" }} />
          <button
            type="button"
            className={`btn small ${filter === "all" ? "primary" : "secondary"}`}
            onClick={() => setFilter("all")}
          >
            All ({history.length})
          </button>
          <button
            type="button"
            className={`btn small ${filter === "spam" ? "primary" : "secondary"}`}
            onClick={() => setFilter("spam")}
          >
            Spam ({spamCount})
          </button>
          <button
            type="button"
            className={`btn small ${filter === "ham" ? "primary" : "secondary"}`}
            onClick={() => setFilter("ham")}
          >
            Ham ({hamCount})
          </button>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            className="btn small secondary danger-btn"
            onClick={handleClearAll}
          >
            <Trash2 size={14} />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {/* History List */}
      {loading ? (
        <div className="banner info">Loading prediction history from database…</div>
      ) : filteredHistory.length === 0 ? (
        <div className="card empty-state" style={{ padding: "48px 24px", textAlign: "center" }}>
          <HistoryIcon size={40} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>No Prediction History</h3>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            {history.length === 0
              ? "Messages you classify using the SMS Spam Detector will be recorded here in your private account history."
              : "No records match the selected filter."}
          </p>
        </div>
      ) : (
        <div className="history-list" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredHistory.map((item) => {
            const isSpam = item.is_spam;
            const confVal = item.confidence > 1 ? item.confidence : item.confidence * 100;
            const pct = Number(confVal).toFixed(1);
            const dateStr = item.created_at ? new Date(item.created_at + "Z").toLocaleString() : "Recently";

            return (
              <div
                key={item.id}
                className="card history-item-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderLeft: `4px solid ${isSpam ? "var(--spam)" : "var(--ham)"}`,
                  gap: "16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: isSpam ? "var(--spam-light)" : "var(--ham-light)",
                      color: isSpam ? "var(--spam)" : "var(--ham)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isSpam ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className={`pill ${isSpam ? "spam" : "ham"}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                        {item.prediction} ({pct}%)
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>{dateStr}</span>
                    </div>

                    <div
                      style={{
                        fontSize: "13.5px",
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={item.full_text || item.text_preview}
                    >
                      {item.full_text || item.text_preview}
                    </div>

                    {item.full_text ? (
                      <span style={{ fontSize: "11px", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                        <Eye size={12} /> Full message stored (opt-in)
                      </span>
                    ) : (
                      <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                        <Info size={12} /> 80-char preview (privacy default)
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => handleDeleteItem(item.id)}
                  title="Delete from history"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    padding: "8px",
                    borderRadius: "6px",
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
