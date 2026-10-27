import { useAppState } from "../AppState.jsx";
import CurrentTextBar from "../components/CurrentTextBar.jsx";
import EmptyState from "../components/EmptyState.jsx";
import ErrorBanner from "../components/ErrorBanner.jsx";
import ResultTable from "../components/ResultTable.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatCard from "../components/StatCard.jsx";

export default function TextStatistics() {
  const { analysis, error } = useAppState();
  const stats = analysis?.statistics;
  const frequencies = analysis?.word_frequencies || [];

  return (
    <div className="page">
      <CurrentTextBar />
      <ErrorBanner message={error} />
      <section className="panel">
        <SectionHeader title="Exploratory text statistics" description="Counts and frequent words from the submitted text." />
        {stats ? (
          <div className="cards">
            <StatCard label="Characters" value={stats.characters} />
            <StatCard label="Words" value={stats.words} />
            <StatCard label="Sentences" value={stats.sentences} />
            <StatCard label="Unique words" value={stats.unique_words} />
          </div>
        ) : (
          <EmptyState title="No statistics yet" message="Analyze text on Overview to populate these cards." />
        )}
      </section>
      <section className="panel">
        <SectionHeader title="Word frequencies" />
        <ResultTable
          columns={[
            { key: "word", label: "Word" },
            { key: "count", label: "Count" },
          ]}
          rows={frequencies}
          emptyMessage="Frequencies will appear after analysis is implemented."
        />
      </section>
    </div>
  );
}
