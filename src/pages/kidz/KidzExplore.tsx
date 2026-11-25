import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Loader2, Video, Radio } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { CourseCard } from "@/components/kidz/KidzCourseCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Course } from "@/data/kidz/portal";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { categoriesService } from "@/services/kidz/categories.service";
import { coursesService } from "@/services/kidz/courses.service";
import type { CourseDTO, KidzCategoryDTO } from "@/types/kidz/api.types";

const fallbackCategories: KidzCategoryDTO[] = [
  { id: "fallback-math", name: "Mathematics", slug: "mathematics" },
  { id: "fallback-science", name: "Science", slug: "science" },
  { id: "fallback-coding", name: "Coding & Tech", slug: "coding" },
  { id: "fallback-english", name: "English", slug: "english" },
  { id: "fallback-arts", name: "Arts", slug: "arts" },
];

function getCategoryEmoji(cat: { name?: string; slug?: string }): string {
  const name = (cat.name || cat.slug || "").toLowerCase();
  if (name.includes("math")) return "➗";
  if (name.includes("politic") || name.includes("social") || name.includes("civic")) return "🏛️";
  if (
    name.includes("web") ||
    name.includes("dev") ||
    name.includes("code") ||
    name.includes("tech") ||
    name.includes("comput") ||
    name.includes("program")
  ) {
    return "💻";
  }
  if (
    name.includes("sci") ||
    name.includes("bio") ||
    name.includes("phys") ||
    name.includes("chem")
  ) {
    return "🧪";
  }
  if (name.includes("eng") || name.includes("read") || name.includes("lit")) return "📖";
  if (name.includes("art") || name.includes("design") || name.includes("craft")) return "🎨";
  if (name.includes("music") || name.includes("audio")) return "🎵";
  if (name.includes("robot") || name.includes("ai") || name.includes("machine")) return "🤖";
  if (name.includes("lang")) return "🗣️";
  if (name.includes("general") || name.includes("knowledge")) return "🧠";
  return "📚";
}

const levels = ["All Levels", "Beginner", "Intermediate", "Advanced"] as const;
type LevelOption = (typeof levels)[number];

const prices = ["All", "Premium", "Free"] as const;
type PriceOption = (typeof prices)[number];

/** Normalize level string into standard "Beginner" | "Intermediate" | "Advanced" */
export function normalizeLevel(rawLevel?: string): "Beginner" | "Intermediate" | "Advanced" {
  if (!rawLevel) return "Beginner";
  const upper = String(rawLevel).trim().toUpperCase();
  if (upper === "ADVANCED" || upper.includes("ADV")) return "Advanced";
  if (upper === "INTERMEDIATE" || upper.includes("INT") || upper.includes("MID")) return "Intermediate";
  return "Beginner";
}

/** Check if a course is Free or Premium based on backend price/accessType/isFree fields */
export function isCourseFree(c: any): boolean {
  if (c.isFree === true || c.is_free === true) return true;
  if (String(c.accessType || "").toUpperCase() === "FREE") return true;

  const disc = c.discountedPrice != null ? Number(c.discountedPrice) : undefined;
  const price = c.price != null ? Number(c.price) : undefined;
  const base = c.basePrice != null ? Number(c.basePrice) : undefined;
  const orig = c.originalPrice != null ? Number(c.originalPrice) : undefined;

  if (disc === 0 || price === 0 || base === 0 || (orig === 0 && disc == null)) return true;
  return false;
}

