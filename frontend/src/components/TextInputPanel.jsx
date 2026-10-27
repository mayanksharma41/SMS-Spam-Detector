import { useState } from "react";
import { useAppState } from "../AppState.jsx";
import { Send, Sparkles } from "lucide-react";

export default function TextInputPanel() {
  const { text, setText, samples, datasetNote, loading, analyze, applySample } = useAppState();

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <section className="panel">
      <div className="section-header">
        <h3>Enter SMS Message</h3>
        <p>Type or paste an SMS text below, or pick a sample to classify and inspect.</p>
      </div>

      <textarea
        id="source-text"
        className="textarea"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Enter SMS message text (e.g. 'WINNER! You have won a £1,000 cash prize. Call 09061701461 to claim now...')"
      />

      <div className="input-footer">
        <span>{wordCount} words &bull; {charCount} characters</span>
        {text ? (
          <button
            type="button"
            style={{ background: "none", border: 0, color: "#64748b", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
            onClick={() => setText("")}
          >
            Clear input
          </button>
        ) : null}
      </div>

      <div className="actions">
        <div className="samples-container">
          <div className="samples-label">Quick Test Examples:</div>
          <div className="samples">
            {samples.map((sample) => {
              const isSpam = sample.id.includes("spam");
              const isHam = sample.id.includes("ham");
              const btnClass = isSpam
                ? "btn secondary spam-btn"
                : isHam
                ? "btn secondary ham-btn"
                : "btn secondary";

              return (
                <button
                  key={sample.id}
                  type="button"
                  className={btnClass}
                  onClick={() => applySample(sample)}
                  title={sample.text}
                >
                  {isSpam ? "🚨 " : isHam ? "🛡️ " : "📝 "}
                  {sample.label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => analyze()}
          disabled={loading || !text.trim()}
          style={{ minWidth: "190px", justifyContent: "center" }}
        >
          {loading ? (
            "Analyzing Model…"
          ) : (
            <>
              <Sparkles size={16} />
              Predict & Analyze SMS
            </>
          )}
        </button>
      </div>

      {datasetNote ? <p className="hint">📁 {datasetNote}</p> : null}
    </section>
  );
}
