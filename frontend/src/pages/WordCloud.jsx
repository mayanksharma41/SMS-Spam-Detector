import { useState } from "react";
import { generateWordCloud } from "../api.js";
import { useAppState } from "../AppState.jsx";
import CurrentTextBar from "../components/CurrentTextBar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import SectionHeader from "../components/SectionHeader.jsx";

export default function WordCloudPage() {
  const { text } = useAppState();
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError("");
    setImage("");
    try {
      const data = await generateWordCloud(text);
      setImage(data.image || "");
    } catch (err) {
      setError(err.message || "Word cloud request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <CurrentTextBar />
      <section className="panel">
        <SectionHeader
          title="Word Cloud"
          description="Generated on the backend from the current input text."
        />
        <div className="actions">
          <span />
          <button type="button" className="btn" onClick={run} disabled={loading}>
            {loading ? "Generating…" : "Generate word cloud"}
          </button>
        </div>
      </section>
      <ErrorBanner message={error} />
      {image ? (
        <section className="panel">
          <img src={image} alt="Generated word cloud" style={{ maxWidth: "100%" }} />
        </section>
      ) : (
        <EmptyState title="No word cloud yet" message="Generate a cloud after entering text on Overview." />
      )}
    </div>
  );
}
