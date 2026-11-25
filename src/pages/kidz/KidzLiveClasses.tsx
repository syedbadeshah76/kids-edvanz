import { useEffect, useState, useCallback, useRef } from "react";
import {
  Loader2,
  Video,
  Timer,
  Sparkles,
  BookOpen,
  GraduationCap,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { liveClassService } from "@/services/kidz/liveClassService";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";

export interface LiveClassDisplayItem {
  id: string;
  topic: string;
  courseTitle: string;
  teacher: string;
  startTime?: string;
  timeDisplay: string;
  countdown: string;
  isLive: boolean;
  isCompleted: boolean;
  status: string;
  joinUrl?: string;
  bgColor: string;
  iconBg: string;
}

const CARD_COLOR_SCHEMES = [
  {
    bgColor: "bg-[#ede9fe]/60 border-[#ddd6fe] hover:border-[#c4b5fd]",
    iconBg: "bg-white text-purple-600",
  },
  {
    bgColor: "bg-[#dbeafe]/60 border-[#bfdbfe] hover:border-[#93c5fd]",
    iconBg: "bg-white text-blue-600",
  },
  {
    bgColor: "bg-[#d1fae5]/60 border-[#a7f3d0] hover:border-[#6ee7b7]",
    iconBg: "bg-white text-emerald-600",
  },
  {
    bgColor: "bg-[#fef3c7]/60 border-[#fde68a] hover:border-[#fcd34d]",
    iconBg: "bg-white text-amber-600",
  },
];

const ICONS = [Video, Sparkles, BookOpen, GraduationCap];

const formatSessionTime = (dateStr?: string): string => {
  if (!dateStr) return "Scheduled Soon";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) {
    return `Today ${timeStr}`;
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();
  if (isTomorrow) {
    return `Tomorrow · ${timeStr}`;
  }

  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${timeStr}`;
};

const getRelativeCountdown = (
  dateStr?: string,
  status?: string,
): { text: string; isLive: boolean; isCompleted: boolean } => {
  const normStatus = String(status || "").trim().toUpperCase();

  // 1. Explicit COMPLETED, ENDED, or CANCELLED status from backend
  if (
    normStatus === "COMPLETED" ||
    normStatus === "ENDED" ||
    normStatus === "CANCELLED" ||
    normStatus === "EXPIRED"
  ) {
    return { text: "Completed", isLive: false, isCompleted: true };
  }

  // 2. Explicit LIVE status from backend
  if (
    normStatus === "LIVE" ||
    normStatus === "LIVE_NOW" ||
    normStatus === "IN_PROGRESS" ||
    normStatus === "ONGOING"
  ) {
    return { text: "Live Now 🔴", isLive: true, isCompleted: false };
  }

  if (!dateStr) return { text: "Soon", isLive: false, isCompleted: false };

  const start = new Date(dateStr).getTime();
  if (isNaN(start)) return { text: "Soon", isLive: false, isCompleted: false };

  const diffMs = start - Date.now();

  // If ended more than 90 minutes ago, consider completed
  if (diffMs < -90 * 60 * 1000) {
    return { text: "Completed", isLive: false, isCompleted: true };
  }

  // Within 15 mins before start time up to 90 mins after: consider live
  if (diffMs <= 15 * 60 * 1000 && diffMs >= -90 * 60 * 1000) {
    return { text: "Live Now 🔴", isLive: true, isCompleted: false };
  }
  if (diffMs < 0) {
    return { text: "Completed", isLive: false, isCompleted: true };
  }

  const diffMins = Math.floor(diffMs / (60 * 1000));
  if (diffMins < 60) {
    return { text: `${diffMins} mins`, isLive: false, isCompleted: false };
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return { text: `${diffHours} hrs`, isLive: false, isCompleted: false };
  }
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays} Day${diffDays === 1 ? "" : "s"}`, isLive: false, isCompleted: false };
};

