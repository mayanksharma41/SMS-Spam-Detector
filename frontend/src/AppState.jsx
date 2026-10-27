import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { analyzeText, getHealth, getModelMetrics, getSamples } from "./api.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [text, setText] = useState("");
  const [samples, setSamples] = useState([]);
  const [datasetNote, setDatasetNote] = useState("");
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ ok: false }));

    getModelMetrics()
      .then(setMetrics)
      .catch(() => setMetrics(null))
      .finally(() => setMetricsLoading(false));

    getSamples()
      .then((data) => {
        setSamples(data.samples || []);
        setDatasetNote(data.dataset_note || "");
      })
      .catch(() => {
        setSamples([]);
        setDatasetNote("Could not load sample texts from the backend.");
      });
  }, []);

  async function analyze(customText) {
    const targetText = typeof customText === "string" ? customText : text;
    const trimmed = targetText.trim();
    if (!trimmed) {
      setError("Please enter or select an SMS message to analyze.");
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await analyzeText(trimmed);
      setAnalysis(result);
    } catch (err) {
      setAnalysis(null);
      setError(err.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function applySample(sample) {
    setText(sample.text);
    setError("");
  }

  const value = useMemo(
    () => ({
      text,
      setText,
      samples,
      datasetNote,
      health,
      metrics,
      metricsLoading,
      analysis,
      loading,
      error,
      setError,
      analyze,
      applySample,
    }),
    [text, samples, datasetNote, health, metrics, metricsLoading, analysis, loading, error]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("useAppState must be used inside AppProvider");
  }
  return value;
}
