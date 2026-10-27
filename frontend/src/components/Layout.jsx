import { Outlet, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../nav.js";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

const SUBTITLES = {
  "/": "Classify SMS messages in real-time with trained TF-IDF Naive Bayes & examine NLP linguistics.",
  "/history": "View your private, user-isolated classification scans and manage privacy preferences.",
  "/evaluation": "Detailed test metrics, confusion matrix, and feature importance on held-out test data.",
  "/pos": "Part-of-Speech tagging with the Penn Treebank grammatical classification system.",
  "/similarity": "Compute cosine similarity between text vectors using Term Frequency-Inverse Document Frequency.",
};

export default function Layout() {
  const { pathname } = useLocation();
  const current = NAV_ITEMS.find((item) => item.to === pathname) || NAV_ITEMS[0];
  const subtitle = SUBTITLES[pathname] || "Natural Language Processing toolkit & machine learning classification.";

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <Header
          title={current.label}
          subtitle={subtitle}
        />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
