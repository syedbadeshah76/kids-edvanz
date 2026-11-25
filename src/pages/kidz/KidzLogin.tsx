import { Navigate } from "react-router-dom";

/**
 * KidzLogin page is removed in favor of the unified /login page.
 * Any legacy direct access redirects to /login.
 */
export function KidzLogin() {
  return <Navigate to="/login" replace />;
}

export const LoginPage = KidzLogin;
export default KidzLogin;
