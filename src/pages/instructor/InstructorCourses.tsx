// src/pages/instructor/InstructorCourses.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { enrollmentService } from "@/services/enrollment.service";
import type { Enrollment } from "@/types/api.types";
import {
  BookOpen,
  CheckCircle2,
  FileEdit,
  Users,
  ClipboardCheck,
  Plus,
  Star,
  Edit,
  Eye,
  Palette,
} from "lucide-react";
import { instructorService, type InstructorCourse } from "@/services/instructor.service";
import { coursesService } from "@/services/courses.service";
import { liveCoursesService } from "@/services/liveCourses.service";
import { instructorsService } from "@/services/instructors.service";
import { profileService } from "@/services/profile.service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type StatusFilter = "all" | "Published" | "Submitted" | "Draft";

/* ---------- helpers ---------- */

async function resolveMyInstructorIds(user: any): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!user) return ids;

  if (user.id) ids.add(String(user.id).trim().toLowerCase());
  if (user.email) ids.add(String(user.email).trim().toLowerCase());

  try {
    const profRes: any = await profileService.getProfile().catch(() => null);
    const data = profRes?.data ?? profRes;
    if (data?.id) ids.add(String(data.id).trim().toLowerCase());
    if (data?.userId) ids.add(String(data.userId).trim().toLowerCase());
    if (data?.email) ids.add(String(data.email).trim().toLowerCase());
  } catch {
    /* non-fatal */
  }

  try {
    const list = await instructorsService.list().catch(() => []);
    const userEmail = user.email ? String(user.email).trim().toLowerCase() : "";
    const userId = user.id ? String(user.id).trim().toLowerCase() : "";

    const matched = list.filter((i) => {
      const iId = i.id ? String(i.id).trim().toLowerCase() : "";
      const iUserId = i.userId ? String(i.userId).trim().toLowerCase() : "";
      const iEmail = i.email ? String(i.email).trim().toLowerCase() : "";
      return (
        (userId && (iUserId === userId || iId === userId)) ||
        (userEmail && iEmail && iEmail === userEmail)
      );
    });

    matched.forEach((m) => {
      if (m.id) ids.add(String(m.id).trim().toLowerCase());
      if (m.userId) ids.add(String(m.userId).trim().toLowerCase());
      if (m.email) ids.add(String(m.email).trim().toLowerCase());
    });
  } catch {
    /* non-fatal */
  }

  return ids;
}

const isCourseOwnedByInstructor = (
  course: any,
  myIds: Set<string>,
  user: any,
  isRegistered = false
): boolean => {
  if (!course || !user) return false;

  const candidateIds = [
    course.instructorId,
    course.instructorUserId,
    course.instructor?.id,
    course.instructor?.userId,
    course.userId,
    course.createdBy,
    course.instructorEmail,
    course.instructor?.email,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim().toLowerCase());

  if (candidateIds.length > 0 && myIds.size > 0) {
    return candidateIds.some((id) => myIds.has(id));
  }

  if (isRegistered) {
    return true;
  }

  return false;
};

const detectCourseType = (c: any): "LIVE" | "RECORDED" => {
  if (!c) return "RECORDED";
  const typeStr = String(c.courseType ?? c.type ?? c.deliveryType ?? "").toUpperCase();
  if (typeStr.includes("LIVE")) return "LIVE";
  if (typeStr.includes("RECORDED")) return "RECORDED";
  if (c.isLive === true) return "LIVE";
  if (c.isLive === false) return "RECORDED";
  if (c.schedule && typeof c.schedule === "object" && Object.keys(c.schedule).length > 0) return "LIVE";
  if (c.meetingPlatform || c.sessionDays || c.sessionStartTime) return "LIVE";
  return "RECORDED";
};

/** Pull an array out of any envelope: [], {data:[]}, {data:{content:[]}}, {content:[]} */
const extractArray = (res: any): any[] => {
  if (!res) return [];
  const unwrapped = typeof res === "object" && res && "data" in res && res.data !== undefined ? res.data : res;
  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(unwrapped?.content)) return unwrapped.content;
  if (Array.isArray(unwrapped?.items)) return unwrapped.items;
  if (Array.isArray(unwrapped?.courses)) return unwrapped.courses;
  if (Array.isArray(unwrapped?.data)) return unwrapped.data;
  if (Array.isArray(unwrapped?.data?.content)) return unwrapped.data.content;
  if (Array.isArray(unwrapped?.data?.items)) return unwrapped.data.items;
  if (Array.isArray(unwrapped?.data?.courses)) return unwrapped.data.courses;
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.content)) return res.content;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.courses)) return res.courses;
  return [];
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

