import { useEffect, useState } from "react";
import {
  ChevronRight,
  Check,
  Sparkles,
  Sun,
  ThumbsUp,
  Star,
  BookOpen,
  Target,
  FolderCode,
  Palette,
  Trophy,
  Video,
} from "lucide-react";
import { Link } from "react-router-dom";

import heroBooksImg from "@/assets/kidz/hero-books-stack.jpg";
import pandaAvatar from "@/assets/kidz/panda-avatar.jpg";
import { CourseCard } from "@/components/kidz/KidzCourseCard";
import { Button } from "@/components/ui/button";
import type { Course } from "@/data/kidz/portal";
import { useAuth } from "@/contexts/kidz/KidzAuthContext";
import { useStudentCourses } from "@/hooks/kidz/useStudentCourses";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { liveClassService } from "@/services/kidz/liveClassService";
import type { LiveClassDTO } from "@/types/kidz/api.types";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { normalizeLevel, isCourseFree } from "@/pages/kidz/KidzExplore";

const isLiveClassUpcoming = (item: any): boolean => {
  if (!item) return false;
  const normStatus = String(item.status || "").trim().toUpperCase();

  // Explicit COMPLETED / ENDED / CANCELLED / EXPIRED from backend
  if (
    normStatus === "COMPLETED" ||
    normStatus === "ENDED" ||
    normStatus === "CANCELLED" ||
    normStatus === "EXPIRED"
  ) {
    return false;
  }

  // Active live broadcast
  if (
    normStatus === "LIVE" ||
    normStatus === "LIVE_NOW" ||
    normStatus === "IN_PROGRESS" ||
    normStatus === "ONGOING"
  ) {
    return true;
  }

  const schedDate =
    item.scheduledAt ||
    item.scheduledStartAt ||
    item.startTime ||
    item.date;

  if (!schedDate) {
    return (
      normStatus === "UPCOMING" ||
      normStatus === "SCHEDULED" ||
      normStatus === "APPROVED"
    );
  }

  const start = new Date(schedDate).getTime();
  if (isNaN(start)) {
    return normStatus !== "COMPLETED" && normStatus !== "ENDED";
  }

  // If the class started in the past and > 90 mins have passed, consider it completed
  const diffMs = start - Date.now();
  if (diffMs < -90 * 60 * 1000) {
    return false;
  }

  return true;
};

