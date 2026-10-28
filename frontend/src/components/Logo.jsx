import "./Logo.css";

export default function Logo({ onDark = false }) {
  return (
    <div className={onDark ? "logo logo--on-dark" : "logo"}>
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
