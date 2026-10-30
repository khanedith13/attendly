import Switch from "./Switch";
import "./ToggleTile.css";

export default function ToggleTile({ title, description, checked, onChange }) {
  return (
    <div className="tile">
      <div className="tile__top">
        <span className="tile__title">{title}</span>
        <Switch checked={checked} onChange={onChange} label={title} />
      </div>
      <p className="tile__desc">{description}</p>
    </div>
  );
}