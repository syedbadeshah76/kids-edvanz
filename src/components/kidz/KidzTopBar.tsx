import {
  Bell,
  Search,
  Flame,
  Check,
  Trash2,
  Video,
  MessageCircle,
  Info,
  ShoppingCart,
  BookOpen,
  X,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { LogoutConfirmModal } from "@/components/auth/LogoutConfirmModal";
import { useLogoutFlow } from "@/hooks/useLogoutFlow";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useKidzAuth } from "@/contexts/kidz/KidzAuthContext";
import { useCart } from "@/contexts/CartContext";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { notificationsService } from "@/services/kidz/notifications.service";
import { coursesService as kidzCoursesService } from "@/services/kidz/courses.service";
import type { CourseDTO, NotificationDTO } from "@/types/kidz/api.types";

function getKidzNotificationIcon(type?: string) {
  const t = String(type ?? "").toUpperCase();
  switch (t) {
    case "COURSE_UPDATE":
    case "COURSE":
      return <BookOpen className="size-3.5" />;
    case "LIVE_CLASS":
    case "LIVE_CLASS_REMINDER":
    case "LIVE_CLASS_STARTING":
      return <Video className="size-3.5" />;
    case "STREAK":
    case "BADGE":
      return <Flame className="size-3.5" />;
    case "INSTRUCTOR_REPLY":
    case "SUPPORT":
      return <MessageCircle className="size-3.5" />;
    default:
      return <Info className="size-3.5" />;
  }
}

