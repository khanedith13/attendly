import "./Card.css";

export default function Card({ title, action, className = "", children, ...rest }) {
  return (
    <section className={`card ${className}`.trim()} {...rest}>
      {(title || action) && (
        <div className="card__header">
          {title && <h3 className="card__title">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
