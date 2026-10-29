import "./SearchInput.css";

export default function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="search">
      <span className="search__icon">⌕</span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  );
}
