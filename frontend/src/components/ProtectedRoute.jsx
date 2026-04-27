import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading || user === null)
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-stone-400 text-sm uppercase tracking-widest">Loading...</div>
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
