import "./EventCover.css";

// tone: "violet" | "blue" | "green"
export default function EventCover({ tone = "violet", height = 104 }) {
  return <div className={`event-cover event-cover--${tone}`} style={{ height }} />;
}