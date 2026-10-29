import Avatar from "./Avatar";
import Pill from "./Pill";
import "./Topbar.css";

export default function Topbar({ roleLabel, pageLabel, variant, initials, badge }) {
  function renderExtra() {
    if (badge?.text) return <Pill tone={badge.tone}>{badge.text}</Pill>;
    if (badge?.icon) {
      return (
        <button type="button" className="icon-btn" aria-label="Search">
          {badge.icon}
        </button>
      );
    }
    if (variant === "reviews") return <Pill tone="warning">3 reviews needed</Pill>;
    return (
      <button type="button" className="icon-btn" aria-label="Notifications">
        ♢<span className="icon-btn__dot" />
      </button>
    );
  }

  return (
    <header className="topbar">
      <div className="topbar__crumb">
        <b>{roleLabel}</b> / {pageLabel}
      </div>

      <div className="topbar__actions">
        {renderExtra()}
        <Avatar initials={initials} />
      </div>
    </header>
  );
}