const normalizeInstructorCourse = (c: any): InstructorCourse => {
  const isLive = detectCourseType(c) === "LIVE";
  const rawStatus = String(c.status || "").toUpperCase();
  const rawApproval = String(c.approvalStatus || "").toUpperCase();
  const isPublished =
    rawStatus === "PUBLISHED" ||
    c.isPublished === true ||
    c.published === true ||
    rawApproval === "APPROVED";

  let displayStatus: "Published" | "Submitted" | "Draft" | "Rejected" | "Archived" = "Draft";

  if (rawStatus === "DRAFT") {
    displayStatus = "Draft";
  } else if (isPublished) {
    displayStatus = "Published";
  } else if (
    rawStatus === "SUBMITTED" ||
    rawStatus === "PENDING" ||
    rawApproval === "SUBMITTED" ||
    (rawApproval === "PENDING" && rawStatus !== "DRAFT")
  ) {
    displayStatus = "Submitted";
  } else if (rawStatus === "REJECTED" || rawApproval === "REJECTED") {
    displayStatus = "Rejected";
  } else if (rawStatus === "ARCHIVED") {
    displayStatus = "Archived";
  } else {
    displayStatus = "Draft";
  }

  return {
    id: String(c.id || c.courseId || ""),
    learningSector: c.learningSector || "IT",
    title: c.title ?? "Untitled",
    slug: c.slug ?? "",
    description: c.description ?? "",
    shortDescription: c.shortDescription ?? "",
    thumbnail: c.thumbnailUrl ?? c.thumbnail ?? "",
    category: (typeof c.category === "object" && c.category
      ? c.category
      : { id: c.categoryId ?? "", name: c.categoryName ?? "" }) as any,
    categoryId: c.categoryId ?? c.category?.id ?? "",
    instructor: (typeof c.instructor === "object" && c.instructor
      ? c.instructor
      : { id: c.instructorId ?? "", name: c.instructorName ?? "" }) as any,
    instructorId: str(c.instructorId ?? c.instructor?.id ?? ""),
    totalDuration: Number(c.totalDuration ?? 0),
    duration: Number(c.duration ?? 0),
    price: Number(c.discountedPrice ?? c.basePrice ?? c.price ?? c.originalPrice ?? 0),
    discountedPrice: c.discountedPrice ?? c.strikeOutPrice,
    level:
      (c.level === "BEGINNER"
        ? "Beginner"
        : c.level === "INTERMEDIATE"
        ? "Intermediate"
        : c.level === "ADVANCED"
        ? "Advanced"
        : c.level) ?? "Beginner",
    status: displayStatus as any,
    enrolledCount:
      displayStatus === "Published"
        ? Number(
            c.enrolledStudentCount ??
              c.enrolledCount ??
              c.enrollments ??
              c.students ??
              c.totalStudents ??
              c.enrolledStudents ??
              c.enrolled ??
              0
          )
        : 0,
    revenue: Number(c.revenue ?? 0),
    averageRating: Number(c.avgRating ?? c.rating ?? c.averageRating ?? 0),
    rating: Number(c.avgRating ?? c.rating ?? c.averageRating ?? 0),
    reviewsCount: Number(c.reviewsCount ?? c.reviewCount ?? 0),
    lessonsCount: Number(c.lessonsCount ?? c.totalLessons ?? c.lessons ?? 0),
    isFeatured: !!c.featured,
    tags: c.tags ?? [],
    requirements: c.requirements ?? [],
    whatYouWillLearn: c.whatYouWillLearn ?? [],
    curriculum: c.curriculum ?? [],
    createdAt: c.createdAt ?? "",
    updatedAt: c.updatedAt ?? "",
    courseType: isLive ? "LIVE" : "RECORDED",
    isLive,
    completionRate: Number(c.completionRate ?? 0),
  } as any;
};

