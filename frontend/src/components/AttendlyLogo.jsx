
export default function AttendlyLogo({
  size = 40,
  showName = true,
  className = "",
}) {
  return (
    <div
      className={`attendly-brand ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <img
        src="/attendly.svg"
        alt="Attendly logo"
        width={size}
        height={size}
        style={{
          display: "block",
          borderRadius: Math.round(size * 0.28),
          flexShrink: 0,
        }}
      />

      {showName && (
        <span
          style={{
            fontSize: size * 0.55,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "inherit",
            lineHeight: 1,
          }}
        >
          Attendly
        </span>
      )}
    </div>
  );
}