export function ExplorePage() {
  useDocumentMeta(
    "Explore Courses - EDVANZ",
    "Search and filter hundreds of teen-friendly courses by subject, level and price.",
  );

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Course Type: RECORDED vs LIVE
  const rawTypeParam = (searchParams.get("type") || searchParams.get("courseType") || "").toUpperCase();
  const courseType: "RECORDED" | "LIVE" = rawTypeParam === "LIVE" ? "LIVE" : "RECORDED";

  // URL search params
  const query = searchParams.get("q")?.slice(0, 80) ?? "";
  const activeSubject = searchParams.get("subject") ?? "All";
  const activeCategoryId = searchParams.get("categoryId") ?? "";

  const rawLevelParam = searchParams.get("level") ?? "All Levels";
  const level: LevelOption = levels.some((l) => l.toLowerCase() === rawLevelParam.toLowerCase())
    ? levels.find((l) => l.toLowerCase() === rawLevelParam.toLowerCase())!
    : "All Levels";

  const rawPriceParam = searchParams.get("price") ?? "All";
  const price: PriceOption = prices.some((p) => p.toLowerCase() === rawPriceParam.toLowerCase())
    ? prices.find((p) => p.toLowerCase() === rawPriceParam.toLowerCase())!
    : "All";

  // Dynamic Categories from API
  const [categories, setCategories] = useState<KidzCategoryDTO[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Separate states for recorded and live courses
  const [recordedCourses, setRecordedCourses] = useState<CourseDTO[]>([]);
  const [liveCourses, setLiveCourses] = useState<any[]>([]);
  const [loadingRecorded, setLoadingRecorded] = useState(true);
  const [loadingLive, setLoadingLive] = useState(true);

  // Fetch Recorded Courses (using POST /courses/searchfilters when query/category given, otherwise GET /courses)
  const fetchRecorded = useCallback(async () => {
    setLoadingRecorded(true);
    try {
      let data: CourseDTO[] = [];
      const trimmedQuery = query.trim();
      const hasCategory = activeCategoryId && activeCategoryId !== "All";

      if (trimmedQuery || hasCategory) {
        const searchRes = await coursesService.searchCoursesFilters({
          keyword: trimmedQuery || undefined,
          categoryIds: hasCategory ? [activeCategoryId] : undefined,
          page: 0,
          size: 50,
          sortBy: "latest",
        });
        if (searchRes.courses && searchRes.courses.length > 0) {
          data = searchRes.courses;
        }
      }

      if (data.length === 0) {
        data = await coursesService.getRecordedCourses({
          page: 0,
          size: 50,
          search: trimmedQuery || undefined,
          subject: activeSubject !== "All" ? activeSubject : undefined,
        });
      }

      setRecordedCourses(data || []);
    } catch (err) {
      console.warn("Could not load recorded courses:", err);
    } finally {
      setLoadingRecorded(false);
    }
  }, [query, activeCategoryId, activeSubject]);

  // Fetch Live Courses (GET /catalog/live-courses?status=PUBLISHED&learningSector=KIDS)
  const fetchLive = useCallback(async () => {
    setLoadingLive(true);
    try {
      const data = await coursesService.getLiveCourses({ status: "PUBLISHED", learningSector: "KIDS" });
      setLiveCourses(data);
    } catch (err) {
      console.warn("Could not load live courses:", err);
    } finally {
      setLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecorded();
    void fetchLive();
  }, [fetchRecorded, fetchLive]);

  useEffect(() => {
    let mounted = true;
    categoriesService
      .getCategories()
      .then((cats) => {
        if (mounted) {
          setCategories(cats);
          setCategoriesLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setCategoriesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const displayCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    return fallbackCategories;
  }, [categories]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    displayCategories.forEach((cat) => {
      if (cat.id && cat.name) {
        map.set(cat.id, cat.name);
      }
    });
    return map;
  }, [displayCategories]);

  const setParams = (next: {
    q?: string;
    subject?: string;
    categoryId?: string;
    level?: string;
    price?: string;
    type?: string;
  }) => {
    const params = new URLSearchParams(searchParams);

    if (next.type !== undefined) {
      if (next.type && next.type.toLowerCase() === "live") params.set("type", "live");
      else params.delete("type");
    }
    if (next.q !== undefined) {
      if (next.q.trim()) params.set("q", next.q.slice(0, 80));
      else params.delete("q");
    }
    if (next.subject !== undefined) {
      if (next.subject && next.subject !== "All") params.set("subject", next.subject);
      else params.delete("subject");
    }
    if (next.categoryId !== undefined) {
      if (next.categoryId && next.categoryId !== "All") params.set("categoryId", next.categoryId);
      else params.delete("categoryId");
    }
    if (next.level !== undefined) {
      if (next.level && next.level !== "All Levels") params.set("level", next.level);
      else params.delete("level");
    }
    if (next.price !== undefined) {
      if (next.price && next.price !== "All") params.set("price", next.price);
      else params.delete("price");
    }

    const qs = params.toString();
    navigate(qs ? `/kidz/explore?${qs}` : "/kidz/explore", { replace: true });
  };

  const realCourses: Course[] = useMemo(() => {
    if (courseType === "LIVE") {
      return liveCourses
        .filter((c) => (c.learningSector || "").toUpperCase() === "KIDS")
        .map((c, idx) => {
        const resolvedCategory =
          (c.categoryId ? categoryMap.get(c.categoryId) : undefined) ||
          c.subject ||
          c.category ||
          "Live Cohort";
        const normalizedLvl = normalizeLevel(c.level);
        const free = isCourseFree(c);

        return {
          id: c.id,
          categoryId: c.categoryId,
          title: c.title,
          teacher: c.instructorName || c.instructor?.fullName || "Live Instructor",
          subject: resolvedCategory,
          thumbnailUrl: c.thumbnailUrl || (c as any).thumbnail || (c as any).coverImage || null,
          emoji: c.emoji || getCategoryEmoji({ name: resolvedCategory }),
          rating: c.rating ?? 4.9,
          students: c.enrolledStudentsCount ?? (c.schedule?.maxSeats ? c.schedule.maxSeats : 45),
          lessons: c.schedule?.sessionDays ? c.schedule.sessionDays.split(',').length : 1,
          duration: c.schedule?.sessionDurationMinutes ? `${c.schedule.sessionDurationMinutes}m / session` : (c.duration ?? "Live"),
          age: "12-18",
          level: normalizedLvl,
          price: free ? ("Free" as const) : ("Premium" as const),
          tint: idx % 2 === 0 ? "bg-mint/25" : "bg-sky/25",
          courseType: "LIVE" as const,
          isLive: true,
          schedule: c.schedule,
          discountedPrice: c.discountedPrice,
          originalPrice: c.originalPrice,
        };
      });
    }

    return recordedCourses
      .filter((c) => (c.learningSector || "").toUpperCase() === "KIDS")
      .map((c, idx) => {
        const resolvedCategory =
          (c.categoryId ? categoryMap.get(c.categoryId) : undefined) ||
          c.subject ||
          c.category ||
          "General";
        const normalizedLvl = normalizeLevel(c.level);
        const free = isCourseFree(c);

        return {
          id: c.id,
          categoryId: c.categoryId,
          title: c.title,
          teacher: c.instructorName || "Instructor",
          subject: resolvedCategory,
          thumbnailUrl: c.thumbnailUrl || (c as any).thumbnail || (c as any).coverImage || null,
          emoji: c.emoji || getCategoryEmoji({ name: resolvedCategory }),
          rating: c.rating ?? 4.8,
          students: c.enrolledStudentsCount ?? 150,
          lessons: c.totalLessons ?? 12,
          duration: c.duration ?? "4h 00m",
          age: "12-18",
          level: normalizedLvl,
          price: free ? ("Free" as const) : ("Premium" as const),
          tint: idx % 2 === 0 ? "bg-mint/25" : "bg-sky/25",
          courseType: "RECORDED" as const,
          isLive: false,
          discountedPrice: c.discountedPrice,
          originalPrice: c.price,
        };
      });
  }, [courseType, liveCourses, recordedCourses, categoryMap]);

  const results = useMemo(() => {
    return realCourses.filter((course) => {
      // 1. Category / Subject matching
      let matchesCategory = true;
      if (activeCategoryId && activeCategoryId !== "All") {
        matchesCategory = course.categoryId === activeCategoryId;
      } else if (activeSubject && activeSubject !== "All") {
        const selLower = activeSubject.toLowerCase().trim();
        const courseSubLower = (course.subject || "").toLowerCase();
        matchesCategory =
          courseSubLower === selLower ||
          courseSubLower.includes(selLower) ||
          selLower.includes(courseSubLower);
      }

      // 2. Level filter (case-insensitive)
      const matchesLevel =
        level === "All Levels" ||
        course.level.toLowerCase() === level.toLowerCase();

      // 3. Price filter ("All" | "Premium" | "Free")
      const matchesPrice =
        price === "All" ||
        course.price.toLowerCase() === price.toLowerCase();

      // 4. Keyword search filter
      const matchesQuery =
        !query ||
        `${course.title} ${course.teacher} ${course.subject}`
          .toLowerCase()
          .includes(query.toLowerCase());

      return matchesCategory && matchesLevel && matchesPrice && matchesQuery;
    });
  }, [realCourses, activeCategoryId, activeSubject, level, price, query]);

  const clearFilters = () => {
    if (courseType === "LIVE") {
      navigate("/kidz/explore?type=live", { replace: true });
    } else {
      navigate("/kidz/explore", { replace: true });
    }
  };

  const hasActiveFilters = Boolean(
    query ||
    (activeSubject && activeSubject !== "All") ||
    (activeCategoryId && activeCategoryId !== "All") ||
    level !== "All Levels" ||
    price !== "All"
  );

  const isLoading = courseType === "LIVE" ? loadingLive : loadingRecorded;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">DISCOVER</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">Explore courses</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Courses built for curious students — filter until you find your thing.
        </p>
      </div>

      {/* Course Type Switcher: Recorded Courses vs Live Courses */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setParams({ type: "recorded" })}
          className={`group flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all duration-200 active:scale-95 cursor-pointer ${
            courseType === "RECORDED"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-xs"
          }`}
        >
          <Video className={`size-4 ${courseType === "RECORDED" ? "text-white" : "text-blue-600"}`} />
          <span>Recorded Courses</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              courseType === "RECORDED"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
            }`}
          >
            {loadingRecorded
              ? "..."
              : recordedCourses.filter((c) => (c.learningSector || "").toUpperCase() === "KIDS").length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setParams({ type: "live" })}
          className={`group flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-extrabold transition-all duration-200 active:scale-95 cursor-pointer ${
            courseType === "LIVE"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/20"
              : "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/80 shadow-xs"
          }`}
        >
          <Radio className={`size-4 ${courseType === "LIVE" ? "text-rose-400 animate-pulse" : "text-rose-500"}`} />
          <span>Live Courses</span>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
              courseType === "LIVE"
                ? "bg-rose-500 text-white"
                : "bg-rose-50 text-rose-600 border border-rose-200/50"
            }`}
          >
            <span className="size-1.5 rounded-full bg-current animate-ping" />
            LIVE{" "}
            {loadingLive
              ? "..."
              : `(${liveCourses.filter((c) => (c.learningSector || "").toUpperCase() === "KIDS").length})`}
          </span>
        </button>
      </div>

      {/* Filter Box */}
      <div className="rounded-3xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-6 space-y-4 shadow-xs">
        {/* Search Input */}
        <div className="relative">
          <Input
            value={query}
            maxLength={80}
            onChange={(e) => setParams({ q: e.target.value })}
            placeholder="Search by title, subject or teacher"
            className="h-12 rounded-full border-slate-200 bg-white pl-11 pr-10 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
            aria-label="Search courses"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          {query && (
            <button
              onClick={() => setParams({ q: "" })}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Categories / Subjects Row */}
        <FilterRow label="SUBJECT">
          <Chip
            active={
              (!activeCategoryId || activeCategoryId === "All") &&
              (!activeSubject || activeSubject === "All")
            }
            onClick={() => setParams({ subject: "All", categoryId: "All" })}
          >
            All
          </Chip>
          {displayCategories.map((cat) => {
            const isCatActive =
              (activeCategoryId && activeCategoryId === cat.id) ||
              (activeSubject &&
                activeSubject !== "All" &&
                (activeSubject.toLowerCase() === cat.name.toLowerCase() ||
                  (cat.slug && activeSubject.toLowerCase() === cat.slug.toLowerCase())));
            return (
              <Chip
                key={cat.id}
                active={Boolean(isCatActive)}
                onClick={() => {
                  if (isCatActive) {
                    setParams({ subject: "All", categoryId: "All" });
                  } else {
                    setParams({ subject: cat.name, categoryId: cat.id });
                  }
                }}
              >
                <span className="mr-1.5">{getCategoryEmoji(cat)}</span>
                {cat.name}
              </Chip>
            );
          })}
        </FilterRow>

        {/* Level Row */}
        <FilterRow label="LEVEL">
          {levels.map((l) => (
            <Chip
              key={l}
              active={level === l}
              onClick={() => {
                if (level === l && l !== "All Levels") {
                  setParams({ level: "All Levels" });
                } else {
                  setParams({ level: l });
                }
              }}
            >
              {l}
            </Chip>
          ))}
        </FilterRow>

        {/* Price Row */}
        <FilterRow label="PRICE">
          {prices.map((p) => (
            <Chip
              key={p}
              active={price === p}
              onClick={() => {
                if (price === p && p !== "All") {
                  setParams({ price: "All" });
                } else {
                  setParams({ price: p });
                }
              }}
            >
              {p}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
        <p>
          Showing {results.length} {courseType === "LIVE" ? "live" : "recorded"} courses
        </p>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-blue-600 hover:underline cursor-pointer">
            Clear all filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-20 text-center">
          <Loader2 className="size-10 animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-black text-slate-800">
            Loading {courseType === "LIVE" ? "live courses" : "recorded courses"}...
          </h2>
        </div>
      ) : (
        /* Courses Grid */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && results.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <p className="text-5xl">{courseType === "LIVE" ? "📡" : "🔍"}</p>
          <h3 className="mt-3 text-lg font-black text-slate-900">
            {courseType === "LIVE"
              ? "No live courses match your filters"
              : "Nothing matched those filters"}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {level !== "All Levels" || price !== "All"
              ? `No ${level !== "All Levels" ? level : ""} ${price !== "All" ? price : ""} ${courseType === "LIVE" ? "live" : "recorded"} courses found under this subject.`
              : `Try clearing your search query or subject filters to see all available ${courseType === "LIVE" ? "live" : "recorded"} courses.`}
          </p>
          <Button
            className="mt-5 rounded-full bg-blue-600 px-6 py-5 text-xs font-bold text-white hover:bg-blue-700"
            onClick={clearFilters}
          >
            Reset all filters
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-16 text-[10px] font-black tracking-wider text-blue-600 uppercase">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
        active
          ? "bg-slate-900 text-white shadow-xs"
          : "bg-white text-slate-700 hover:bg-slate-100 shadow-2xs border border-slate-200/60"
      }`}
    >
      {children}
    </button>
  );
}

export const KidzExplore = ExplorePage;
export default KidzExplore;
