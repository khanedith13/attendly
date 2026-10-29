import "./MeterRow.css";

// tone: "primary" | "neutral"
export default function MeterRow({ label, value, percent, tone = "primary" }) {
  return (
    <div className="meter">
      <div className="meter__top">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="meter__track">
        <span className={`meter__fill meter__fill--${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}