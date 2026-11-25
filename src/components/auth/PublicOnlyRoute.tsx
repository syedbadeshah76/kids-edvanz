import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Blocks already-authenticated users from accessing public marketing routes.
 * Redirects them to their role-appropriate dashboard. Use to wrap pages that
 * should only be visible to anonymous visitors.
 */
export const PublicOnlyRoute = ({
  children,
  redirectPath,
}: {
  children: React.ReactNode;
  redirectPath?: string;
}) => {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated && user) {
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
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

  return <>{children}</>;
};

export default PublicOnlyRoute;
