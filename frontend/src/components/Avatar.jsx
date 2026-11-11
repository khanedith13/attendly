import "./Avatar.css";

export default function Avatar({ initials, size = 36, src }) {
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {src ? <img src={src} alt="" /> : initials}
    </div>
  );
}
