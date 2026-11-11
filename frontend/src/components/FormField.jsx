import "./FormField.css";

export default function FormField({ label, id, hint, error, ...inputProps }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={error ? "field__input field__input--error" : "field__input"}
        aria-invalid={Boolean(error)}
        {...inputProps}
      />
      {error ? (
        <p className="field__error">{error}</p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}
