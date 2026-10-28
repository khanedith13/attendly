import "./Card.css";

export default function Card({ title, className = "", children, ...rest }) {
  return (
    <section className={`card ${className}`.trim()} {...rest}>
      {title && <h3 className="card__title">{title}</h3>}
      {children}
    </section>
  );
}
