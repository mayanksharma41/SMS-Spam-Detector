import { ShieldAlert, ShieldCheck, AlertCircle, Tag, CheckCircle2 } from "lucide-react";

export default function PredictionResult({ prediction }) {
  if (!prediction) return null;

  const {
    is_spam,
    prediction: verdict,
    confidence,
    spam_probability,
    ham_probability,
    spam_cues = [],
    matched_spam_keywords = [],
    model_name,
  } = prediction;

  return (
    <div className={`result-card ${is_spam ? "spam" : "ham"}`}>
      <div className="result-header">
        <div className="result-main">
          <div className="result-icon">
            {is_spam ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
          </div>
          <div className="result-badge-title">
            <span className="result-tag">
              {is_spam ? "High Risk Alert" : "Verified Legitimate"}
            </span>
            <h2 className="result-verdict">
              {is_spam ? "🚨 Spam Message Detected" : "🛡️ Legitimate Message (Not Spam)"}
            </h2>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              Classified by {model_name || "Multinomial Naive Bayes + TF-IDF"}
            </div>
          </div>
        </div>

        <div className="confidence-score">
          <div className="confidence-number">{confidence}%</div>
          <div className="confidence-label">Prediction Confidence</div>
        </div>
      </div>

      {/* Probability Bars */}
      <div className="prob-bars">
        <div className="prob-row">
          <span className="prob-label">🚨 Spam Probability:</span>
          <div className="prob-track">
            <div
              className="prob-fill spam"
              style={{ width: `${Math.max(spam_probability, 1)}%` }}
            />
          </div>
          <span className="prob-val">{spam_probability}%</span>
        </div>

        <div className="prob-row">
          <span className="prob-label">🛡️ Ham (Normal) Probability:</span>
          <div className="prob-track">
            <div
              className="prob-fill ham"
              style={{ width: `${Math.max(ham_probability, 1)}%` }}
            />
          </div>
          <span className="prob-val">{ham_probability}%</span>
        </div>
      </div>

      {/* Detected Spam Indicators */}
      {is_spam && spam_cues.length > 0 && (
        <div className="cues-section">
          <div className="cues-title">
            <AlertCircle size={15} color="#d97706" />
            <span>Detected Spam Risk Factors & Indicators:</span>
          </div>
          <div className="cues-list">
            {spam_cues.map((cue, idx) => (
              <span key={idx} className="cue-pill">
                <strong>{cue.type}:</strong> {cue.matches.join(", ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Matched Model Top Spam Keywords */}
      {matched_spam_keywords.length > 0 && (
        <div className="cues-section">
          <div className="cues-title">
            <Tag size={15} color="#dc2626" />
            <span>High-Weight Spam Features Learned from Dataset:</span>
          </div>
          <div className="cues-list">
            {matched_spam_keywords.map((kw, idx) => (
              <span key={idx} className="keyword-pill">
                "{kw.keyword}" <span className="keyword-weight">+{kw.weight} log-diff</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {!is_spam && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#065f46", background: "rgba(16, 185, 129, 0.08)", padding: "10px 14px", borderRadius: "8px" }}>
          <CheckCircle2 size={16} />
          <span>No unsolicited spam indicators, suspicious shortcodes, or high-risk financial triggers detected.</span>
        </div>
      )}
    </div>
  );
}
