import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutSkeleton } from "./ui/LayoutSkeleton";

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still checking auth state
  if (loading) {
    return <LayoutSkeleton />;
  }

  // Not logged in or user missing
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Role mismatch
  if (user.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // Allowed
  return children;
}
