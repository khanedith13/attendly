import "./MiniStat.css";

export default function MiniStat({ label, value }) {
  return (
    <div className="mini-stat">
      <div className="mini-stat__label">{label}</div>
      <div className="mini-stat__value">{value}</div>
    </div>
  );
}
