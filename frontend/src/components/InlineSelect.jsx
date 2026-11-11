import "./InlineSelect.css";

export default function InlineSelect({ value, onChange, options, label, width }) {
  return (
    <select
      className="inline-select"
      value={value}
      onChange={onChange}
      aria-label={label}
      style={width ? { width } : undefined}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
