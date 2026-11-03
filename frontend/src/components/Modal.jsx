import { useEffect, useRef } from "react";
import "./Modal.css";

export default function Modal({ title, onClose, children, hideHeader = false, maxWidth }) {
  const dialogRef = useRef(null);

  // Move keyboard focus into the dialog when it opens.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {!hideHeader && (
          <div className="modal__head">
            <h3>{title}</h3>
            <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
              ✕
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}