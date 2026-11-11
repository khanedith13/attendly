import "./Pill.css";

// tone: "success" | "info" | "warning" | "danger" | "neutral" | "primary"
export default function Pill({ tone = "neutral", children }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}
