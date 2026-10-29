import "./Notice.css";

// tone: "danger" | "success" | "info"
export default function Notice({ tone = "danger", children }) {
  return (
    <p className={`notice notice--${tone}`} role={tone === "danger" ? "alert" : "status"}>
      {children}
    </p>
  );
}