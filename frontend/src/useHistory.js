import { useState, useCallback } from "react";

const HISTORY_KEY = "sms_spam_history";
const MAX_HISTORY = 20;

/**
 * Hook to manage prediction history in localStorage.
 * Stores: { id, text (truncated), prediction, confidence, timestamp }
 * Does NOT store full message text by default for privacy.
 */
export function useHistory() {
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveToStorage = useCallback((items) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }, []);

  const addEntry = useCallback(
    (prediction) => {
      if (!prediction) return;
      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        // Store only first 80 characters for privacy
        textPreview: (prediction.text || "").slice(0, 80),
        prediction: prediction.prediction,
        isSpam: prediction.is_spam,
        confidence: prediction.confidence,
        timestamp: new Date().toISOString(),
      };
      const updated = [entry, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);
      saveToStorage(updated);
    },
    [history, saveToStorage]
  );

  const removeEntry = useCallback(
    (id) => {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      saveToStorage(updated);
    },
    [history, saveToStorage]
  );

  const clearAll = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { history, addEntry, removeEntry, clearAll };
}
