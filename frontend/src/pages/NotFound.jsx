import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { homePath } from "../utils/roles";

export default function NotFound() {
  const { user } = useAuth();

  return (
    <main className="not-found">
      <h1>404</h1>
      <p>This page doesn't exist.</p>
      <Link to={user ? homePath(user.role) : "/login"} className="not-found__link">
        {user ? "Back to dashboard" : "Back to login"}
      </Link>
    </main>
  );
}