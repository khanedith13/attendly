import Card from "./Card";
import "./StatCard.css";

// tone: "primary" | "success" | "warning" | "info"
export default function StatCard({ value, label, icon, tone = "primary" }) {
  return (
    <Card className="stat-card">
      <div>
        <div className="stat-card__value">{value}</div>
        <div className="stat-card__label">{label}</div>
      </div>
      <div className={`stat-card__icon stat-card__icon--${tone}`}>{icon}</div>
    </Card>
  );
}