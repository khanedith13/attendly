import "./SettingRow.css";

export default function SettingRow({ title, description, last = false, children }) {
  return (
    <div className={last ? "setting-row setting-row--last" : "setting-row"}>
      <div>
        <div className="setting-row__title">{title}</div>
        {description && <div className="setting-row__desc">{description}</div>}
      </div>
      {children}
    </div>
  );
}