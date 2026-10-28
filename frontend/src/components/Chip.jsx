import "./Chip.css";

export default function Chip({ active = false, children, ...rest }) {
  return (
    <button type="button" className={active ? "chip chip--active" : "chip"} {...rest}>
      {children}
    </button>
  );
}