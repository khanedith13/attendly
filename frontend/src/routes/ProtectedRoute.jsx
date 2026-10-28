import { Navigate, Outlet } from "react-router-dom";
import FullPageLoader from "../components/FullPageLoader";
import { useAuth } from "../hooks/useAuth";
import { homePath } from "../utils/roles";

export default function ProtectedRoute({ allowedRole }) {
  const { user, loading } = useAuth();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={homePath(user.role)} replace />;
  }
  return <Outlet />;
}
