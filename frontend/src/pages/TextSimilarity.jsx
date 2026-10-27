import { useState, useEffect } from "react";
import { compareTexts } from "../api.js";
import { useAppState } from "../AppState.jsx";
import { GitCompare, Sparkles } from "lucide-react";
import ErrorBanner from "../components/ErrorBanner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

export default function TextSimilarity() {
  const { text } = useAppState();
  const [text1, setText1] = useState(text || "WINNER! You have won £1,000 cash prize. Call to claim now.");
  const [text2, setText2] = useState("Urgent! You have been awarded £1,000 cash jackpot. Call immediately.");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (text) {
      setText1(text);
    }
  }, [text]);

  async function compare() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await compareTexts(text1, text2);
      setResult(data);
    } catch (err) {
      setError(err.message || "Similarity request failed.");
    } finally {
      setLoading(false);
    }
  }

  function getInterpretation(score) {
    if (score >= 0.7) return { text: "Very High Overlap (Strong thematic & vocabulary match)", color: "#059669" };
    if (score >= 0.4) return { text: "Moderate Overlap (Shared keywords and phrasing)", color: "#4f46e5" };
    if (score > 0.1) return { text: "Low Overlap (Few shared content terms)", color: "#d97706" };
    return { text: "Negligible / No Overlap (Completely distinct vocabularies)", color: "#64748b" };
  }

  return (
    <div className="page">
      <section className="panel">
        <SectionHeader
          title="TF-IDF Cosine Similarity Comparison"
          description="Vectorizes both text messages into Term Frequency-Inverse Document Frequency (TF-IDF) feature vectors and computes their normalized inner product."
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "14px" }}>
          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>
              Message 1:
            </label>
            <textarea
              className="textarea"
              value={text1}
              onChange={(e) => setText1(e.target.value)}
              placeholder="Enter first message…"
              style={{ minHeight: "100px" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12.5px", fontWeight: 600, color: "#475569", display: "block", marginBottom: "6px" }}>
              Message 2:
            </label>
            <textarea
              className="textarea"
              value={text2}
              onChange={(e) => setText2(e.target.value)}
              placeholder="Enter second message to compare…"
              style={{ minHeight: "100px" }}
            />
          </div>
        </div>

        <div className="actions">
          <div className="samples">
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setText1("WINNER! You have won £1,000 cash prize. Call to claim now.");
                setText2("Urgent! You have been awarded £1,000 cash jackpot. Call immediately.");
              }}
            >
              Preset: Spam vs Spam
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setText1("Hey are we still meeting up for coffee tomorrow afternoon?");
                setText2("Are you free tomorrow for coffee or lunch?");
              }}
            >
              Preset: Ham vs Ham
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setText1("WINNER! You have won £1,000 cash prize. Call to claim now.");
                setText2("Hey are we still meeting up for coffee tomorrow afternoon?");
              }}
            >
              Preset: Spam vs Ham
            </button>
          </div>

          <button
            type="button"
            className="btn"
            onClick={compare}
            disabled={loading || !text1.trim() || !text2.trim()}
          >
            <GitCompare size={16} />
            {loading ? "Computing Similarity…" : "Compute Cosine Similarity"}
          </button>
        </div>
      </section>

      <ErrorBanner message={error} />

      {result && (
        <section className="panel" style={{ animation: "fadeIn 0.3s ease-out" }}>
          <div className="section-header">
            <h3>Similarity Computation Result</h3>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "24px", padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "36px", fontWeight: 800, color: "#0f172a" }}>
                {(result.score * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Cosine Score: {result.score}</div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ height: "12px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", marginBottom: "8px" }}>
                <div
                  style={{
                    width: `${Math.round(result.score * 100)}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #6366f1, #4f46e5)",
                    borderRadius: "999px",
                    transition: "width 0.4s ease-out",
                  }}
                />
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: getInterpretation(result.score).color }}>
                {getInterpretation(result.score).text}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
