export default function StatCard({ label, value }) {
  return (
    <article className="card stat-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </article>
  );
}
