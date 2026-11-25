import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpenCheck,
  Compass,
  Shapes,
  Route as RouteIcon,
  Video,
  Brain,
  Trophy,
  Medal,
  UserRound,
  Settings,
  Heart,
} from "lucide-react";

import edvanzLogo from "@/assets/kidz/edvanz-logo.png";
import pandaAvatar from "@/assets/kidz/panda-avatar.jpg";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/kidz", icon: LayoutDashboard },
  { title: "My Learning", url: "/kidz/my-learning", icon: BookOpenCheck },
  { title: "Explore Courses", url: "/kidz/explore", icon: Compass },
  { title: "Subjects", url: "/kidz/subjects", icon: Shapes },
  // { title: "Learning Path", url: "/kidz/learning-path", icon: RouteIcon },
  { title: "Live Classes", url: "/kidz/live-classes", icon: Video },
  { title: "Quizzes", url: "/kidz/quizzes", icon: Brain },
  { title: "Achievements", url: "/kidz/achievements", icon: Trophy },
  // { title: "Leaderboard", url: "/kidz/leaderboard", icon: Medal },
  { title: "Wishlist", url: "/kidz/wishlist", icon: Heart },
  { title: "Profile", url: "/kidz/profile", icon: UserRound },
  { title: "Settings", url: "/kidz/settings", icon: Settings },
];

export function KidzSidebar() {
  const { state } = useSidebar();
  const { pathname } = useLocation();
  const collapsed = state === "collapsed";
  const isActive = (path: string) => {
    if (path === "/kidz") {
      return pathname === "/kidz" || pathname === "/kidz/" || pathname === "/kidz/dashboard";
    }
    if (path === "/kidz/my-learning") {
      return pathname === "/kidz/my-learning" || pathname.includes("/learn");
    }
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-100 bg-white">
      <SidebarHeader className="px-5 pt-5 pb-2">
        <Link to="/kidz" className="flex items-center">
          {collapsed ? (
            <div className="relative flex size-9 items-center justify-center overflow-hidden rounded-xl">
              <img
                src={edvanzLogo}
                alt="Edvanz Kidz"
                className="h-16 w-auto max-w-none object-contain scale-[2.8] -translate-x-5"
              />
            </div>
          ) : (
            <div className="relative flex h-14 w-44 items-center justify-center overflow-hidden">
              <img
                src={edvanzLogo}
                alt="Edvanz Kidz - Beyond Learning"
                className="h-[55px] w-auto max-w-none object-contain scale-[2.5] -translate-y-0.5"
              />
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="flex flex-col justify-between px-3 pb-6">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={`h-11 rounded-2xl px-4 transition-all ${
                        active
                          ? "bg-blue-50/90 text-blue-600 font-extrabold shadow-2xs"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold"
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3.5">
                        <item.icon
                          className={`size-5 stroke-[2.2] ${
                            active ? "text-blue-600" : "text-slate-600"
                          }`}
                        />
                        <span className="text-sm tracking-tight">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Temporarily commented out help/support as requested */}
        {/* {!collapsed && (
          <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50/80 p-4 text-center">
            <div className="mx-auto mb-2 size-16 overflow-hidden rounded-2xl shadow-xs">
              <img
                src={pandaAvatar}
                alt="Panda Support Assistant"
                className="size-full object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Need Help?</h4>
            <p className="mt-0.5 text-xs text-slate-500">We are here to help you!</p>
            <Button
              asChild
              size="sm"
              className="mt-3 w-full rounded-xl bg-blue-100 text-xs font-bold text-blue-600 hover:bg-blue-200 hover:text-blue-700 shadow-none border-none"
            >
              <Link to="/kidz/support">Contact Support</Link>
            </Button>
          </div>
        )} */}
      </SidebarContent>
    </Sidebar>
  );
}

export const AppSidebar = KidzSidebar;
