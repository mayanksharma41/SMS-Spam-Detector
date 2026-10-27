import { useAppState } from "../AppState.jsx";
import { Tags, Sparkles } from "lucide-react";
import CurrentTextBar from "../components/CurrentTextBar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

export default function PosTagging() {
  const { analysis, text, setText, analyze, loading, error } = useAppState();
  const posTags = analysis?.pos_tags || [];

  function getTagBadgeStyle(tag) {
    if (tag.startsWith("NN")) return { bg: "#dbeafe", color: "#1e40af", type: "Noun" };
    if (tag.startsWith("VB")) return { bg: "#dcfce7", color: "#166534", type: "Verb" };
    if (tag.startsWith("JJ")) return { bg: "#fef3c7", color: "#92400e", type: "Adjective" };
    if (tag.startsWith("RB")) return { bg: "#f3e8ff", color: "#6b21a8", type: "Adverb" };
    if (tag === "CD") return { bg: "#ffedd5", color: "#c2410c", type: "Number" };
    if (tag.startsWith("PRP")) return { bg: "#e0e7ff", color: "#3730a3", type: "Pronoun" };
    if ([".", ",", ":", "$"].includes(tag)) return { bg: "#f1f5f9", color: "#64748b", type: "Punctuation" };
    return { bg: "#e2e8f0", color: "#334155", type: "Other" };
  }

  // Count POS broad categories
  const categoryCounts = posTags.reduce((acc, item) => {
    const meta = getTagBadgeStyle(item.tag);
    acc[meta.type] = (acc[meta.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page">
      <CurrentTextBar />
      <ErrorBanner message={error} />

      {/* If no analysis, show quick action input */}
      {!analysis && (
        <section className="panel">
          <SectionHeader
            title="Analyze Part-of-Speech Tagging"
            description="Type text or enter an SMS to inspect word categories with the Penn Treebank tagger."
          />
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <input
              type="text"
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Free entry in a weekly competition to win £900 cash reward"
            />
            <button
              type="button"
              className="btn"
              onClick={() => analyze()}
              disabled={loading || !text.trim()}
            >
              <Sparkles size={16} />
              {loading ? "Tagging…" : "Tag POS"}
            </button>
          </div>
        </section>
      )}

      {posTags.length > 0 && (
        <>
          {/* Category distribution pills */}
          <section className="panel" style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
              Grammatical Distribution:
            </div>
            <div className="samples">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <span
                  key={cat}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: "#f1f5f9",
                    color: "#1e293b",
                    fontSize: "12.5px",
                    fontWeight: 600,
                  }}
                >
                  {cat}: {count}
                </span>
              ))}
            </div>
          </section>

          {/* Table */}
          <section className="panel">
            <SectionHeader
              title="Penn Treebank POS Tags"
              description={`Full word-by-word token breakdown (${posTags.length} tokens detected).`}
            />

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "25%" }}>Word / Token</th>
                    <th style={{ width: "20%" }}>POS Tag Code</th>
                    <th style={{ width: "20%" }}>Category</th>
                    <th>Grammatical Function & Description</th>
                  </tr>
                </thead>
                <tbody>
                  {posTags.map((item, idx) => {
                    const meta = getTagBadgeStyle(item.tag);
                    return (
                      <tr key={idx}>
                        <td>
                          <strong>{item.word}</strong>
                        </td>
                        <td>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: "12px",
                              background: meta.bg,
                              color: meta.color,
                            }}
                          >
                            {item.tag}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "12.5px", color: meta.color, fontWeight: 600 }}>
                            {meta.type}
                          </span>
                        </td>
                        <td style={{ color: "#475569" }}>{item.description}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!analysis && (
        <EmptyState
          title="No POS tags generated yet"
          message="Enter an SMS above or on the SMS Spam Detector page to view grammatical tagging."
        />
      )}
    </div>
  );
}
