import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";

/**
 * Shared hook for triggering the Figma-aligned logout confirmation flow.
 * Used by ProfileDropdownMenu and DashboardSidebar for identical logout behavior.
 */
export const useLogoutFlow = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } catch {
      /* fallback */
    } finally {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("kidzy-app-state") ||
              key.startsWith("edvanz_kidz_") ||
              key.startsWith("kidz_") ||
              key === "Edvanz_user" ||
              key === "edvanz_user")
          ) {
            keysToRemove.push(key);
          }
        }
        for (const k of keysToRemove) {
          localStorage.removeItem(k);
        }
      } catch {}

      logout();
      setLoggingOut(false);
      setLogoutDialogOpen(false);
      navigate("/", { replace: true });
    }
  }, [logout, navigate]);

  const openLogoutModal = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  return {
    logoutDialogOpen,
    setLogoutDialogOpen,
    loggingOut,
    handleLogout,
    openLogoutModal,
  };
};

export default useLogoutFlow;
