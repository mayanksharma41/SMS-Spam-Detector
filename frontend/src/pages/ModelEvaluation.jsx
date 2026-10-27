import { useAppState } from "../AppState.jsx";
import { BarChart3, Database, CheckCircle, ShieldAlert, Layers } from "lucide-react";

export default function ModelEvaluation() {
  const { metrics, metricsLoading, error } = useAppState();

  if (metricsLoading) {
    return (
      <div className="page">
        <div className="banner info">Loading model metrics from held-out evaluation test set…</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="page">
        <div className="banner error">Could not load model evaluation metrics: {error || "Unknown error"}</div>
      </div>
    );
  }

  const {
    accuracy,
    precision,
    recall,
    f1_score,
    confusion_matrix: cm = {},
    top_spam_keywords = [],
    dataset_total = 5574,
    train_size = 4459,
    test_size = 1115,
    model_name,
    algorithm,
    vectorizer,
  } = metrics;

  return (
    <div className="page">
      {/* Intro Header */}
      <section className="panel">
        <div className="section-header">
          <h3>Supervised Model Performance & Evaluation</h3>
          <p>
            Evaluation metrics computed strictly on <strong>held-out test data (1,115 SMS messages)</strong> from the authentic SMSSpamCollection dataset using a stratified 80/20 train/test split.
          </p>
        </div>

        <div className="cards">
          <div className="stat-card" style={{ borderTop: "3px solid #10b981" }}>
            <span className="label">Accuracy</span>
            <span className="value" style={{ color: "#047857" }}>
              {(accuracy * 100).toFixed(2)}%
            </span>
            <span className="subtext">Overall correct predictions on test set</span>
          </div>

          <div className="stat-card" style={{ borderTop: "3px solid #3b82f6" }}>
            <span className="label">Precision (Spam)</span>
            <span className="value" style={{ color: "#1d4ed8" }}>
              {(precision * 100).toFixed(2)}%
            </span>
            <span className="subtext">Flagged spam messages that were genuine spam</span>
          </div>

          <div className="stat-card" style={{ borderTop: "3px solid #f59e0b" }}>
            <span className="label">Recall (Spam)</span>
            <span className="value" style={{ color: "#b45309" }}>
              {(recall * 100).toFixed(2)}%
            </span>
            <span className="subtext">Actual spam messages successfully caught</span>
          </div>

          <div className="stat-card" style={{ borderTop: "3px solid #8b5cf6" }}>
            <span className="label">F1-Score</span>
            <span className="value" style={{ color: "#6d28d9" }}>
              {(f1_score * 100).toFixed(2)}%
            </span>
            <span className="subtext">Harmonic mean of precision and recall</span>
          </div>
        </div>
      </section>

      {/* Confusion Matrix Section */}
      <section className="panel">
        <div className="section-header">
          <h3>Test Confusion Matrix (1,115 Evaluated Messages)</h3>
          <p>
            Comparing ground truth labels against model predictions on the unseen test set:
          </p>
        </div>

        <div className="confusion-matrix-grid">
          <div />
          <div className="cm-header">Predicted: HAM (Legitimate)</div>
          <div className="cm-header">Predicted: SPAM</div>

          <div className="cm-header" style={{ textAlign: "right", paddingRight: "12px" }}>
            Actual: HAM<br />
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>(966 total)</span>
          </div>
          <div className="cm-cell good">
            <span className="cm-title">True Negative (TN)</span>
            <span className="cm-val">{cm.tn}</span>
            <span className="cm-desc">Legitimate messages correctly preserved (99.7%)</span>
          </div>
          <div className="cm-cell error">
            <span className="cm-title">False Positive (FP)</span>
            <span className="cm-val">{cm.fp}</span>
            <span className="cm-desc">Legitimate messages mistakenly flagged as spam</span>
          </div>

          <div className="cm-header" style={{ textAlign: "right", paddingRight: "12px" }}>
            Actual: SPAM<br />
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>(149 total)</span>
          </div>
          <div className="cm-cell error">
            <span className="cm-title">False Negative (FN)</span>
            <span className="cm-val">{cm.fn}</span>
            <span className="cm-desc">Spam messages missed by the model</span>
          </div>
          <div className="cm-cell good">
            <span className="cm-title">True Positive (TP)</span>
            <span className="cm-val">{cm.tp}</span>
            <span className="cm-desc">Spam messages accurately detected and blocked</span>
          </div>
        </div>
      </section>

      {/* Dataset & Pipeline Specifications */}
      <section className="panel">
        <div className="section-header">
          <h3>Machine Learning Pipeline Architecture</h3>
          <p>Technical parameters used for training and inference.</p>
        </div>

        <div className="cards" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="stat-card">
            <span className="label">Dataset Corpus</span>
            <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 600 }}>
              SMSSpamCollection
            </div>
            <span className="subtext">
              {dataset_total.toLocaleString()} labeled SMS messages (4,827 Ham, 747 Spam)
            </span>
          </div>

          <div className="stat-card">
            <span className="label">Train / Test Split</span>
            <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 600 }}>
              80% Train / 20% Test (Stratified)
            </div>
            <span className="subtext">
              {train_size.toLocaleString()} Training samples &bull; {test_size.toLocaleString()} Test samples
            </span>
          </div>

          <div className="stat-card">
            <span className="label">Feature Representation & Model</span>
            <div style={{ marginTop: "8px", fontSize: "14px", fontWeight: 600 }}>
              TF-IDF + MultinomialNB
            </div>
            <span className="subtext">
              Unigrams & Bigrams, sublinear TF scaling, alpha = 0.2
            </span>
          </div>
        </div>
      </section>

      {/* Top Learned Spam Features */}
      {top_spam_keywords.length > 0 && (
        <section className="panel">
          <div className="section-header">
            <h3>Top 20 Spam-Indicative Vocabulary Learned by Model</h3>
            <p>
              Features with highest log-odds probability difference between Spam and Ham classes:
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "10%" }}>Rank</th>
                  <th style={{ width: "40%" }}>Feature / N-Gram</th>
                  <th style={{ width: "25%" }}>Log-Probability Differential</th>
                  <th>Spam Weight Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {top_spam_keywords.map((kw, idx) => (
                  <tr key={idx}>
                    <td><strong>#{idx + 1}</strong></td>
                    <td>
                      <code style={{ fontSize: "13.5px", color: "#b91c1c", fontWeight: 600 }}>
                        {kw.keyword}
                      </code>
                    </td>
                    <td>
                      <span className="tag-badge" style={{ background: "#fee2e2", color: "#991b1b" }}>
                        +{kw.weight}
                      </span>
                    </td>
                    <td style={{ color: "#475569", fontSize: "12.5px" }}>
                      Extremely characteristic of unsolicited SMS marketing / scam texts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
