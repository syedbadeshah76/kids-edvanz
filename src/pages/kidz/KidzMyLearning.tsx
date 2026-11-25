import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";

import { CourseCard } from "@/components/kidz/KidzCourseCard";
import { PageHeader } from "@/components/kidz/KidzPageHeader";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { Course } from "@/data/kidz/portal";
import { useStudentCourses } from "@/hooks/kidz/useStudentCourses";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { normalizeLevel, isCourseFree } from "@/pages/kidz/KidzExplore";

export function MyLearningPage() {
  useDocumentMeta(
    "My Learning - EDVANZ",
    "Pick up every course you started and track lesson-by-lesson progress.",
  );

  const { enrolledCourses, catalog, isLoading } = useStudentCourses();
  const { getCourseProgress } = useAppState();

  const displayedEnrolled: Course[] = enrolledCourses
    .filter((e) => {
      const sector = (e.course?.learningSector || (e as any).learningSector || "").toUpperCase();
      return !sector || sector === "KIDS";
    })
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
        title: c.title || c.courseTitle || "Course Quest",
        teacher: c.instructorName || "Instructor",
        subject: c.subject || c.category || "Learning",
        thumbnailUrl: c.thumbnailUrl || c.thumbnail || c.coverImage,
        emoji: c.emoji || "📚",
        rating: c.rating ?? 4.8,
        students: c.enrolledStudentsCount ?? 120,
        lessons: c.totalLessons ?? 12,
        duration: c.duration ?? "4h",
        age: "12-18",
        level: (c.level as "Beginner" | "Intermediate" | "Advanced") || "Beginner",
        price: c.isFree ? ("Free" as const) : ("Premium" as const),
        tint: idx % 2 === 0 ? "bg-mint/25" : "bg-sky/25",
        progress: resolvedProgress,
        nextLesson: "Continue Lesson",
      };
    });

  const recommendedCourses: Course[] = catalog
    .filter((c) => (c.learningSector || "").toUpperCase() === "KIDS")
    .slice(0, 3)
    .map((c, idx) => ({
      id: c.id,
      title: c.title,
      teacher: c.instructorName || "Instructor",
      subject: c.subject || c.category || "General",
      thumbnailUrl: c.thumbnailUrl || (c as any).thumbnail || (c as any).coverImage,
      emoji: c.emoji || "📚",
      rating: c.rating ?? 4.8,
      students: c.enrolledStudentsCount ?? 200,
      lessons: c.totalLessons ?? 15,
      duration: c.duration ?? "3h 30m",
      age: "12-18",
      level: normalizeLevel(c.level),
      price: isCourseFree(c) ? ("Free" as const) : ("Premium" as const),
      tint: idx % 2 === 0 ? "bg-primary-soft" : "bg-sun/25",
    }));

  const avg =
    displayedEnrolled.length > 0
      ? Math.round(
          displayedEnrolled.reduce((sum, course) => sum + (course.progress ?? 0), 0) /
            displayedEnrolled.length,
        )
      : 0;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader
        eyebrow="Keep going"
        title="My Learning"
        description="Everything you've started, sorted by what's closest to done."
      />

      {displayedEnrolled.length > 0 ? (
        <>
          <div className="card-surface p-5">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Overall course progress</span>
              <span className="text-primary">{avg}%</span>
            </div>
            <Progress value={avg} className="mt-3 h-2.5" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {displayedEnrolled.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="grid size-16 place-items-center rounded-2xl bg-blue-50 text-blue-600 mb-3">
            <BookOpen className="size-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800">No enrolled courses yet</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 max-w-md">
            You haven&apos;t started any courses yet. Explore our library to find exciting interactive courses!
          </p>
          <Button asChild className="mt-6 rounded-full bg-blue-600 px-6 font-bold text-white shadow-md hover:bg-blue-700">
            <Link to="/kidz/explore">Explore Courses</Link>
          </Button>
        </div>
      )}

      {recommendedCourses.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-extrabold text-slate-900">Recommended for you</h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recommendedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export const KidzMyLearning = MyLearningPage;
export default KidzMyLearning;
