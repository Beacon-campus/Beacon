import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingState from "./ui/LoadingState";

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still checking auth state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <LoadingState size="lg" />
      </div>
    );
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
