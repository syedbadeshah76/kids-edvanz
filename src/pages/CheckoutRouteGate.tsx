import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Route guard for public /checkout.
 * - Logged-in students are routed according to their sector:
 *   - KIDS students -> /kidz/checkout
 *   - IT / default students -> /dashboard/checkout
 * - Non-students or guests -> /dashboard/checkout (which ProtectedRoute redirects to login)
 */
export const CheckoutRouteGate = () => {
  const { user } = useAuth();
  if (user?.role === "kids" || user?.learningSector === "KIDS") {
    return <Navigate to="/kidz/checkout" replace />;
  }
  return <Navigate to="/dashboard/checkout" replace />;
};

export default CheckoutRouteGate;
