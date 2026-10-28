import "./Stepper.css";

function stateOf(number, current) {
  if (number === current) return "active";
  return number < current ? "done" : "todo";
}

export default function Stepper({ steps, current }) {
  return (
    <ol className="stepper">
      {steps.map((label, index) => {
        const number = index + 1;
        return (
          <li key={label} className={`stepper__step stepper__step--${stateOf(number, current)}`}>
            <span className="stepper__dot">{number}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
