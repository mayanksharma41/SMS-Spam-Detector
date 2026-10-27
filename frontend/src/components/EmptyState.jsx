export default function EmptyState({ title, message }) {
  return (
    <div className="card empty">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
