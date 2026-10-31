import Button from "./Button";
import "./ActionBanner.css";

export default function ActionBanner({ title, text, actionLabel, onAction }) {
  return (
    <div className="action-banner">
      <div>
        <div className="action-banner__title">{title}</div>
        <div className="action-banner__text">{text}</div>
      </div>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}