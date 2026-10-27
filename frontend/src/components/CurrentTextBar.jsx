import { Link } from "react-router-dom";
import { useAppState } from "../AppState.jsx";

export default function CurrentTextBar() {
  const { text } = useAppState();
  const preview = text.trim() ? text.trim() : "No text selected yet.";

  return (
    <section className="panel row">
      <div className="current-text" title={preview}>
        {preview}
      </div>
      <Link className="btn secondary" to="/">
        Edit text
      </Link>
    </section>
  );
}
