import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Calendar, ChevronLeft, ChevronRight, Sparkles, Video } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { demoClassService, parseDemoDate } from "@/services/demoClass.service";

export interface CatalogDemoClassItem {
  demoClassId: string;
  courseId: string;
  courseTitle: string;
  demoClassTitle: string;
  description: string;
  learningSector: "IT" | "KIDS";
  scheduledStartAt: string;
  scheduledEndAt?: string;
  durationMinutes?: number;
  status: string;
  instructorName: string;
}

function getInitials(name?: string): string {
  if (!name) return "ED";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDemoDateTime(startStr?: string, endStr?: string, duration?: number) {
  if (!startStr) return { date: "Upcoming", time: "TBA", month: "LIVE" };

  const parsedTs = parseDemoDate(startStr);
  const startDate = parsedTs ? new Date(parsedTs) : new Date(startStr);

  if (isNaN(startDate.getTime())) return { date: "Upcoming", time: "TBA", month: "LIVE" };

  const day = startDate.getDate();
  const month = startDate.toLocaleString("en-US", { month: "short" });
  const year = startDate.getFullYear();
  const dateFormatted = `${day} ${month} ${year}`;

  const formatTime = (d: Date) =>
    d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  const startTime = formatTime(startDate);

  let endTime = "";
  if (endStr) {
    const endTs = parseDemoDate(endStr);
    const endDate = endTs ? new Date(endTs) : new Date(endStr);
    if (!isNaN(endDate.getTime())) {
      endTime = formatTime(endDate);
    }
  } else if (duration) {
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
    endTime = formatTime(endDate);
  }

  const timeFormatted = endTime ? `${startTime} – ${endTime}` : startTime;

  return { date: dateFormatted, time: timeFormatted, month: month.toUpperCase() };
}

export const LiveDemoBanner = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [classes, setClasses] = useState<CatalogDemoClassItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadDemoClasses() {
      setIsLoading(true);
      try {
        const fetched = await demoClassService.getCatalogDemoClasses();
        if (!isMounted) return;

        if (Array.isArray(fetched) && fetched.length > 0) {
          const mapped: CatalogDemoClassItem[] = fetched.map((item: any, idx: number) => {
            const rawSector = String(item.learningSector || item.sector || "").trim().toUpperCase();
            const learningSector: "IT" | "KIDS" =
              rawSector === "KIDS"
                ? "KIDS"
                : rawSector === "IT"
                ? "IT"
                : String(item.courseTitle || item.demoClassTitle || "").toLowerCase().includes("kid")
                ? "KIDS"
                : "IT";

            return {
              demoClassId: item.demoClassId || item.id || `fetched-${idx}`,
              courseId: item.courseId || item.liveCourseId || "08129a81-e20b-4147-a29e-0a9b3205b351",
              courseTitle: item.courseTitle || item.demoClassTitle || item.title || "Live Course",
              demoClassTitle: item.demoClassTitle || item.title || "Live Demo Class",
              description: item.description || "Interactive Live Demo Session",
              learningSector,
              scheduledStartAt: item.scheduledStartAt || item.scheduledAt || new Date().toISOString(),
              scheduledEndAt: item.scheduledEndAt,
              durationMinutes: item.durationMinutes || item.duration || 30,
              status: item.status || "SCHEDULED",
              instructorName: item.instructorName || item.instructor?.name || "Edvanz Instructor",
            };
          });

          // Sort chronologically ascending based on scheduledStartAt
          mapped.sort((a, b) => {
            const tA = parseDemoDate(a.scheduledStartAt) || 0;
            const tB = parseDemoDate(b.scheduledStartAt) || 0;
            return tA - tB;
          });

          setClasses(mapped);
        } else {
          setClasses([]);
        }
      } catch (e) {
        console.error("Error loading catalog demo classes:", e);
        if (isMounted) setClasses([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDemoClasses();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleJoinDemo = (classItem: CatalogDemoClassItem) => {
    const targetCourseId = classItem.courseId || "08129a81-e20b-4147-a29e-0a9b3205b351";
    const coursePath = `/courses/${targetCourseId}`;

    if (isAuthenticated) {
      navigate(coursePath);
      return;
    }

    // Check if user already has an account
    const hasAccount =
      localStorage.getItem("edvanz_has_account") === "true" ||
      !!localStorage.getItem("Edvanz_user");

    if (hasAccount) {
      // Redirect to Login page / modal
      navigate(`/?auth=login&redirect=${encodeURIComponent(coursePath)}`);
    } else {
      // Redirect to Register page / modal
      navigate(`/?auth=signup&redirect=${encodeURIComponent(coursePath)}`);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">
        <div className="rounded-[2.25rem] bg-gradient-to-r from-[#172554] via-[#1e1b4b] to-[#311042] p-8 text-white border border-white/10 animate-pulse h-80 flex items-center justify-center">
          <div className="flex items-center gap-3 text-blue-200">
            <Video className="h-6 w-6 animate-bounce" />
            <span className="font-semibold text-sm">Loading upcoming demo classes...</span>
          </div>
        </div>
      </div>
    );
  }

  // If backend returns no demo classes scheduled
  if (classes.length === 0) {
    return null;
  }

  const featuredClass = classes[selectedIndex] || classes[0];

  const remainingClasses = classes
    .map((item, idx) => ({ item, originalIndex: idx }))
    .filter((_, idx) => idx !== selectedIndex);

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? classes.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === classes.length - 1 ? 0 : prev + 1));
  };

  const featuredDateInfo = formatDemoDateTime(
    featuredClass.scheduledStartAt,
    featuredClass.scheduledEndAt,
    featuredClass.durationMinutes
  );

  return (
    <div className="w-full max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 sm:pb-12">
      <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-r from-[#172554] via-[#1e1b4b] to-[#311042] p-6 sm:p-8 lg:p-10 text-white shadow-[0_25px_60px_-15px_rgba(30,27,75,0.5)] border border-white/10">
        {/* Glowing Background Orbs */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-600/25 blur-[100px]" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1.35fr)] gap-8 lg:gap-12 items-center">
          {/* LEFT COLUMN: Main Copy & CTA */}
          <div className="flex flex-col justify-between h-full py-2">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-blue-200/90 mb-3">
                <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                START WITH A TASTE
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1] mb-4">
                Explore upcoming <br className="hidden sm:inline" />
                demo classes
              </h2>

              <p className="text-sm sm:text-base text-blue-100/80 leading-relaxed max-w-lg mb-8">
                Meet the instructor, ask questions, and find the right learning path before you enroll.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2">
              <button
                onClick={() => handleJoinDemo(featuredClass)}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-xl transition-all duration-300 hover:bg-blue-50 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
              >
                Reserve a seat
                <ArrowUpRight className="h-4 w-4 text-slate-900" />
              </button>

              <div className="inline-flex items-center gap-3 rounded-full bg-white/10 backdrop-blur-md px-4 py-2.5 border border-white/15 text-xs sm:text-sm font-semibold text-white">
                <span className="flex items-center justify-center rounded-md bg-blue-500/30 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-200">
                  {featuredDateInfo.month}
                </span>
                <span className="flex items-center gap-1.5 text-blue-100">
                  <Calendar className="h-3.5 w-3.5 text-blue-300" />
                  {classes.length} live {classes.length === 1 ? "session" : "sessions"}{" "}
                  <span className="text-blue-300/70 hidden sm:inline">• Join this month</span>
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Next Live Demo Featured Card & Sessions List */}
          <div className="rounded-3xl bg-[#0e163b]/85 border border-white/15 p-4 sm:p-6 backdrop-blur-xl shadow-2xl">
            {/* Right Card Header */}
            <div className="flex items-center justify-between pb-4 text-[11px] font-bold tracking-widest text-blue-200/90 uppercase">
              <span>NEXT LIVE DEMO</span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                SEATS ARE LIMITED
              </span>
            </div>

            {/* Featured Live Class Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={featuredClass.demoClassId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-2xl bg-white text-slate-900 p-4 sm:p-5 shadow-2xl grid grid-cols-1 sm:grid-cols-[140px_1fr] md:grid-cols-[160px_1fr] gap-4 sm:gap-5 items-center"
              >
                {/* Course Tag Thumbnail Box */}
                <div className="relative h-28 sm:h-36 w-full rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4 flex flex-col justify-between text-white shadow-inner overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-md" />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                      EDVANZ LIVE
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs ${
                        featuredClass.learningSector === "KIDS"
                          ? "bg-amber-400 text-slate-900"
                          : "bg-blue-400 text-slate-900"
                      }`}
                    >
                      {featuredClass.learningSector === "KIDS" ? "KIDS" : "IT"}
                    </span>
                  </div>
                  <div className="font-extrabold text-sm sm:text-base uppercase tracking-tight leading-tight drop-shadow-sm line-clamp-2">
                    {featuredClass.courseTitle}
                  </div>
                </div>

                {/* Main Content Info */}
                <div className="flex flex-col justify-between h-full py-0.5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-[11px] font-extrabold text-emerald-800 tracking-wide">
                        LIVE DEMO
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Sector Badge: KIDS or IT in top right */}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-black tracking-wider uppercase border shadow-xs ${
                            featuredClass.learningSector === "KIDS"
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-blue-100 text-blue-900 border-blue-200"
                          }`}
                        >
                          {featuredClass.learningSector === "KIDS" ? "KIDS" : "IT"}
                        </span>
                        <span className="text-slate-400 text-xs font-extrabold">
                          {String(selectedIndex + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-snug line-clamp-2 mb-2">
                      {featuredClass.demoClassTitle}
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                        {getInitials(featuredClass.instructorName)}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-slate-600">
                        with {featuredClass.instructorName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 font-semibold text-slate-600">
                      <span>{featuredDateInfo.date}</span>
                      <span className="hidden sm:inline text-slate-300">•</span>
                      <span className="text-slate-500">{featuredDateInfo.time}</span>
                    </div>

                    <button
                      onClick={() => handleJoinDemo(featuredClass)}
                      className="inline-flex items-center gap-1 font-extrabold text-indigo-600 hover:text-indigo-800 transition-colors text-xs sm:text-sm cursor-pointer"
                    >
                      Join demo
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Bottom Section Header & Session Cards (only if more than 1 class exists) */}
            {remainingClasses.length > 0 && (
              <>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-200/80">
                    More sessions
                  </span>

                  {classes.length > 2 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrev}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 cursor-pointer"
                        aria-label="Previous demo session"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleNext}
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 cursor-pointer"
                        aria-label="Next demo session"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {remainingClasses.map(({ item, originalIndex }) => {
                    const dateInfo = formatDemoDateTime(
                      item.scheduledStartAt,
                      item.scheduledEndAt,
                      item.durationMinutes
                    );

                    return (
                      <div
                        key={item.demoClassId}
                        onClick={() => setSelectedIndex(originalIndex)}
                        className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-white/10 p-3 transition-all duration-200 hover:bg-white/20 hover:border-white/25 cursor-pointer"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-200">
                                {String(originalIndex + 1).padStart(2, "0")}
                              </span>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                                  item.learningSector === "KIDS"
                                    ? "bg-amber-400 text-slate-900"
                                    : "bg-blue-400 text-slate-900"
                                }`}
                              >
                                {item.learningSector === "KIDS" ? "KIDS" : "IT"}
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                              View details
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white leading-snug line-clamp-2 mb-1 group-hover:text-blue-200 transition-colors">
                            {item.demoClassTitle}
                          </h4>
                        </div>

                        <div className="mt-2 text-[10px] font-medium text-blue-200/80 border-t border-white/10 pt-2">
                          <div>{dateInfo.date}</div>
                          <div className="text-blue-300/70">{dateInfo.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDemoBanner;
