import { useState } from "react";
import { Tags, WandSparkles, Type, Cloud, Image as ImageIcon } from "lucide-react";
import { generateWordCloud } from "../api.js";

export default function NlpInspector({ analysis }) {
  const [activeTab, setActiveTab] = useState("pos");
  const [wordCloudImg, setWordCloudImg] = useState("");
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState("");

  if (!analysis) return null;

  const {
    text = "",
    pos_tags = [],
    morphology = [],
    tokens = [],
    stopwords = {},
    word_frequencies = [],
  } = analysis;

  async function handleGenerateCloud() {
    setCloudLoading(true);
    setCloudError("");
    try {
      const res = await generateWordCloud(text);
      setWordCloudImg(res.image || "");
    } catch (err) {
      setCloudError(err.message || "Failed to generate word cloud.");
    } finally {
      setCloudLoading(false);
    }
  }

  function getPosClass(tag) {
    if (tag.startsWith("NN")) return "tag-badge noun";
    if (tag.startsWith("VB")) return "tag-badge verb";
    if (tag.startsWith("JJ")) return "tag-badge adj";
    if (tag === "CD") return "tag-badge num";
    if ([".", ",", ":", "$"].includes(tag)) return "tag-badge punct";
    return "tag-badge";
  }

  return (
    <section className="panel">
      <div className="section-header">
        <h3>Natural Language Processing Analysis</h3>
        <p>Explore linguistic structure, grammatical tagging, morphological transformations, and tokens.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === "pos" ? "active" : ""}`}
          onClick={() => setActiveTab("pos")}
        >
          <Tags size={16} />
          Part-of-Speech Tagging ({pos_tags.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "morphology" ? "active" : ""}`}
          onClick={() => setActiveTab("morphology")}
        >
          <WandSparkles size={16} />
          Stemming & Lemmatization ({morphology.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "tokens" ? "active" : ""}`}
          onClick={() => setActiveTab("tokens")}
        >
          <Type size={16} />
          Tokens & Stopwords ({tokens.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "frequencies" ? "active" : ""}`}
          onClick={() => setActiveTab("frequencies")}
        >
          <Cloud size={16} />
          Word Frequencies & Word Cloud
        </button>
      </div>

      {/* Tab 1: POS Tagging */}
      {activeTab === "pos" && (
        <div>
          <div style={{ marginBottom: "12px", fontSize: "13px", color: "#64748b" }}>
            Each word token tagged according to the Penn Treebank corpus schema:
          </div>
          <div className="table-wrap" style={{ maxHeight: "380px" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Word / Token</th>
                  <th style={{ width: "20%" }}>Penn POS Tag</th>
                  <th>Grammatical Category & Description</th>
                </tr>
              </thead>
              <tbody>
                {pos_tags.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.word}</strong>
                    </td>
                    <td>
                      <span className={getPosClass(item.tag)}>{item.tag}</span>
                    </td>
                    <td style={{ color: "#475569" }}>{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Morphology (Stemming vs Lemmatization) */}
      {activeTab === "morphology" && (
        <div>
          <div style={{ marginBottom: "12px", fontSize: "13px", color: "#64748b" }}>
            Comparison of <strong>Porter Stemmer</strong> (heuristic affix stripping) versus <strong>WordNet Lemmatizer</strong> (vocabulary-informed root forms):
          </div>
          <div className="table-wrap" style={{ maxHeight: "380px" }}>
            <table>
              <thead>
                <tr>
                  <th>Original Word</th>
                  <th>Porter Stem</th>
                  <th>WordNet Lemma</th>
                  <th>Context POS</th>
                  <th>Stopword?</th>
                </tr>
              </thead>
              <tbody>
                {morphology.map((m, idx) => (
                  <tr key={idx}>
                    <td><strong>{m.word}</strong></td>
                    <td style={{ color: "#4f46e5", fontFamily: "monospace" }}>{m.stem}</td>
                    <td style={{ color: "#059669", fontFamily: "monospace", fontWeight: 600 }}>{m.lemma}</td>
                    <td><span className={getPosClass(m.pos_tag)}>{m.pos_tag}</span></td>
                    <td>
                      <span className={`status-badge ${m.is_stopword ? "yes" : "no"}`}>
                        {m.is_stopword ? "Stopword" : "Content"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Tokens & Stopwords */}
      {activeTab === "tokens" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Identified Stopwords ({stopwords.count || 0})
            </h4>
            {stopwords.detected?.length > 0 ? (
              <div className="samples">
                {stopwords.detected.map((sw, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "#fee2e2",
                      color: "#991b1b",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {sw}
                  </span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "13px", color: "#64748b" }}>No common English stopwords found in this text.</div>
            )}
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>
              Text After Stopword Removal & Filtering
            </h4>
            <div
              style={{
                padding: "12px 14px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "13.5px",
                color: "#1e293b",
                lineHeight: 1.5,
              }}
            >
              {stopwords.filtered_text || "(No non-stopword tokens remaining)"}
            </div>
          </div>

          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>
              All Recognized Tokens ({tokens.length})
            </h4>
            <div className="token-list">
              {tokens.map((tok, idx) => (
                <span key={idx} className="token">
                  {tok.token}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Frequencies & Word Cloud */}
      {activeTab === "frequencies" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>Top Word Frequencies</h4>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Count</th>
                    <th>Relative Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {word_frequencies.map((item, idx) => {
                    const maxCount = word_frequencies[0]?.count || 1;
                    const pct = Math.round((item.count / maxCount) * 100);
                    return (
                      <tr key={idx}>
                        <td><strong>{item.word}</strong></td>
                        <td>{item.count}</td>
                        <td style={{ width: "50%" }}>
                          <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#4f46e5", borderRadius: "999px" }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "14px" }}>Generate Word Cloud</h4>
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                  Synthesize a visual word-frequency cloud from this message.
                </p>
              </div>
              <button
                type="button"
                className="btn secondary"
                onClick={handleGenerateCloud}
                disabled={cloudLoading}
              >
                <ImageIcon size={15} />
                {cloudLoading ? "Rendering Cloud…" : "Generate Word Cloud"}
              </button>
            </div>

            {cloudError ? (
              <div className="banner error">{cloudError}</div>
            ) : null}

            {wordCloudImg ? (
              <div style={{ textAlign: "center", background: "#ffffff", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
                <img
                  src={wordCloudImg}
                  alt="Word cloud visualization"
                  style={{ maxWidth: "100%", height: "auto", borderRadius: "8px" }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
