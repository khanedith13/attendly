import "./FormField.css";

export default function SelectField({ label, id, error, children, ...selectProps }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={error ? "field__input field__input--error" : "field__input"}
        aria-invalid={Boolean(error)}
        {...selectProps}
      >
        {children}
      </select>
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
