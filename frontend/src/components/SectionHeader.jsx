export default function SectionHeader({ title, description }) {
  return (
    <div className="section-header">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
