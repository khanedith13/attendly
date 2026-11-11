import "./FormField.css";

export default function TextareaField({ label, id, hint, error, ...textareaProps }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={`field__input field__textarea${error ? " field__input--error" : ""}`}
        aria-invalid={Boolean(error)}
        {...textareaProps}
      />
      {error ? (
        <p className="field__error">{error}</p>
      ) : (
        hint && <p className="field__hint">{hint}</p>
      )}
    </div>
  );
}
