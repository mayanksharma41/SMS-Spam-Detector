import { useAppState } from "../AppState.jsx";
import CurrentTextBar from "./CurrentTextBar.jsx";
import EmptyState from "./EmptyState.jsx";
import ErrorBanner from "./ErrorBanner.jsx";
import ResultTable from "./ResultTable.jsx";
import SectionHeader from "./SectionHeader.jsx";

export default function FeaturePage({ title, description, columns = [], rowsKey }) {
  const { analysis, error } = useAppState();
  const rows = analysis?.[rowsKey] || [];

  return (
    <div className="page">
      <CurrentTextBar />
      <ErrorBanner message={error} />
      <section className="panel">
        <SectionHeader title={title} description={description} />
        {!analysis ? (
          <EmptyState
            title="No analysis yet"
            message="Go to Overview, enter text, and click Analyze. NLP results will appear here in later phases."
          />
        ) : (
          <ResultTable columns={columns} rows={rows} />
        )}
      </section>
    </div>
  );
}
