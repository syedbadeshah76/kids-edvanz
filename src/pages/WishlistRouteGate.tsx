import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/layout/MainLayout";
import Wishlist from "./Wishlist";

/**
 * Route guard for /wishlist.
 * - Logged-in students are redirected to /dashboard/wishlist
 *   (which mounts <Wishlist /> under student dashboard chrome).
 * - Guests and public visitors see Wishlist wrapped in MainLayout.
 */
export const WishlistRouteGate = () => {
  const { user } = useAuth();
  if (user?.role === "kids" || user?.learningSector === "KIDS") {
    return <Navigate to="/kidz/wishlist" replace />;
  }
  if (user?.role === "student") {
    return <Navigate to="/dashboard/wishlist" replace />;
  }
  return (
    <MainLayout>
      <Wishlist />
    </MainLayout>
  );
};

export default WishlistRouteGate;
