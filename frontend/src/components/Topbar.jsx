import Avatar from "./Avatar";
import Pill from "./Pill";
import "./Topbar.css";

export default function Topbar({ roleLabel, pageLabel, variant, initials }) {
  return (
    <header className="topbar">
      <div className="topbar__crumb">
        <b>{roleLabel}</b> / {pageLabel}
      </div>

      <div className="topbar__actions">
        {variant === "reviews" ? (
          <Pill tone="warning">3 reviews needed</Pill>
        ) : (
          <button type="button" className="icon-btn" aria-label="Notifications">
            ♢<span className="icon-btn__dot" />
          </button>
        )}
        <Avatar initials={initials} />
      </div>
    </header>
  );
}
