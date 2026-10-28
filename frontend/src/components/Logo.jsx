import "./Logo.css";

export default function Logo({ onDark = false, large = false }) {
  const classes = ["logo", onDark && "logo--on-dark", large && "logo--lg"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <span className="logo__mark">
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path
            d="M19 33.5l9 9L45.5 22.5"
            fill="none"
            stroke="#fff"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="logo__text">Attendly</span>
    </div>
  );
}