const formatSessionTime = (item: any): string => {
  const normStatus = String(item?.status || "").trim().toUpperCase();
  if (
    normStatus === "LIVE" ||
    normStatus === "LIVE_NOW" ||
    normStatus === "IN_PROGRESS" ||
    normStatus === "ONGOING"
  ) {
    return "Live Now 🔴";
  }

  const dateStr =
    item?.scheduledAt ||
    item?.scheduledStartAt ||
    item?.startTime ||
    item?.date;

  if (!dateStr) return "Upcoming";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Upcoming";

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today · ${timeStr}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow =
    d.getDate() === tomorrow.getDate() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getFullYear() === tomorrow.getFullYear();
  if (isTomorrow) return `Tomorrow · ${timeStr}`;

  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} · ${timeStr}`;
};

export function DashboardPage() {
  useDocumentMeta(
    "Dashboard - EDVANZ Learning Portal",
    "Your learning dashboard: courses, live classes, and achievements for teens.",
  );

  const { user, profile: authProfile } = useAuth();
  const { enrolledCourses, catalog } = useStudentCourses();
  const { getCourseProgress } = useAppState();
  const [liveSessions, setLiveSessions] = useState<LiveClassDTO[]>([]);

  useEffect(() => {
    let isMounted = true;
    liveClassService
      .getStudentLiveClasses()
      .then((classes) => {
        if (!isMounted) return;
        const upcoming = Array.isArray(classes)
          ? classes.filter(isLiveClassUpcoming)
          : [];
        upcoming.sort((a, b) => {
          const tA = new Date(
            a.scheduledAt || a.scheduledStartAt || a.startTime || 0,
          ).getTime();
          const tB = new Date(
            b.scheduledAt || b.scheduledStartAt || b.startTime || 0,
          ).getTime();
          return tA - tB;
        });
        setLiveSessions(upcoming);
      })
      .catch(() => {
        if (isMounted) setLiveSessions([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const studentName =
    user?.firstName ||
    authProfile?.firstName ||
    user?.displayName?.split(" ")[0] ||
    "Learner";

  // Map real enrolled courses
  const displayedContinueLearning: Course[] = enrolledCourses
    .filter((e) => {
      const sector = (e.course?.learningSector || (e as any).learningSector || "").toUpperCase();
      return !sector || sector === "KIDS";
    })
    .slice(0, 3)
    .map((e, idx) => {
      const c = e.course || (e as any);
      const cId = String(e.courseId || c.id || `enrolled-${idx}`);
      let localCachedCount = 0;
      try {
        const cached = localStorage.getItem(`kidz_course_progress_${cId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) localCachedCount = parsed.length;
        }
      } catch {}

      const totalL = c.totalLessons ?? 0;
      const localPct =
        totalL > 0 && localCachedCount > 0
          ? Math.round((localCachedCount / totalL) * 100)
          : 0;
      const appPct = getCourseProgress(cId);

      const resolvedProgress = Math.min(
        100,
        Math.max(
          Number(e.progressPercentage ?? 0),
          Number(c.progressPercentage ?? 0),
          localPct,
          appPct
        )
      );

      return {
        id: cId,
        title: c.title || c.courseTitle || "Course Adventure",
        teacher: c.instructorName || "Instructor",
        subject: c.subject || c.category || "Learning",
        thumbnailUrl: c.thumbnailUrl || c.thumbnail || c.coverImage,
        emoji: c.emoji || "📚",
        rating: c.rating ?? 4.8,
        students: c.enrolledStudentsCount ?? 150,
        lessons: c.totalLessons ?? 12,
        duration: c.duration ?? "3h 45m",
        age: "12-18",
        level: (c.level as "Beginner" | "Intermediate" | "Advanced") || "Beginner",
        price: c.isFree ? ("Free" as const) : ("Premium" as const),
        tint: idx % 2 === 0 ? "bg-mint/25" : "bg-sky/25",
        progress: resolvedProgress,
        nextLesson: "Continue Lesson",
      };
    });

  const completedCoursesCount = displayedContinueLearning.filter(
    (c) => (c.progress ?? 0) === 100,
  ).length;
  const inProgressCoursesCount = displayedContinueLearning.filter(
    (c) => (c.progress ?? 0) < 100,
  ).length;

  // Map real popular catalog courses (strictly KIDS sector)
  const displayedCatalog: Course[] = catalog
    .filter((c) => (c.learningSector || "").toUpperCase() === "KIDS")
    .slice(0, 6)
    .map((c, idx) => ({
      id: c.id,
      title: c.title,
      teacher: c.instructorName || "Instructor",
      subject: c.subject || c.category || "General",
      thumbnailUrl: c.thumbnailUrl || (c as any).thumbnail || (c as any).coverImage,
      emoji: c.emoji || "📚",
      rating: c.rating ?? 4.8,
      students: c.enrolledStudentsCount ?? 240,
      lessons: c.totalLessons ?? 15,
      duration: c.duration ?? "4h 00m",
      age: "12-18",
      level: normalizeLevel(c.level),
      price: isCourseFree(c) ? ("Free" as const) : ("Premium" as const),
      tint: idx % 2 === 0 ? "bg-primary-soft" : "bg-sun/25",
    }));

  const totalLessonsDone = enrolledCourses.reduce(
    (acc, curr) => {
      const lessons = curr.course?.totalLessons ?? (curr as any).totalLessons ?? 10;
      const prog = curr.progressPercentage ?? (curr as any).progressPercentage ?? 0;
      return acc + Math.round((prog / 100) * lessons);
    },
    0,
  );

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 pb-12">
      {/* 1. Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 p-6 text-white shadow-xl sm:p-10">
        <div className="grid items-center gap-8 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
            <p className="text-xs font-black uppercase tracking-widest opacity-85">
              STUDENT LEARNING PORTAL
            </p>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              Welcome Back {studentName}!
            </h1>
            <p className="max-w-md text-sm font-medium text-blue-100 sm:text-base">
              Continue your learning adventure today — explore new courses, attend live classes, and build real-world skills.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                className="rounded-full bg-purple-600 px-6 py-6 font-bold text-white shadow-md hover:bg-purple-700 active:scale-95"
              >
                <Link to="/kidz/my-learning">Continue Learning</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-none bg-white px-6 py-6 font-bold text-blue-600 shadow-md hover:bg-slate-100 active:scale-95"
              >
                <Link to="/kidz/explore">Explore Courses</Link>
              </Button>
            </div>
          </div>

          <div className="flex justify-center">
            <img
              src={heroBooksImg}
              alt="Colorful stack of 3D books"
              className="w-full max-w-xs rounded-2xl drop-shadow-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* 2. Stat Cards (4 cards) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Enrolled Courses */}
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <div className="grid size-7 place-items-center rounded-full border-2 border-rose-500 bg-rose-500 text-white font-bold text-xs">
              {enrolledCourses.length}
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{enrolledCourses.length}</h3>
            <p className="text-xs font-bold text-slate-400">Enrolled Courses</p>
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Sparkles className="size-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{inProgressCoursesCount}</h3>
            <p className="text-xs font-bold text-slate-400">In Progress</p>
          </div>
        </div>

        {/* Card 3: Lessons Done */}
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <Check className="size-6 stroke-[3]" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{totalLessonsDone}</h3>
            <p className="text-xs font-bold text-slate-400">Lessons Done</p>
          </div>
        </div>

        {/* Card 4: Upcoming Live Classes */}
        <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <Video className="size-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">{liveSessions.length}</h3>
            <p className="text-xs font-bold text-slate-400">Live Classes</p>
          </div>
        </div>
      </section>

      {/* 3. Continue Learning Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Continue Learning</h2>
          <Link
            to="/kidz/my-learning"
            className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline"
          >
            My Learning <ChevronRight className="size-4" />
          </Link>
        </div>

        {displayedContinueLearning.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedContinueLearning.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-xs">
            <div className="grid size-16 place-items-center rounded-2xl bg-blue-50 text-3xl mb-3">
              🚀
            </div>
            <h3 className="text-lg font-black text-slate-800">No courses in progress yet!</h3>
            <p className="mt-1 text-xs font-semibold text-slate-400 max-w-sm">
              Pick an exciting course from our catalog to start building projects, solving quizzes, and earning badges.
            </p>
            <Button asChild className="mt-5 rounded-full bg-blue-600 px-6 font-bold text-white shadow-md hover:bg-blue-700">
              <Link to="/kidz/explore">Explore Courses</Link>
            </Button>
          </div>
        )}
      </section>

      {/* 4. Upcoming Live Classes */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Upcoming Live Classes</h3>
            <p className="text-xs font-semibold text-slate-400">Join interactive live workshops with instructors</p>
          </div>
          <Link to="/kidz/live-classes" className="text-xs font-bold text-blue-600 hover:underline">
            See All
          </Link>
        </div>

        <div className="mt-4">
          {liveSessions.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {liveSessions.slice(0, 4).map((session: any) => (
                <Link
                  key={session.id}
                  to="/kidz/live-classes"
                  className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 transition-all hover:bg-blue-100/60 hover:shadow-xs"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-xs">
                    <Video className="size-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-black text-blue-900 line-clamp-1">
                      {session.title || session.topic || "Live Session"}
                    </h4>
                    <p className="text-[11px] font-semibold text-blue-600 truncate">
                      {session.instructorName || session.instructor?.name || "Instructor"}
                    </p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">
                      {formatSessionTime(session)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 p-8 text-center">
              <Sun className="size-8 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">No live classes scheduled for today.</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                Check the live classes page for upcoming workshop broadcasts and demos.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-4 rounded-full border-blue-200 text-xs font-bold text-blue-600">
                <Link to="/kidz/live-classes">View Schedule</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 5. Popular Right Now Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Popular Right Now</h2>
          <Link
            to="/kidz/explore"
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            Explore All
          </Link>
        </div>

        {displayedCatalog.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedCatalog.map((course) => (
              <CourseCard key={course.id} course={course} isPopular />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs font-semibold text-slate-400">
            Catalog courses are loading from the learning center.
          </div>
        )}
      </section>

      {/* 6. Browse Subjects Section */}
      {/* <section className="space-y-4">
        <h2 className="text-2xl font-black text-slate-900">Browse Subjects</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Link
            to="/kidz/explore?subject=English"
            className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-transform hover:-translate-y-1"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-xs">
              <Star className="size-8 fill-amber-400 text-amber-400" />
            </div>
            <h4 className="mt-3 font-extrabold text-slate-900">English</h4>
            <p className="text-xs font-semibold text-slate-400">Creative & Stories</p>
          </Link>

          <Link
            to="/kidz/explore?subject=Science"
            className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-transform hover:-translate-y-1"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 shadow-xs">
              <BookOpen className="size-8 text-emerald-500" />
            </div>
            <h4 className="mt-3 font-extrabold text-slate-900">Science</h4>
            <p className="text-xs font-semibold text-slate-400">Experiments & Lab</p>
          </Link>

          <Link
            to="/kidz/explore?subject=Math"
            className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-transform hover:-translate-y-1"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-xs">
              <Target className="size-8 text-rose-500" />
            </div>
            <h4 className="mt-3 font-extrabold text-slate-900">Maths</h4>
            <p className="text-xs font-semibold text-slate-400">Algebra & Logic</p>
          </Link>

          <Link
            to="/kidz/explore?subject=Coding"
            className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-transform hover:-translate-y-1"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 shadow-xs">
              <FolderCode className="size-8 text-amber-500" />
            </div>
            <h4 className="mt-3 font-extrabold text-slate-900">Coding</h4>
            <p className="text-xs font-semibold text-slate-400">Python & AI</p>
          </Link>

          <Link
            to="/kidz/explore?subject=Art"
            className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-sm transition-transform hover:-translate-y-1"
          >
            <div className="flex size-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-500 shadow-xs">
              <Palette className="size-8 text-purple-500" />
            </div>
            <h4 className="mt-3 font-extrabold text-slate-900">Art</h4>
            <p className="text-xs font-semibold text-slate-400">Design & Media</p>
          </Link>
        </div>
      </section> */}

      {/* 7. Leaderboard Banner */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-indigo-100 bg-gradient-to-r from-purple-100 via-indigo-100 to-blue-100 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 overflow-hidden rounded-2xl shadow-sm">
            <img src={pandaAvatar} alt="Panda Avatar" className="size-full object-cover" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Learning League</h3>
            <p className="text-xs font-bold text-slate-500">
              Climb the leaderboard by completing lessons, passing quizzes, and keeping your daily streak!
            </p>
          </div>
        </div>

        <Button
          asChild
          className="rounded-full bg-blue-600 px-6 py-5 font-bold text-white shadow-md hover:bg-blue-700 active:scale-95"
        >
          <Link to="/kidz/leaderboard">
            <Trophy className="mr-1.5 size-4" /> View Leaderboard
          </Link>
        </Button>
      </section>
    </div>
  );
}

export const KidzDashboard = DashboardPage;
export default KidzDashboard;
