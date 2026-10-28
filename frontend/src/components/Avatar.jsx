import "./Avatar.css";

export default function Avatar({ initials, size = 36 }) {
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      {initials}
    </div>
  );
}