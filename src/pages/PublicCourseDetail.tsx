import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { coursesService } from "@/services/courses.service";
import { liveCoursesService } from "@/services/liveCourses.service";
import { instructorsService } from "@/services/instructors.service";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { extractThumbnailUrl, formatPrice, extractVideoUrl, formatEmbedVideoUrl, getAuthRedirectPath } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Star,
  Clock,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  ShoppingCart,
  Eye,
  Lock,
  Sparkles,
  X,
} from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  duration: string;
  videoDurationSeconds?: number;
  videoUrl?: string;
  isFreePreview?: boolean;
};

type Module = {
  id: string;
  title: string;
  duration: string;
  lessons: Lesson[];
};

const GRADIENT_THEMES = [
  "from-[#4323A0] via-[#2A34A4] to-[#1E2E8D]",
  "from-pink-500 via-rose-500 to-yellow-500",
  "from-purple-600 via-indigo-600 to-pink-500",
  "from-blue-600 via-cyan-600 to-teal-500",
  "from-emerald-500 via-teal-600 to-cyan-600",
  "from-indigo-600 via-purple-600 to-blue-600",
];

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "0min";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}min` : `${h}h`;
};

const normalizeCurriculum = (sections: any[]): Module[] => {
  if (!Array.isArray(sections)) return [];
  return sections.map((s: any, mi: number) => {
    const lessons = (s.lessons ?? s.items ?? []).map((l: any) => ({
      id: String(l.id ?? l.lessonId ?? ""),
      title: l.title ?? "",
      duration: formatDuration(
        l.videoDurationSeconds ?? (l.durationMinutes ? l.durationMinutes * 60 : undefined) ?? l.duration
      ),
      videoDurationSeconds: l.videoDurationSeconds ?? (l.durationMinutes ? l.durationMinutes * 60 : undefined),
      videoUrl: l.videoUrl,
      isFreePreview: !!(l.previewEnabled || l.isPreview || l.isFreePreview),
    }));
    const totalSec = lessons.reduce(
      (sum: number, l: any) => sum + (l.videoDurationSeconds || 0),
      0
    );
    const modSec = s.durationMinutes ? s.durationMinutes * 60 : totalSec;
    return {
      id: String(s.id ?? s.moduleId ?? `m-${mi}`),
      title: `${String(mi + 1).padStart(2, "0")}: ${s.title ?? "Module"}`,
      duration: formatDuration(modSec || totalSec),
      lessons,
    };
  });
};

const getCategoryName = (item: any, defaultFallback: string = "GENERAL"): string => {
  if (!item) return defaultFallback;

  if (item.categoryName && typeof item.categoryName === "string" && item.categoryName.trim()) {
    return item.categoryName.trim();
  }
  if (item.category?.name && typeof item.category.name === "string" && item.category.name.trim()) {
    return item.category.name.trim();
  }
  if (item.categoryTitle && typeof item.categoryTitle === "string" && item.categoryTitle.trim()) {
    return item.categoryTitle.trim();
  }
  if (item.category?.title && typeof item.category.title === "string" && item.category.title.trim()) {
    return item.category.title.trim();
  }
  if (item.category_name && typeof item.category_name === "string" && item.category_name.trim()) {
    return item.category_name.trim();
  }
  if (typeof item.category === "string" && item.category.trim() && !item.category.includes("-")) {
    return item.category.trim();
  }

  const titleStr = item.title || item.courseTitle || "";
  if (typeof titleStr === "string" && titleStr.trim()) {
    const t = titleStr.toLowerCase();
    if (t.includes("power bi") || t.includes("analytics") || t.includes("sql") || t.includes("excel") || t.includes("data")) {
      return "Data Analytics";
    }
    if (t.includes("react") || t.includes("web") || t.includes("javascript") || t.includes("frontend") || t.includes("node") || t.includes("html") || t.includes("css")) {
      return "Web Development";
    }
    if (t.includes("java") || t.includes("python") || t.includes("linux") || t.includes("c++") || t.includes("programming") || t.includes("code")) {
      return "Programming";
    }
    if (t.includes("machine learning") || t.includes("ai") || t.includes("intelligence") || t.includes("deep learning")) {
      return "Artificial Intelligence";
    }
    if (t.includes("kubernetes") || t.includes("docker") || t.includes("devops") || t.includes("cloud") || t.includes("aws")) {
      return "DevOps & Cloud";
    }
  }

  return defaultFallback;
};

export const PublicCourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, isInCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const curriculumRef = useRef<HTMLDivElement>(null);

  const [course, setCourse] = useState<any | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [curriculum, setCurriculum] = useState<Module[]>([]);
  const [otherCourses, setOtherCourses] = useState<any[]>([]);
  const [openModule, setOpenModule] = useState<number | null>(0);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  /* ---- Load Target Course ---- */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingCourse(true);

    const isLiveHint = !!(location.state?.isLive || location.state?.courseType === "LIVE");

    coursesService
      .getCourse(id, isLiveHint)
      .then((res: any) => {
        if (cancelled) return;
        let data: any = null;
        if (res?.success && res.data) {
          data = res.data;
        } else if (res?.id || res?.title) {
          data = res;
        }
        setCourse(data);
        if (data?.modules && Array.isArray(data.modules) && data.modules.length > 0) {
          setCurriculum(normalizeCurriculum(data.modules));
        }
      })
      .catch(() => !cancelled && setCourse(null))
      .finally(() => !cancelled && setLoadingCourse(false));

    return () => {
      cancelled = true;
    };
  }, [id, location.state]);

  /* ---- Load Curriculum ---- */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    coursesService
      .getCourseCurriculum(id)
      .then(async (res: any) => {
        const sections = res?.data ?? res ?? [];
        if (Array.isArray(sections) && sections.length > 0) {
          const enriched = await Promise.all(
            sections.map(async (s: any) => {
              if (s.lessons?.length) return s;
              try {
                const lRes: any = await coursesService.getLessonsByModule(s.id ?? s.moduleId);
                return { ...s, lessons: lRes?.data ?? lRes ?? [] };
              } catch {
                return { ...s, lessons: [] };
              }
            })
          );
          if (!cancelled) setCurriculum(normalizeCurriculum(enriched));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  /* ---- Load Library Courses for Bottom Grid ---- */
  useEffect(() => {
    let cancelled = false;
    async function loadLibraryCourses() {
      try {
        const [liveRes, recRes] = await Promise.allSettled([
          liveCoursesService.getCatalogLiveCourses(),
          coursesService.getPublicCourses(0, 10),
        ]);

        const mappedLive: any[] = [];
        if (liveRes.status === "fulfilled" && liveRes.value) {
          const rawLive = Array.isArray(liveRes.value)
            ? liveRes.value
            : Array.isArray(liveRes.value?.content)
            ? liveRes.value.content
            : Array.isArray(liveRes.value?.data)
            ? liveRes.value.data
            : [];
          rawLive.forEach((item: any) => mappedLive.push(item));
        }

        const mappedRec: any[] = [];
        if (recRes.status === "fulfilled" && recRes.value?.success && Array.isArray(recRes.value.data)) {
          recRes.value.data.forEach((item: any) => mappedRec.push(item));
        }

        const combined = [...mappedLive, ...mappedRec].filter(
          (c: any) => String(c.id) !== String(id)
        );

        if (!cancelled) {
          setOtherCourses(combined);
        }
      } catch {
        /* ignore */
      }
    }

    loadLibraryCourses();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const scrollToCurriculum = () => {
    curriculumRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ---- Cart Action ---- */
  const handleAddToCart = (targetCourse: any) => {
    const targetProductId = String(targetCourse.productId || targetCourse.product_id || targetCourse.id);
    const rawDisc = targetCourse.discountedPrice != null && !Number.isNaN(Number(targetCourse.discountedPrice))
      ? Number(targetCourse.discountedPrice)
      : targetCourse.discountPrice != null && !Number.isNaN(Number(targetCourse.discountPrice))
      ? Number(targetCourse.discountPrice)
      : undefined;
    const rawOrig = targetCourse.originalPrice != null && !Number.isNaN(Number(targetCourse.originalPrice))
      ? Number(targetCourse.originalPrice)
      : targetCourse.strikeOutPrice != null && !Number.isNaN(Number(targetCourse.strikeOutPrice))
      ? Number(targetCourse.strikeOutPrice)
      : undefined;
    const rawBase = targetCourse.basePrice != null && !Number.isNaN(Number(targetCourse.basePrice))
      ? Number(targetCourse.basePrice)
      : targetCourse.price != null && !Number.isNaN(Number(targetCourse.price))
      ? Number(targetCourse.price)
      : undefined;
    const price = rawDisc ?? rawBase ?? rawOrig ?? 0;
    const isLive = !!(
      targetCourse.isLive ||
      targetCourse.courseType === "LIVE" ||
      targetCourse.type === "LIVE"
    );

    const cartPayload = {
      id: targetProductId,
      productId: targetProductId,
      courseId: targetCourse.id,
      title: targetCourse.title,
      thumbnail: extractThumbnailUrl(targetCourse) || "",
      instructor: targetCourse.instructorName || targetCourse.instructor?.name || "Edvanz Instructor",
      category: getCategoryName(targetCourse),
      price,
      discountedPrice: price,
      originalPrice: (rawOrig != null && rawOrig > price) ? rawOrig : (rawBase != null && rawBase > price) ? rawBase : price,
      isLive,
      productType: (isLive ? "LIVE_COURSE" : "COURSE") as "LIVE_COURSE" | "COURSE",
    };

    if (!isAuthenticated) {
      try {
        localStorage.setItem("edvanz_pending_cart", JSON.stringify(cartPayload));
      } catch {}
      const targetAuth = getAuthRedirectPath();
      navigate(`${targetAuth}?redirect=${encodeURIComponent("/dashboard/cart")}`);
      return;
    }

    addToCart(cartPayload);

    toast({
      title: "Added to cart",
      description: `${targetCourse.title} has been added to your cart.`,
    });
  };

  /* ---- Loading state ---- */
  if (loadingCourse) {
    return (
      <MainLayout>
        <div className="min-h-[75vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  /* ---- Fallback if course not found ---- */
  if (!course) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
          <h1 className="text-2xl font-bold text-slate-800">Course Not Found</h1>
          <p className="text-slate-500 text-sm">
            The requested course could not be loaded.
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link to="/courses">Back to Courses</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const title = course.title || "100 Days of Code Python Pro Bootcamp";
  const categoryTag = getCategoryName(course, "PROGRAMMING").toUpperCase();
  const description =
    course.description ||
    "Build a confident Python foundation through practical projects, daily practice, and a clear path from first line of code to real applications.";

  const thumbnailUrl = extractThumbnailUrl(course);
  const totalLectures = curriculum.reduce((s, m) => s + m.lessons.length, 0) || course.totalLessons || 12;

  const rawDiscPrice = course.discountedPrice != null && !Number.isNaN(Number(course.discountedPrice))
    ? Number(course.discountedPrice)
    : course.discountPrice != null && !Number.isNaN(Number(course.discountPrice))
    ? Number(course.discountPrice)
    : undefined;
  const rawOrigPrice = course.originalPrice != null && !Number.isNaN(Number(course.originalPrice))
    ? Number(course.originalPrice)
    : course.strikeOutPrice != null && !Number.isNaN(Number(course.strikeOutPrice))
    ? Number(course.strikeOutPrice)
    : undefined;
  const rawBasePrice = course.basePrice != null && !Number.isNaN(Number(course.basePrice))
    ? Number(course.basePrice)
    : course.price != null && !Number.isNaN(Number(course.price))
    ? Number(course.price)
    : undefined;
  const price = rawDiscPrice ?? rawBasePrice ?? rawOrigPrice ?? 0;
  const targetProductId = String(course.productId || course.product_id || course.id);
  const itemInCart = isInCart(targetProductId) || isInCart(course.id);

  return (
    <MainLayout>
      <div className="bg-slate-50/50 min-h-screen pb-20 pt-6">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
          {/* ========================================================================= */}
          {/* HERO SECTION MATCHING SCREENSHOT media_1790686158969.png */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mb-16 pt-4">
            {/* LEFT COLUMN: Course Meta, Title & Call to Actions */}
            <div className="lg:col-span-7 space-y-6">
              {/* Breadcrumb / Category Navigation */}
              <div className="text-xs font-bold text-[#6366F1] flex items-center gap-1.5 uppercase tracking-wide">
                <Link to="/courses" className="hover:underline text-slate-500">
                  COURSES
                </Link>
                <span className="text-slate-400">/</span>
                <span className="text-indigo-600 font-extrabold line-clamp-1">{title}</span>
              </div>

              {/* Tagline Badge */}
              <div className="flex items-center gap-2 text-[11px] font-extrabold tracking-widest text-[#F97316] uppercase">
                <span className="h-2 w-2 rounded-full bg-[#F97316]" />
                <span>{categoryTag} · {totalLectures} LESSONS</span>
              </div>

              {/* Giant Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#1E1B4B] tracking-tight leading-[1.08]">
                {title}
              </h1>

              {/* Description */}
              <p className="text-slate-600 text-base sm:text-lg max-w-xl leading-relaxed">
                {description}
              </p>

              {/* Meta stats badges */}
              <div className="flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-500 pt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{totalLectures} lessons</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-slate-400" />
                  <span>Learn at your pace</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => handleAddToCart(course)}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-extrabold px-7 py-4 text-sm shadow-xl shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                >
                  <span>{itemInCart ? "Added to cart" : "Add course to cart"}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={scrollToCurriculum}
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-[#4F46E5] hover:text-indigo-800 px-4 py-3.5 transition-colors cursor-pointer"
                >
                  <span>Explore curriculum</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              {/* Subtext */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pt-1">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Lifetime access included</span>
              </div>
            </div>

            {/* RIGHT COLUMN: Thumbnail Display / Dynamic Card matching screenshot */}
            <div className="lg:col-span-5 relative">
              {/* Background Orbital Curves */}
              <div className="absolute -inset-10 -z-10 flex items-center justify-center opacity-40 pointer-events-none">
                <svg className="w-[140%] h-[140%]" viewBox="0 0 500 500" fill="none">
                  <circle cx="250" cy="250" r="200" stroke="#6366F1" strokeWidth="1" strokeDasharray="4 4" />
                  <circle cx="250" cy="250" r="150" stroke="#6366F1" strokeWidth="1" opacity="0.5" />
                </svg>
              </div>

              {/* Main Card */}
              <div className="relative w-full max-w-[480px] mx-auto aspect-video rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#4F46E5] via-[#6366F1] to-[#7C3AED] p-1 border-4 border-white">
                {thumbnailUrl ? (
                  <div className="relative w-full h-full rounded-[20px] overflow-hidden bg-slate-900 group">
                    <img
                      src={thumbnailUrl}
                      alt={title}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                ) : (
                  <div className="w-full h-full rounded-[20px] bg-gradient-to-br from-[#4F46E5] via-[#5850EC] to-[#7C3AED] p-8 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-white/80">
                      <span>EDVANZ / {totalLectures}</span>
                      <span className="text-[10px] text-white/60">Problem...</span>
                    </div>

                    <div className="my-auto space-y-2">
                      <span className="text-xs font-semibold text-white/80">A course in</span>
                      <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-tight drop-shadow-md">
                        {title}
                      </h2>
                    </div>

                    <div className="flex items-center justify-between text-xs font-semibold text-white/80 pt-4 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                        <span>Self-paced</span>
                      </div>
                      <span>Start here</span>
                    </div>
                  </div>
                )}

                {/* Yellow Floating Circle Badge (Top Right) */}
                <div className="absolute -top-3 -right-3 h-24 w-24 rounded-full bg-[#FEF08A] text-[#854D0E] font-extrabold text-[11px] p-2.5 flex items-center justify-center text-center shadow-xl border-2 border-white leading-tight z-20">
                  Build it one day at a time
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* STATS BAR (BELOW HERO) MATCHING SCREENSHOT media_1790686158969.png */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-indigo-100/80 bg-white p-6 sm:p-8 shadow-sm mb-16 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Stat 1 */}
            <div className="flex items-center justify-center gap-3 py-3 md:py-0 text-center">
              <span className="text-xl font-black text-slate-900">4.9</span>
              <div className="flex items-center text-amber-500">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-semibold text-slate-400">from 280+ learners</span>
            </div>

            {/* Stat 2 */}
            <div className="flex items-center justify-center gap-2 py-3 md:py-0 text-center">
              <span className="text-xl font-black text-slate-900">{totalLectures}</span>
              <span className="text-xs font-semibold text-slate-400">short, focused lessons</span>
            </div>

            {/* Stat 3 */}
            <div className="flex items-center justify-center gap-2 py-3 md:py-0 text-center">
              <span className="text-xl font-black text-slate-900">100%</span>
              <span className="text-xs font-semibold text-slate-400">learn at your pace</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* CURRICULUM ACCORDION SECTION */}
          {/* ========================================================================= */}
          <div ref={curriculumRef} id="curriculum" className="mb-20 scroll-mt-24">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 mb-2 block">
                  COURSE SYLLABUS
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  What you will learn
                </h2>
              </div>

              {curriculum.length > 0 ? (
                <div className="space-y-3">
                  {curriculum.map((mod, mi) => {
                    const isOpen = openModule === mi;
                    return (
                      <div key={mod.id} className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
                        <button
                          onClick={() => setOpenModule(isOpen ? null : mi)}
                          className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-slate-50/60 transition cursor-pointer"
                        >
                          <span className="text-sm font-bold text-slate-900">{mod.title}</span>
                          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                            <span>{mod.duration}</span>
                            {isOpen ? <ChevronUp className="h-4 w-4 text-indigo-600" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="divide-y divide-slate-100 bg-slate-50/30 border-t border-slate-100">
                            {mod.lessons.map((l) => (
                              <div key={l.id} className="flex items-center justify-between p-4 text-xs font-medium text-slate-600">
                                <div className="flex items-center gap-2.5">
                                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                                  <span>{l.title}</span>
                                </div>
                                <span>{l.duration}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                  Detailed curriculum structure available upon enrollment.
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* LIBRARY GRID SECTION MATCHING SCREENSHOT media_1790686158969.png */}
          {/* ========================================================================= */}
          {otherCourses.length > 0 && (
            <div className="pt-8 border-t border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-4">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 mb-2">
                    EXPLORE MORE
                  </div>
                  <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    More courses to move forward on
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherCourses.slice(0, 6).map((item, idx) => {
                  const gradientTheme = GRADIENT_THEMES[idx % GRADIENT_THEMES.length];
                  const itemTitle = item.title || "Course";
                  const itemCategory = getCategoryName(item, "PROGRAMMING").toUpperCase();
                  const itemInstructor =
                    (item.instructorName && item.instructorName.toLowerCase() !== "instructor" ? item.instructorName : undefined) ||
                    (typeof item.instructor === "object" ? item.instructor?.name : undefined) ||
                    instructorsService.extractInstructorFromMediaUrl(item.thumbnailUrl ?? item.thumbnail)?.name ||
                    "Edvanz Instructor";
                  const rawItemDisc = item.discountedPrice != null && !Number.isNaN(Number(item.discountedPrice))
                    ? Number(item.discountedPrice)
                    : item.discountPrice != null && !Number.isNaN(Number(item.discountPrice))
                    ? Number(item.discountPrice)
                    : undefined;
                  const rawItemOrig = item.originalPrice != null && !Number.isNaN(Number(item.originalPrice))
                    ? Number(item.originalPrice)
                    : item.strikeOutPrice != null && !Number.isNaN(Number(item.strikeOutPrice))
                    ? Number(item.strikeOutPrice)
                    : undefined;
                  const rawItemBase = item.basePrice != null && !Number.isNaN(Number(item.basePrice))
                    ? Number(item.basePrice)
                    : item.price != null && !Number.isNaN(Number(item.price))
                    ? Number(item.price)
                    : undefined;
                  const itemPrice = rawItemDisc ?? rawItemBase ?? rawItemOrig ?? 0;
                  const itemStrike = (rawItemOrig != null && rawItemOrig > itemPrice)
                    ? rawItemOrig
                    : (rawItemBase != null && rawItemBase > itemPrice)
                    ? rawItemBase
                    : undefined;
                  const itemThumbnail = extractThumbnailUrl(item);

                  return (
                    <div
                      key={item.id || idx}
                      className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div>
                        {/* Thumbnail Image Container */}
                        <div className="relative h-44 w-full overflow-hidden bg-slate-900 shadow-inner">
                          {itemThumbnail ? (
                            <img
                              src={itemThumbnail}
                              alt={itemTitle}
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                                const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallbackEl) fallbackEl.style.display = "flex";
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                          ) : null}
                          <div
                            style={{ display: itemThumbnail ? "none" : "flex" }}
                            className={`h-full w-full bg-gradient-to-br ${gradientTheme} p-6 text-white flex-col justify-between`}
                          >
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                              {itemCategory}
                            </span>
                            <div className="font-extrabold text-xl uppercase tracking-tight leading-tight line-clamp-2 drop-shadow-sm">
                              {itemTitle}
                            </div>
                          </div>
                        </div>

                        {/* Content Info */}
                        <div className="p-5">
                          <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 mb-1">
                            {itemCategory}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                            {itemTitle}
                          </h3>

                          <div className="text-xs text-slate-500 font-medium mb-3">
                            {itemInstructor}
                          </div>

                          {/* <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                            <span>{itemLessons} Lessons</span>
                          </div> */}

                          <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                            <div className="flex items-center gap-1 font-bold text-slate-700">
                              <Star className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600" />
                              <span>4.5</span>
                              <span className="text-slate-400 font-normal">(300)</span>
                            </div>

                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-extrabold text-slate-900">
                                {itemPrice === 0 ? "Free" : `₹${itemPrice.toLocaleString("en-IN")}`}
                              </span>
                              {itemStrike && (
                                <span className="text-xs font-semibold text-slate-400 line-through">
                                  ₹{itemStrike.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="p-5 pt-0 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => navigate(`/courses/${item.id}`)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-slate-500" />
                          View
                        </button>

                        <button
                          onClick={() => handleAddToCart(item)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                        >
                          <ShoppingCart className="h-3.5 w-3.5 text-slate-500" />
                          Add to cart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Video Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-3xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition"
            >
              <X className="h-5 w-5" />
            </button>
            {(() => {
              const rawUrl = previewVideoUrl || extractVideoUrl(course, curriculum);
              const { embedUrl, isDirectVideo } = formatEmbedVideoUrl(rawUrl);

              if (!embedUrl) {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center text-white p-6 text-center">
                    <Sparkles className="h-12 w-12 text-indigo-400 mb-3 animate-pulse" />
                    <h3 className="text-xl font-bold mb-1">{title}</h3>
                    <p className="text-xs text-slate-400 max-w-md">
                      Preview video is being prepared for this course. Click below to enroll or explore syllabus.
                    </p>
                  </div>
                );
              }

              if (isDirectVideo) {
                return (
                  <video
                    src={embedUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain bg-black"
                  />
                );
              }

              return (
                <iframe
                  src={embedUrl}
                  title="Preview Video"
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              );
            })()}
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default PublicCourseDetail;