export function LiveClassesPage() {
  useDocumentMeta(
    "Live Classes - EDVANZ",
    "Join small-group live classes with real teachers and ask questions in real time.",
  );

  const [classesList, setClassesList] = useState<LiveClassDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only regular student live classes from GET /api/student/live-classes
      const regularLiveClasses = await liveClassService.getStudentLiveClasses().catch(() => []);

      const displayItems: LiveClassDisplayItem[] = [];
      const seenIds = new Set<string>();

      if (Array.isArray(regularLiveClasses)) {
        regularLiveClasses.forEach((item: any, idx: number) => {
          const id = String(item.id || item.liveClassId || "");
          if (!id || seenIds.has(id)) return;
          seenIds.add(id);

          const schedDate = item.scheduledAt || item.scheduledStartAt || item.startTime;
          const status = item.status;
          const { text: countdown, isLive, isCompleted } = getRelativeCountdown(schedDate, status);
          const color = CARD_COLOR_SCHEMES[idx % CARD_COLOR_SCHEMES.length];

          displayItems.push({
            id,
            topic: item.title || item.topic || "Live Class Session",
            courseTitle: item.courseTitle || item.title || "Live Course",
            teacher: item.instructorName || item.instructor?.name || "Instructor",
            startTime: schedDate,
            timeDisplay: formatSessionTime(schedDate),
            countdown,
            isLive,
            isCompleted,
            status: String(status || ""),
            joinUrl: item.joinUrl || item.meetingLink || item.zoomJoinUrl,
            bgColor: color.bgColor,
            iconBg: color.iconBg,
          });
        });
      }

      // Sort: active/upcoming classes first, completed classes last
      displayItems.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) {
          return a.isCompleted ? 1 : -1;
        }
        if (a.isLive !== b.isLive) {
          return a.isLive ? -1 : 1;
        }
        const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return tA - tB;
      });

      if (isMountedRef.current) {
        setClassesList(displayItems);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.warn("Failed to load live classes:", err);
        setClassesList([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleJoin = async (liveClass: LiveClassDisplayItem) => {
    if (liveClass.isCompleted) {
      toast.info("This live class has already ended.");
      return;
    }
    setJoiningId(liveClass.id);
    try {
      // Call GET /api/live-classes/{id}/join
      const res = await liveClassService.joinLiveClass(liveClass.id);
      const joinUrl =
        res?.joinUrl ||
        res?.url ||
        (typeof res === "string" ? res : null) ||
        liveClass.joinUrl ||
        null;

      if (joinUrl && typeof joinUrl === "string" && joinUrl.startsWith("http")) {
        toast.success("Joining live class...");
        window.open(joinUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.warning("Wait for the instructor to start the meeting.", {
          description: "The instructor has not started the session yet. Please try again shortly.",
        });
      }
    } catch (err: any) {
      console.warn("Failed to join live class:", err);
      const fallbackUrl = liveClass.joinUrl;
      if (fallbackUrl && typeof fallbackUrl === "string" && fallbackUrl.startsWith("http")) {
        toast.success("Joining live class...");
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Wait for the instructor to start the meeting.";
      toast.warning("Meeting not started yet", {
        description: errMsg.includes("instructor") ? errMsg : "Wait for the instructor to start the meeting.",
      });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">REAL-TIME</p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">Live classes</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Small-group sessions with real teachers. Cameras optional, questions encouraged.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadClasses}
          disabled={loading}
          className="self-start sm:self-auto rounded-full border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-xs animate-pulse min-h-[170px]"
            >
              <div className="flex items-start gap-4">
                <div className="size-14 rounded-2xl bg-slate-100 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between pt-2">
                <div className="h-8 w-24 bg-slate-100 rounded-full" />
                <div className="h-10 w-28 bg-slate-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : classesList.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/70 py-16 px-6 text-center shadow-xs">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-xs">
            <Video className="size-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-black text-slate-900">No Live Classes Right Now</h3>
          <p className="mt-2 max-w-md text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
            You don't have any upcoming live classes scheduled at the moment. Explore our Live Courses to enroll!
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button
              asChild
              className="rounded-full bg-blue-600 px-6 py-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <Link to="/kidz/explore?type=live">
                Explore Live Courses 🚀
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        /* Grid of Live Classes */
        <div className="grid gap-6 sm:grid-cols-2">
          {classesList.map((liveClass, idx) => {
            const IconComponent = ICONS[idx % ICONS.length];
            const isConnecting = joiningId === liveClass.id;

            return (
              <article
                key={liveClass.id}
                className={`flex flex-col justify-between rounded-3xl border ${
                  liveClass.isCompleted
                    ? "bg-slate-50/80 border-slate-200 opacity-80"
                    : `${liveClass.bgColor} hover:-translate-y-1 hover:shadow-md`
                } p-6 shadow-sm transition-all duration-200`}
              >
                <div>
                  {/* Top Bar with Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                        liveClass.isCompleted
                          ? "bg-slate-100 text-slate-600"
                          : liveClass.isLive
                          ? "bg-rose-100 text-rose-700 animate-pulse"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {liveClass.isCompleted ? "Completed" : liveClass.isLive ? "Live Now 🔴" : "Live Class"}
                    </span>
                    {liveClass.courseTitle && liveClass.courseTitle !== liveClass.topic && (
                      <span className="text-[11px] font-bold text-slate-400 truncate max-w-[180px]">
                        {liveClass.courseTitle}
                      </span>
                    )}
                  </div>

                  {/* Header info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${liveClass.iconBg} shadow-xs`}
                    >
                      <IconComponent className="size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                        {liveClass.topic}
                      </h2>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {liveClass.teacher}
                      </p>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="size-3 text-slate-400" />
                        <span>{liveClass.timeDisplay}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="mt-6 flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs">
                    <Timer
                      className={`size-3.5 ${
                        liveClass.isCompleted
                          ? "text-slate-400"
                          : liveClass.isLive
                          ? "text-rose-500"
                          : "text-blue-600"
                      }`}
                    />
                    <span>
                      {liveClass.isCompleted
                        ? "Completed"
                        : liveClass.isLive
                        ? "Live Now"
                        : `Start in ${liveClass.countdown}`}
                    </span>
                  </div>

                  <Button
                    onClick={() => !liveClass.isCompleted && handleJoin(liveClass)}
                    disabled={isConnecting || liveClass.isCompleted}
                    className={`rounded-full px-6 py-5 text-xs font-bold shadow-sm transition-all ${
                      liveClass.isCompleted
                        ? "bg-slate-200 text-slate-500 hover:bg-slate-200 cursor-not-allowed opacity-80"
                        : liveClass.isLive
                        ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 active:scale-95"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95"
                    }`}
                  >
                    {isConnecting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Video className="mr-1.5 size-4" />
                    )}
                    {isConnecting
                      ? "Connecting..."
                      : liveClass.isCompleted
                      ? "Completed"
                      : liveClass.isLive
                      ? "Join Now"
                      : "Join Class"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const KidzLiveClasses = LiveClassesPage;
export default KidzLiveClasses;
