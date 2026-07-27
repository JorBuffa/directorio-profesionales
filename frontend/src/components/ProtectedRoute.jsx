import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to={role === "admin" ? "/admin-login" : "/soy-profesional"} replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}