function formatNotificationTime(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff) || diff < 0) return "Just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function KidzTopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, profile: authProfile, isAuthenticated, logout: kidzLogout } = useKidzAuth();
  const {
    logoutDialogOpen,
    setLogoutDialogOpen,
    loggingOut,
    handleLogout: baseHandleLogout,
    openLogoutModal,
  } = useLogoutFlow();
  const { itemCount: cartCount } = useCart();
  const { profile } = useAppState();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CourseDTO[]>([]);
  const [totalSuggestions, setTotalSuggestions] = useState<number>(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [liveNotifications, setLiveNotifications] = useState<NotificationDTO[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleConfirmLogout = async () => {
    try {
      await kidzLogout();
    } catch {
      /* continue */
    }
    await baseHandleLogout();
    toast.success("You've been signed out");
  };

  // Sync topbar search query with URL when on /kidz/explore
  useEffect(() => {
    if (location.pathname === "/kidz/explore") {
      setQuery(searchParams.get("q") ?? "");
    }
  }, [location.pathname, searchParams]);

  // Debounced search for keyword suggestions using /api/courses/searchfilters
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setTotalSuggestions(0);
      setIsSearching(false);
      setHighlightedIndex(-1);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await kidzCoursesService.searchCoursesFilters({
          keyword: trimmed,
          page: 0,
          size: 6,
          sortBy: "latest",
        });
        setSuggestions(res.courses || []);
        setTotalSuggestions(res.totalElements || res.courses?.length || 0);
      } catch (err) {
        console.warn("Failed to fetch search suggestions:", err);
        setSuggestions([]);
        setTotalSuggestions(0);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  // Dismiss suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    notificationsService
      .getNotifications()
      .then((data) => {
        setLiveNotifications(data);
      })
      .catch(() => {
        setLiveNotifications([]);
      });
  }, [isAuthenticated]);

  const currentStudentName =
    user?.displayName || user?.firstName || authProfile?.firstName || profile.name;

  const isValidHttpUrl = (url?: unknown): url is string =>
    typeof url === "string" && /^https?:\/\//i.test(url.trim());

  const currentAvatar =
    (user?.avatarUrl && isValidHttpUrl(user.avatarUrl))
      ? user.avatarUrl.trim()
      : (authProfile?.avatarUrl && isValidHttpUrl(authProfile.avatarUrl))
      ? authProfile.avatarUrl.trim()
      : "";

  const unreadNotifications = liveNotifications.filter((n) => !n.read);

  const submitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = query.trim().slice(0, 80);
    if (!q) {
      toast.error("Type something to search first");
      return;
    }
    setShowSuggestions(false);
    navigate(`/kidz/explore?q=${encodeURIComponent(q)}&subject=All`);
  };

  const handleSelectCourse = (courseId: string) => {
    setShowSuggestions(false);
    navigate(`/kidz/courses/${courseId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectCourse(suggestions[highlightedIndex].id);
      } else {
        submitSearch(e);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    if (location.pathname === "/kidz/explore") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("q");
      const qs = nextParams.toString();
      navigate(qs ? `/kidz/explore?${qs}` : "/kidz/explore", { replace: true });
    }
    inputRef.current?.focus();
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setLiveNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch {
      setLiveNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleMarkRead = async (id: string, actionUrl?: string) => {
    try {
      await notificationsService.markAsRead(id);
    } catch {
      /* continue */
    }
    setLiveNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      <div ref={searchContainerRef} className="relative flex items-center gap-3 flex-1 max-w-xl">
        <SidebarTrigger className="rounded-xl text-slate-600 hover:bg-slate-100 shrink-0" />

        <form onSubmit={submitSearch} className="relative w-full" role="search">
          <Input
            ref={inputRef}
            value={query}
            maxLength={80}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              if (query.trim().length >= 2) setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search for Courses, Teachers, Subjects"
            className={`h-10 rounded-full border-slate-200 bg-slate-50/80 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all ${
              query ? "pr-16" : "pr-10"
            }`}
            aria-label="Search courses"
            autoComplete="off"
          />
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isSearching && (
              <Loader2 className="size-4 animate-spin text-blue-600" />
            )}
            {query && !isSearching && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="submit"
              aria-label="Submit search"
              className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-200/60 cursor-pointer"
            >
              <Search className="size-4" />
            </button>
          </div>

          {/* Suggestions Dropdown Popover */}
          {showSuggestions && query.trim().length >= 2 && (
            <div
              className="absolute left-0 right-0 top-full mt-2 z-[100] rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
              role="listbox"
            >
              {isSearching && suggestions.length === 0 ? (
                <div className="flex items-center gap-3 p-4 text-xs font-semibold text-slate-500">
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                  <span>Searching for "{query.trim()}"...</span>
                </div>
              ) : suggestions.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <span>Course Suggestions</span>
                    <span className="text-blue-600 font-extrabold">
                      {totalSuggestions > 0 ? `${totalSuggestions} found` : `${suggestions.length} results`}
                    </span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {suggestions.map((course, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      const thumb =
                        course.thumbnailUrl ||
                        (course as any).thumbnail ||
                        (course as any).coverImage;
                      const level = course.level || "Beginner";
                      const priceStr =
                        course.discountedPrice != null
                          ? `₹${course.discountedPrice}`
                          : course.price != null
                          ? `₹${course.price}`
                          : course.isFree
                          ? "Free"
                          : "";

                      return (
                        <div
                          key={course.id || idx}
                          role="option"
                          aria-selected={isHighlighted}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onClick={() => handleSelectCourse(course.id)}
                          className={`flex items-center gap-3.5 p-3 transition-colors cursor-pointer ${
                   isHighlighted
  ? "bg-blue-50"
  : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="relative size-12 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/60">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={course.title}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-blue-50 text-blue-600">
                                <BookOpen className="size-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {course.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 text-[10px]">
                                {level}
                              </span>
                              {course.totalLessons != null && course.totalLessons > 0 && (
                                <span>
                                  {course.totalLessons} {course.totalLessons === 1 ? "lesson" : "lessons"}
                                </span>
                              )}
                              {priceStr && (
                                <span className="font-bold text-emerald-600 ml-auto">
                                  {priceStr}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-100 p-2 bg-slate-50/60">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSuggestions(false);
                        navigate(`/kidz/explore?q=${encodeURIComponent(query.trim())}&subject=All`);
                      }}
                      className="w-full rounded-xl py-2 px-3 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>View all results for "{query.trim()}"</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-xs font-bold text-slate-800">
                    No courses found matching "{query.trim()}"
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Try searching by another keyword or explore all courses
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuggestions(false);
                      navigate("/kidz/explore");
                    }}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
                  >
                    Go to Explore Courses →
                  </button>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notifications Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative size-10 rounded-full text-slate-600 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell className="size-5" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unreadNotifications.length > 9 ? "9+" : unreadNotifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-lg">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Notifications
                </span>
                {unreadNotifications.length > 0 && (
                  <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-600">
                    {unreadNotifications.length}
                  </span>
                )}
              </div>
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {liveNotifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No notifications yet! Keep learning.
                </div>
              ) : (
                liveNotifications.slice(0, 10).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleMarkRead(n.id, n.actionUrl)}
                    className="flex items-start gap-3 rounded-xl p-2.5 cursor-pointer hover:bg-slate-50"
                  >
                    <div className="mt-0.5 rounded-full bg-blue-50 p-1.5 text-blue-600 shrink-0">
                      {getKidzNotificationIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs ${
                            n.read
                              ? "text-muted-foreground font-medium"
                              : "font-bold text-slate-900"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.createdAt && (
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatNotificationTime(n.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                    </div>
                    {!n.read && (
                      <span
                        className="size-2 shrink-0 rounded-full bg-primary mt-1.5"
                        aria-label="Unread"
                      />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Shopping Cart Button */}
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-full text-slate-600 hover:bg-slate-100"
          asChild
          aria-label="Shopping Cart"
        >
          <Link to="/cart">
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User Profile Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full bg-orange-100 py-1 pl-1 pr-3 text-xs font-bold text-orange-800 transition-transform hover:scale-105 focus-visible:outline-none"
              aria-label="Account menu"
            >
              <span className="grid size-7 place-items-center rounded-full bg-orange-200 text-sm overflow-hidden">
                {currentAvatar ? (
                  <img
                    src={currentAvatar}
                    alt={currentStudentName}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] font-black text-orange-900">
                    {currentStudentName.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span>{currentStudentName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-2xl">
            <DropdownMenuLabel>{currentStudentName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-xl">
              <Link to="/kidz/profile">My Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-xl">
              <Link to="/kidz/my-learning">My Learning</Link>
            </DropdownMenuItem>
            {/* Temporarily commented out as requested */}
            {/* <DropdownMenuItem asChild className="rounded-xl">
              <Link to="/kidz/support">Help Centre</Link>
            </DropdownMenuItem> */}
            <DropdownMenuSeparator />
            {isAuthenticated ? (
              <DropdownMenuItem
                className="rounded-xl text-red-600 cursor-pointer"
                onSelect={(e) => {
                  e.preventDefault();
                  openLogoutModal();
                }}
              >
                Sign Out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild className="rounded-xl text-blue-600 font-bold">
                <Link to="/login">Sign In with OTP</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <LogoutConfirmModal
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleConfirmLogout}
        loading={loggingOut}
      />
    </header>
  );
}

export const TopBar = KidzTopBar;
