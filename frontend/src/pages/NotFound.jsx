import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main style={{ padding: 40 }}>
      <h1>404</h1>
      <p>This page doesn't exist.</p>
      <Link to="/login">Back to login</Link>
    </main>
  );
}
