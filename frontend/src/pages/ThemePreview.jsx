import Logo from "../components/Logo";

const swatches = [
  ["--primary", "Primary"],
  ["--navy", "Sidebar"],
  ["--bg", "Page background"],
  ["--surface", "Card"],
  ["--text", "Text"],
  ["--text-muted", "Muted text"],
  ["--border", "Border"],
  ["--violet", "Violet"],
];

const pills = ["success", "info", "warning", "danger", "neutral"];

export default function ThemePreview() {
  return (
    <main style={{ padding: 40, display: "grid", gap: 24, maxWidth: 800 }}>
      <h1 style={{ fontSize: 26, letterSpacing: "-0.5px" }}>Theme preview</h1>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ padding: 24, background: "var(--surface)", borderRadius: "var(--radius-card)" }}>
          <Logo />
        </div>
        <div style={{ padding: 24, background: "var(--navy)", borderRadius: "var(--radius-card)" }}>
          <Logo onDark />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {swatches.map(([variable, label]) => (
          <div key={variable} style={{ width: 90, fontSize: 11 }}>
            <div
              style={{
                height: 48,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: `var(${variable})`,
              }}
            />
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        {pills.map((name) => (
          <span
            key={name}
            style={{
              padding: "5px 12px",
              borderRadius: "var(--radius-pill)",
              fontSize: 10,
              fontWeight: 700,
              background: `var(--${name}-bg)`,
              color: `var(--${name}-text)`,
            }}
          >
            {name}
          </span>
        ))}
      </div>

      <button
        style={{
          width: "fit-content",
          padding: "12px 16px",
          border: 0,
          borderRadius: "var(--radius-btn)",
          background: "var(--primary)",
          color: "#fff",
          fontWeight: 700,
          boxShadow: "var(--shadow-btn)",
        }}
      >
        Primary button
      </button>
    </main>
  );
}