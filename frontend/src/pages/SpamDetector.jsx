import { useAppState } from "../AppState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import StatCard from "../components/StatCard.jsx";
import TextInputPanel from "../components/TextInputPanel.jsx";
import PredictionResult from "../components/PredictionResult.jsx";
import NlpInspector from "../components/NlpInspector.jsx";

export default function SpamDetector() {
  const { analysis, error, loading } = useAppState();
  const stats = analysis?.statistics;
  const prediction = analysis?.prediction;

  return (
    <div className="page">
      <TextInputPanel />

      <ErrorBanner message={error} />
      {loading ? (
        <div className="banner info">
          Evaluating message through TF-IDF Vectorizer and Multinomial Naive Bayes model…
        </div>
      ) : null}

      {/* Main ML Prediction Result */}
      {prediction ? (
        <PredictionResult prediction={prediction} />
      ) : null}

      {/* Message Statistics Cards */}
      {stats ? (
        <div className="cards six-col">
          <StatCard label="Words" value={stats.words} />
          <StatCard label="Characters" value={stats.characters} />
          <StatCard label="Sentences" value={stats.sentences} />
          <StatCard label="Unique Words" value={stats.unique_words} />
          <StatCard label="ALL-CAPS Words" value={stats.uppercase_words_count} />
          <StatCard label="Digits / Numbers" value={stats.digits_count} />
        </div>
      ) : null}

      {/* Deep-dive NLP Inspector */}
      {analysis ? (
        <NlpInspector analysis={analysis} />
      ) : null}
    </div>
  );
}