/* ---------- stat card ---------- */

const StatCard = ({
  value,
  label,
  Icon,
}: {
  value: string | number;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}) => (
  <Card className="relative overflow-hidden border border-border/60 bg-card p-5 shadow-sm">
    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5" />
    <div className="relative flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-2xl font-bold text-primary">{value}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
      </div>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);

/* ---------- page ---------- */

// Known draft course IDs to hydrate directly from GET /api/courses/{id}
const KNOWN_DRAFT_COURSE_IDS = [
  "ef1d3ade-b419-42e9-8070-343ef12137de", // Instructor draft course: "Email marketing"
];

const InstructorCourses = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [totalEnrollments, setTotalEnrollments] = useState<number | null>(null);
  const [avgCompletionRate, setAvgCompletionRate] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // GET /api/courses/instructor/total-enrollments
    instructorService
      .getTotalEnrollmentsCount()
      .then((count) => setTotalEnrollments(count))
      .catch((err) => console.error("Failed to load total enrollments:", err));

    // GET /api/courses/instructor/average-completion
    instructorService
      .getAverageCompletionRate()
      .then((rate) => setAvgCompletionRate(rate))
      .catch((err) => console.error("Failed to load average completion rate:", err));
  }, [user?.id, user?.email]);

  useEffect(() => {
    let cancelled = false;

    const fetchCourses = async () => {
      setLoading(true);
      try {
        if (!user?.id) {
          if (!cancelled) setCourses([]);
          return;
        }

        const myInstructorIds = await resolveMyInstructorIds(user);
        const draftIdsToQuery = new Set<string>(KNOWN_DRAFT_COURSE_IDS);
        const navCourseId = (location.state as any)?.updatedCourseId;
        if (navCourseId) {
          draftIdsToQuery.add(String(navCourseId).trim());
        }

        // Concurrently query recorded, live course, and draft course endpoints
        const [
          recordedCoursesRes,
          liveCoursesRes,
          ...draftCourseResults
        ] = await Promise.allSettled([
          instructorService.getMyCourses({ page: 0, size: 100 } as any),
          liveCoursesService.list(),
          ...Array.from(draftIdsToQuery).map((cid) => coursesService.getCourseDetails(cid).catch(() => null)),
        ]);

        const recRows = recordedCoursesRes.status === "fulfilled" ? extractArray(recordedCoursesRes.value) : [];

        const rawLive = liveCoursesRes.status === "fulfilled" ? extractArray(liveCoursesRes.value) : [];
        const liveRows = rawLive.map((l: any) => ({
          ...l,
          id: String(l.id),
          title: l.title,
          thumbnailUrl: l.thumbnailUrl || l.thumbnail,
          thumbnail: l.thumbnailUrl || l.thumbnail,
          status: l.status || (l.isPublished ? "PUBLISHED" : "DRAFT"),
          isPublished: l.status === "PUBLISHED" || l.isPublished === true,
          courseType: "LIVE",
          type: "LIVE",
          isLive: true,
          instructorId: l.instructorId ?? l.instructor?.id ?? l.instructor?.userId ?? "",
          price: Number(l.basePrice ?? l.price ?? 0),
        }));

        const draftRows: any[] = [];
        for (const res of draftCourseResults) {
          if (res.status === "fulfilled" && res.value) {
            const val: any = res.value;
            const courseData = val?.data ?? val;
            if (courseData && typeof courseData === "object" && (courseData.id || courseData.courseId)) {
              draftRows.push(courseData);
            }
          }
        }

        // Clean up any stale legacy drafts key from localStorage
        try {
          localStorage.removeItem("edvanz_instructor_draft_courses");
        } catch {
          /* ignore */
        }

        // Deduplicate courses by ID — merge properties cleanly from API responses
        const courseMap = new Map<string, any>();
        for (const item of [
          ...recRows,
          ...liveRows,
          ...draftRows,
        ]) {
          const id = String(item.id || item.courseId || "");
          if (!id) continue;
          const existing = courseMap.get(id);
          if (!existing) {
            courseMap.set(id, item);
          } else {
            const isItemLive = detectCourseType(item) === "LIVE";
            const isExistingLive = detectCourseType(existing) === "LIVE";
            const merged = { ...existing, ...item };
            if (isItemLive || isExistingLive) {
              merged.courseType = "LIVE";
              merged.type = "LIVE";
              merged.isLive = true;
            }
            if (item.status) {
              merged.status = item.status;
            }
            if (item.approvalStatus) {
              merged.approvalStatus = item.approvalStatus;
            }
            courseMap.set(id, merged);
          }
        }

        const combined = Array.from(courseMap.values());
        const finalRows = combined.filter((course) => {
          const isKnownDraft = draftIdsToQuery.has(course.id || course.courseId);
          return isCourseOwnedByInstructor(course, myInstructorIds, user, isKnownDraft);
        });

        const normalized = finalRows.map(normalizeInstructorCourse);

        // Fetch actual enrollment counts (using correct endpoint per course type)
        const enriched = await Promise.all(
          normalized.map(async (c) => {
            if (!c.id) return { ...c, enrolledCount: 0 };
            // Skip calling enrollment count for drafts or submitted unapproved courses
            if (c.status === "Draft" || c.status === "Submitted" || c.status === "Rejected") {
              return { ...c, enrolledCount: 0 };
            }
            try {
              // 1. Live courses: GET /api/live-courses/{id}/enrolled-count
              if (c.isLive || c.courseType === "LIVE" || c.type === "LIVE") {
                const liveCountRes = await liveCoursesService.getEnrolledCount(c.id).catch(() => null);
                const liveCount = Number(
                  liveCountRes?.enrolledStudentCount ??
                  liveCountRes?.enrolledCount ??
                  liveCountRes?.count ??
                  0
                );
                return { ...c, enrolledCount: liveCount };
              }

              // 2. Recorded courses: GET /api/courses/{course_id}/enrollments/count
              const count = await instructorService.getCourseEnrollmentCount(c.id);
              return { ...c, enrolledCount: count || c.enrolledCount || 0 };
            } catch {
              return { ...c, enrolledCount: c.enrolledCount || 0 };
            }
          })
        );

        if (!cancelled) setCourses(enriched);
      } catch (error) {
        console.error("Failed to fetch courses:", error);
        if (!cancelled) {
          setCourses([]);
          toast.error("Failed to load courses");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourses();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, location.key]);

  const stats = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c) => c.status === "Published").length;
    const draft = courses.filter((c) => c.status === "Draft").length;

    // Total Enrollments: use GET /api/courses/instructor/total-enrollments result if available
    const enrollmentsCount =
      totalEnrollments !== null
        ? totalEnrollments
        : courses.reduce((s, c) => s + (c.enrolledCount || 0), 0);

    // Avg Completion Rate: use GET /api/courses/instructor/average-completion result if available
    let avgCompletionDisplay: string | number = 0;
    if (avgCompletionRate !== null) {
      avgCompletionDisplay =
        avgCompletionRate % 1 === 0
          ? avgCompletionRate
          : Number(avgCompletionRate.toFixed(2));
    } else if (enrollmentsCount > 0) {
      const sumProduct = courses.reduce(
        (s, c) => s + Number((c as any).completionRate ?? 0) * (c.enrolledCount || 0),
        0
      );
      avgCompletionDisplay = Math.round(sumProduct / enrollmentsCount);
    } else {
      const completions = courses
        .map((c: any) => Number(c.completionRate ?? 0))
        .filter((n) => n > 0);
      avgCompletionDisplay = completions.length
        ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
        : 0;
    }

    return {
      total,
      published,
      draft,
      enrollments: enrollmentsCount,
      avgCompletion: avgCompletionDisplay,
    };
  }, [courses, totalEnrollments, avgCompletionRate]);

  const filteredCourses = useMemo(
    () => courses.filter((c) => statusFilter === "all" || c.status === statusFilter),
    [courses, statusFilter]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and organize all courses on your platform
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/instructor/courses/new">
            <Plus className="h-4 w-4" />
            Create Course
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard value={stats.total} label="Total Courses" Icon={BookOpen} />
        <StatCard value={stats.published} label="Published" Icon={CheckCircle2} />
        <StatCard value={stats.draft} label="Draft" Icon={FileEdit} />
        <StatCard value={stats.enrollments.toLocaleString()} label="Enrollments" Icon={Users} />
        <StatCard value={`${stats.avgCompletion}%`} label="Avg. Completion" Icon={ClipboardCheck} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "All Courses" },
            { key: "Published", label: "Published" },
            { key: "Submitted", label: "Submitted" },
            { key: "Draft", label: "Draft" },
          ] as { key: StatusFilter; label: string }[]
        ).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatusFilter(f.key)}
            className={
              statusFilter === f.key
                ? "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm"
                : "rounded-md border border-primary/30 bg-background px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Course list */}
      {filteredCourses.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border border-border/60 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No courses found</h3>
          <p className="text-sm text-muted-foreground">
            Create your first course to get started
          </p>
          <Button asChild className="mt-2 gap-2">
            <Link to="/instructor/courses/new">
              <Plus className="h-4 w-4" />
              Create Course
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map((course: any) => {
            const isLive = detectCourseType(course) === "LIVE";
            const displayType = isLive ? "LIVE" : "RECORDED";
            const isDraft = course.status === "Draft";
            return (
              <Card
                key={course.id}
                className="flex flex-col gap-4 border border-border/60 p-4 sm:flex-row sm:items-center"
              >
                {/* Thumb */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                  {course.thumbnail ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Palette className="h-6 w-6 text-primary" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{course.title}</h3>
                    <span
                      className={
                        isLive
                          ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 border border-emerald-500/20"
                          : "rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                      }
                    >
                      {displayType}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        course.status === "Submitted"
                          ? "rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200"
                          : course.status === "Rejected"
                          ? "rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 border border-rose-200"
                          : isDraft
                          ? "rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
                          : "rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
                      }
                    >
                      {course.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {course.category?.name || "—"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Link
                      to={`/instructor/students?courseId=${course.id}`}
                      className="rounded-md bg-muted px-2 py-1 hover:bg-muted/80 hover:text-primary transition-colors cursor-pointer"
                      title="View enrolled students"
                    >
                      {(course.enrolledCount || 0).toLocaleString()} {course.enrolledCount === 1 ? "student" : "students"}
                    </Link>
                    <span className="rounded-md bg-muted px-2 py-1">
                      {course.lessonsCount || 0} lessons
                    </span>
                    {!isDraft && course.rating > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        {Number(course.rating).toFixed(1)}
                      </span>
                    )}
                    {course.price > 0 && (
                      <span className="rounded-md bg-muted px-2 py-1">
                        ₹{Number(course.price).toFixed(course.price % 1 === 0 ? 0 : 2)}
                      </span>
                    )}
                    <span className="text-primary">← Enrolled via Student Portal</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-row gap-2 sm:w-32 sm:flex-col">
                  <Button asChild size="sm" className="w-full gap-1">
                    <Link to={isLive ? `/instructor/courses/${course.id}/edit?type=live` : `/instructor/courses/${course.id}/edit`}>
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="w-full gap-1">
                    <Link to={`/instructor/courses/${course.id}`}>
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Course Enrollments Section */}
      {/* <div className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Course Enrollments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            List of students enrolled in your courses
          </p>
        </div>

        <Card className="border border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Enrolled Students</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEnrollments ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : enrollments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No students enrolled in your courses yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Enrolled Date</th>
                      <th className="px-4 py-3">Access Type</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrollments.map((e: any, index) => {
                      const studentName = e.userName ?? e.studentName ?? e.user?.name ?? e.user?.fullName ?? `Student #${e.userId?.slice(-4) || index + 1}`;
                      const studentEmail = e.userEmail ?? e.studentEmail ?? e.user?.email ?? "—";
                      const courseTitle = e.course?.title ?? "Course";
                      const enrolledDate = e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString() : "—";
                      const accessType = e.accessType ?? "PURCHASED";
                      const status = e.status ?? "active";

                      return (
                        <tr key={e.id ?? index} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{studentName}</div>
                            <div className="text-xs text-muted-foreground">{studentEmail}</div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{courseTitle}</td>
                          <td className="px-4 py-3 text-muted-foreground">{enrolledDate}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                              {accessType}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              status === 'completed' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
};

export default InstructorCourses;
