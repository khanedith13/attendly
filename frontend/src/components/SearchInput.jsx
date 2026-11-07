import "./SearchInput.css";

export default function SearchInput({ value, onChange, placeholder, ref }) {
  return (
    <label className="search">
      <span className="search__icon">⌕</span>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}
