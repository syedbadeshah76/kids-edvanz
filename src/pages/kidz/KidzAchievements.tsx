import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Flame,
  Brain,
  FlaskConical,
  Palette,
  Trophy,
  Star,
  Globe,
  Award,
  Sparkles,
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";

import { PageHeader } from "@/components/kidz/KidzPageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/kidz/KidzAuthContext";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { achievementsService } from "@/services/kidz/achievements.service";
import type {
  CourseAchievementDTO,
  StudentAchievementsResponse,
} from "@/types/kidz/api.types";

interface MilestoneBadge {
  id: string;
  name: string;
  tier: "Gold" | "Silver" | "Bronze" | "Badge";
  unlocked: boolean;
  iconType: "flame" | "star" | "globe" | "ninja" | "brain" | "palette" | "beaker";
  hint: string;
}

export function AchievementsPage() {
  useDocumentMeta(
    "Achievements - EDVANZ",
    "Badges and milestones you've unlocked on your learning journey.",
  );

  const { user } = useAuth();
  const [data, setData] = useState<StudentAchievementsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"courses" | "milestones">("courses");

  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await achievementsService.getStudentAchievements(user?.id);
      setData(response);
    } catch (err: any) {
      console.warn("Failed to load student achievements:", err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Could not load achievements. Please check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchAchievements();
  }, [fetchAchievements]);

  // Summary counts mapped according to integration specification
  const passedTestCount = data?.passedTestCount ?? 0;
  const liveCourseCount = data?.liveCourseCount ?? 0;
  const recordedCourseCount = data?.recordedCourseCount ?? 0;
  const longestStreak = data?.longestStreak;
  const totalXp = data?.totalXp;
  const courseCount = data?.courseCount ?? data?.achievements?.length ?? 0;
  const achievements = data?.achievements ?? [];

  // Milestone badges reflecting the 8-tile design mock reference
  const milestoneBadges: MilestoneBadge[] = [
    {
      id: "start-streak",
      name: "Start Streak",
      tier: "Gold",
      unlocked: longestStreak != null ? longestStreak >= 1 : true,
      iconType: "flame",
      hint: "Learn daily to ignite and keep your streak alive",
    },
    {
      id: "story-star",
      name: "Story Star",
      tier: "Gold",
      unlocked: achievements.some((a) => a.badgeLevel === "GOLD") || courseCount >= 1,
      iconType: "star",
      hint: "Complete 100% of any course with Gold honors",
    },
    {
      id: "polyglot",
      name: "Polyglot",
      tier: "Silver",
      unlocked: liveCourseCount >= 1 || achievements.some((a) => a.badgeLevel === "SILVER"),
      iconType: "globe",
      hint: "Show up to live classes and master foreign topics",
    },
    {
      id: "code-ninja-silver",
      name: "Code Ninja",
      tier: "Silver",
      unlocked: recordedCourseCount >= 1,
      iconType: "ninja",
      hint: "Reach 50% progress in interactive technical courses",
    },
    {
      id: "code-ninja-bronze",
      name: "Code Ninja",
      tier: "Bronze",
      unlocked: passedTestCount >= 1 || achievements.some((a) => a.badgeLevel === "BRONZE"),
      iconType: "brain",
      hint: "Ace quizzes and complete at least 35% of a course",
    },
    {
      id: "quiz-whiz",
      name: "Quiz Whiz",
      tier: "Badge",
      unlocked: passedTestCount >= 5,
      iconType: "globe",
      hint: "Score 80% or higher on 5 unique quizzes",
    },
    {
      id: "art-icon",
      name: "Art Icon",
      tier: "Badge",
      unlocked: courseCount >= 6,
      iconType: "palette",
      hint: "Study and complete creative design courses",
    },
    {
      id: "lab-legend",
      name: "Lab Legend",
      tier: "Badge",
      unlocked: liveCourseCount >= 3,
      iconType: "beaker",
      hint: "Participate in 3 or more live lab workshops",
    },
  ];

  const unlockedMilestonesCount = milestoneBadges.filter((b) => b.unlocked).length;
  const displayUnlockedCount = courseCount > 0 ? courseCount : unlockedMilestonesCount;

  // Format 2-digit numbers (e.g. 3 -> "03")
  const formatTwoDigit = (num: number): string => {
    return String(num).padStart(2, "0");
  };

  // Format comma separated numbers (e.g. 4820 -> "4,820")
  const formatCommaNumber = (num?: number): string => {
    if (num == null) return "0";
    return Number(num).toLocaleString();
  };

  // Helper for rendering badge level pills
  const renderBadgePill = (badgeLevel: string) => {
    const norm = String(badgeLevel || "").toUpperCase();
    if (norm === "GOLD") {
      return (
        <span className="rounded-full bg-[#FEF08A] px-3.5 py-1 text-xs font-black text-[#713F12] shadow-2xs">
          Gold
        </span>
      );
    }
    if (norm === "SILVER") {
      return (
        <span className="rounded-full bg-[#E2E8F0] px-3.5 py-1 text-xs font-black text-[#334155] shadow-2xs">
          Silver
        </span>
      );
    }
    if (norm === "BRONZE") {
      return (
        <span className="rounded-full bg-[#FED7AA] px-3.5 py-1 text-xs font-black text-[#9A3412] shadow-2xs">
          Bronze
        </span>
      );
    }
    return (
      <span className="rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-500">
        Badge
      </span>
    );
  };

  // Fallback badge illustration for courses without image
  const renderCourseBadgeFallback = (badgeLevel: string) => {
    const norm = String(badgeLevel || "").toUpperCase();
    if (norm === "GOLD") {
      return (
        <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-2 ring-amber-200/70 shadow-xs">
          <Star className="size-9 fill-amber-400 text-amber-500 animate-pulse" />
        </div>
      );
    }
    if (norm === "SILVER") {
      return (
        <div className="flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 ring-2 ring-slate-200/70 shadow-xs">
          <Award className="size-9 text-slate-500" />
        </div>
      );
    }
    return (
      <div className="flex size-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-2 ring-orange-200/70 shadow-xs">
        <Trophy className="size-9 text-orange-500" />
      </div>
    );
  };

  // Render milestone graphic according to tile type
  const renderMilestoneGraphic = (type: MilestoneBadge["iconType"], unlocked: boolean) => {
    const baseClass = `flex size-16 items-center justify-center rounded-2xl transition-transform ${
      unlocked ? "" : "grayscale opacity-50"
    }`;

    switch (type) {
      case "flame":
        return (
          <div className={`${baseClass} bg-orange-50 text-orange-500`}>
            <Flame className="size-9 fill-orange-400 text-orange-500" />
          </div>
        );
      case "star":
        return (
          <div className={`${baseClass} bg-amber-50 text-amber-400`}>
            <Star className="size-9 fill-amber-300 text-amber-500" />
          </div>
        );
      case "globe":
        return (
          <div className={`${baseClass} bg-blue-50 text-blue-500`}>
            <Globe className="size-9 text-blue-500" />
          </div>
        );
      case "ninja":
        return (
          <div className={`${baseClass} bg-slate-800 text-white shadow-sm`}>
            <span className="text-3xl" role="img" aria-label="Ninja">🥷</span>
          </div>
        );
      case "brain":
        return (
          <div className={`${baseClass} bg-pink-50 text-pink-500`}>
            <Brain className="size-9 fill-pink-300 text-pink-500" />
          </div>
        );
      case "palette":
        return (
          <div className={`${baseClass} bg-purple-50 text-purple-500`}>
            <Palette className="size-9 text-purple-500" />
          </div>
        );
      case "beaker":
        return (
          <div className={`${baseClass} bg-teal-50 text-teal-500`}>
            <FlaskConical className="size-9 text-teal-500" />
          </div>
        );
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* ─── Header ────────────────────────────────────────── */}
      <PageHeader
        eyebrow="FLEX ZONE"
        title="Achievements"
        description={
          courseCount > 0
            ? `${courseCount} of 8 badges unlocked. Keep the streak alive.`
            : "Complete lessons and ace quizzes to unlock achievement badges."
        }
      />

      {/* ─── Summary Cards Banner (Lavender Container) ───────── */}
      <section
        aria-label="Student Achievement Summary"
        className="rounded-3xl bg-[#ECEAFE] p-4 sm:p-5 border border-indigo-100/80 shadow-xs"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: Lifetime XP */}
          <div className="flex min-h-[145px] flex-col justify-between rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-white/60 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center">
              <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-500">
                <Zap className="size-5 fill-amber-400 text-amber-500" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {isLoading ? "--" : formatCommaNumber(totalXp)}
              </p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                LIFETIME XP
              </p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">
                Earned from lessons, quizzes and classes
              </p>
            </div>
          </div>

          {/* Card 2: Day Streak */}
          <div className="flex min-h-[145px] flex-col justify-between rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-white/60 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center">
              <div className="grid size-9 place-items-center rounded-xl bg-orange-50 text-orange-500">
                <Flame className="size-5 fill-orange-400 text-orange-500" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {isLoading ? "--" : longestStreak != null ? String(longestStreak) : "0"}
              </p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                DAY-STREAK
              </p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">
                Learn something every day to grow it
              </p>
            </div>
          </div>

          {/* Card 3: Test Passed */}
          <div className="flex min-h-[145px] flex-col justify-between rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-white/60 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center">
              <div className="grid size-9 place-items-center rounded-xl bg-pink-50 text-pink-500">
                <Brain className="size-5 fill-pink-300 text-pink-500" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {isLoading ? "--" : formatTwoDigit(passedTestCount)}
              </p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                TEST PASSED
              </p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">
                Score 80% or higher to pass
              </p>
            </div>
          </div>

          {/* Card 4: Live Courses */}
          <div className="flex min-h-[145px] flex-col justify-between rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-white/60 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center">
              <div className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-cyan-600">
                <FlaskConical className="size-5 text-cyan-600" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {isLoading ? "--" : formatTwoDigit(liveCourseCount)}
              </p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                LIVE-COURSES
              </p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">
                Show up and learn together
              </p>
            </div>
          </div>

          {/* Card 5: Recorded Courses */}
          <div className="col-span-2 sm:col-span-1 flex min-h-[145px] flex-col justify-between rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-white/60 transition-transform hover:-translate-y-0.5">
            <div className="flex items-center">
              <div className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Palette className="size-5 text-amber-600" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {isLoading ? "--" : formatTwoDigit(recordedCourseCount)}
              </p>
              <p className="mt-1 text-[11px] font-bold tracking-wider text-slate-700 uppercase">
                RECORDED COURSES
              </p>
              <p className="mt-1 text-[11px] font-medium leading-snug text-slate-400">
                Courses you're studying right now
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Tabs Switcher ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          {/* <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "courses"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Course Badges ({achievements.length})
          </button> */}
       
        </div>

      </div>

      {/* ─── Error Alert Banner ─────────────────────────────── */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchAchievements}
            className="rounded-full border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-1.5 size-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* ─── Loading Skeleton Grid ──────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="flex min-h-[220px] flex-col items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-xs animate-pulse"
            >
              <div className="size-16 rounded-2xl bg-slate-100" />
              <div className="w-full space-y-2 text-center mt-3">
                <div className="mx-auto h-4 w-3/4 rounded-md bg-slate-100" />
                <div className="mx-auto h-3 w-1/2 rounded-md bg-slate-100" />
              </div>
              <div className="mt-3 h-6 w-16 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {/* ─── Tab 1: Course Badges ───────────────────────────── */}
      {!isLoading && activeTab === "courses" && (
        <>
          {achievements.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {achievements.map((item) => (
                <Link
                  key={item.courseId}
                  to={`/kidz/courses/${item.courseId}`}
                  className="group flex min-h-[220px] flex-col items-center justify-between rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer"
                >
                  {/* Thumbnail / Badge Graphic */}
                  <div className="relative flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 transition-transform group-hover:scale-105">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.courseTitle}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="flex size-full items-center justify-center">
                                <svg class="size-9 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                              </div>
                            `;
                          }
                        }}
                      />
                    ) : (
                      renderCourseBadgeFallback(item.badgeLevel)
                    )}
                  </div>

                  {/* Title & Progress */}
                  <div className="mt-3 w-full">
                    <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {item.courseTitle}
                    </h3>
                    <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-500">
                      {item.completed ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-600">
                          <CheckCircle2 className="size-3.5" /> 100% Completed
                        </span>
                      ) : (
                        <span>{item.progressPercentage}% Progress</span>
                      )}
                    </div>
                  </div>

                  {/* Badge Pill */}
                  <div className="mt-3">
                    {renderBadgePill(item.badgeLevel)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
              <div className="mb-3 grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-500">
                <Trophy className="size-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800">
                No course badges unlocked yet
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-500 max-w-md">
                Reach at least 35% course progress to earn your first Bronze badge, 50% for Silver, and 100% for Gold!
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="rounded-full bg-blue-600 px-6 font-bold text-white shadow-md hover:bg-blue-700"
                >
                  <Link to="/kidz/explore">
                    <Sparkles className="mr-2 size-4" /> Explore Courses
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("milestones")}
                  className="rounded-full border-slate-200 font-bold"
                >
                  View Milestone Badges <ArrowRight className="ml-1.5 size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Tab 2: Milestone Badges (8 Tile Layout) ─────────── */}
    
    </div>
  );
}

export const KidzAchievements = AchievementsPage;
export default KidzAchievements;
