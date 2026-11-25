import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("student" | "admin" | "instructor" | "kids")[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role and learning sector
    const target =
      user.role === "admin"
        ? "/admin"
        : user.role === "instructor"
          ? "/instructor"
          : user.role === "kids" || user.learningSector === "KIDS"
            ? "/kidz"
            : "/dashboard";
    return <Navigate to={target} replace />;
  }

  // Redirect KIDS students trying to access main IT dashboard or general player
  if (user && (user.role === "kids" || user.learningSector === "KIDS")) {
    if (location.pathname.startsWith("/dashboard")) {
      return <Navigate to="/kidz" replace />;
    }
    if (location.pathname.startsWith("/learn/")) {
      const courseId = location.pathname.replace("/learn/", "");
      return <Navigate to={`/kidz/courses/${courseId}/learn`} replace />;
    }
  }

  return <>{children}</>;
};
