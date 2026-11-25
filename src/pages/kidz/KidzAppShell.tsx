import { Outlet, Navigate } from "react-router-dom";

import { KidzSidebar } from "@/components/kidz/KidzSidebar";
import { KidzTopBar } from "@/components/kidz/KidzTopBar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { KidzAuthProvider } from "@/contexts/kidz/KidzAuthContext";
import { AppStateProvider } from "@/lib/kidz/kidz-app-state";
import "./kidz.css";

export function KidzAppShell() {
  const { user } = useAuth();

  if (user) {
    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === "instructor") {
      return <Navigate to="/instructor" replace />;
    }
    if (user.role === "student" && user.learningSector !== "KIDS") {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return (
    <KidzAuthProvider>
      <AppStateProvider>
        <div className="kidz-portal min-h-screen w-full bg-[#f8fafc] text-[#1e293b]">
          <SidebarProvider>
            <div className="flex min-h-screen w-full">
              <KidzSidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <KidzTopBar />
                <main className="flex-1 px-4 py-6 sm:px-8">
                  <Outlet />
                </main>
              </div>
            </div>
          </SidebarProvider>
        </div>
      </AppStateProvider>
    </KidzAuthProvider>
  );
}

export default KidzAppShell;
