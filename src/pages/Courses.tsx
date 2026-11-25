import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Eye, ShoppingCart, Star, BookOpen } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { coursesService } from "@/services/courses.service";
import { liveCoursesService } from "@/services/liveCourses.service";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { extractThumbnailUrl, getAuthRedirectPath } from "@/lib/utils";
import { getLearningSector, setLearningSector } from "@/lib/api-client";
import { LearningSectorSwitcher } from "@/components/home/LearningSectorSwitcher";

export interface LibraryCourseItem {
  id: string;
  productId?: string;
  title: string;
  description: string;
  categoryName: string;
  instructorName: string;
  totalLessons: number;
  rating: number;
  reviewsCount: number;
  price: number;
  strikeOutPrice?: number;
  courseType: "LIVE" | "RECORDED";
  thumbnailUrl?: string | null;
}

const GRADIENT_THEMES = [
  "from-indigo-600 via-purple-600 to-blue-600",
  "from-pink-500 via-rose-500 to-yellow-500",
  "from-purple-600 via-indigo-600 to-pink-500",
  "from-blue-600 via-cyan-600 to-teal-500",
  "from-emerald-500 via-teal-600 to-cyan-600",
  "from-[#4323A0] via-[#2A34A4] to-[#1E2E8D]",
];

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

export const Courses = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [activeSector, setActiveSector] = useState<"IT" | "KIDS">(() => getLearningSector());
  const [searchQuery, setSearchQuery] = useState("");

  const handleSectorChange = (sector: "IT" | "KIDS") => {
    setActiveSector(sector);
    setLearningSector(sector);
    window.dispatchEvent(new CustomEvent("learningSectorChange", { detail: sector }));
  };

  useEffect(() => {
    const onCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<"IT" | "KIDS">;
      if (custom.detail && (custom.detail === "IT" || custom.detail === "KIDS")) {
        setActiveSector(custom.detail);
      }
    };
    window.addEventListener("learningSectorChange", onCustomEvent);
    return () => window.removeEventListener("learningSectorChange", onCustomEvent);
  }, []);
  const [courses, setCourses] = useState<LibraryCourseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadAllCourses() {
      setIsLoading(true);
      try {
        const [liveRes, recRes] = await Promise.allSettled([
          liveCoursesService.getCatalogLiveCourses({ learningSector: activeSector }),
          coursesService.getPublicCourses(0, 50, activeSector),
        ]);

        const mappedLive: LibraryCourseItem[] = [];
        if (liveRes.status === "fulfilled" && liveRes.value) {
          const rawLive = Array.isArray(liveRes.value)
            ? liveRes.value
            : Array.isArray(liveRes.value?.content)
            ? liveRes.value.content
            : Array.isArray(liveRes.value?.data)
            ? liveRes.value.data
            : [];

          rawLive.forEach((item: any, idx: number) => {
            const itemSector = (item.learningSector || (activeSector === "KIDS" ? "KIDS" : "IT")).toUpperCase();
            if (activeSector === "KIDS" ? itemSector !== "KIDS" : itemSector === "KIDS") return;
            const pId = String(item.productId || item.product_id || item.id || `live-${idx}`);
            const rawDisc = item.discountedPrice != null && !Number.isNaN(Number(item.discountedPrice))
              ? Number(item.discountedPrice)
              : item.discountPrice != null && !Number.isNaN(Number(item.discountPrice))
              ? Number(item.discountPrice)
              : undefined;
            const rawOrig = item.originalPrice != null && !Number.isNaN(Number(item.originalPrice))
              ? Number(item.originalPrice)
              : item.strikeOutPrice != null && !Number.isNaN(Number(item.strikeOutPrice))
              ? Number(item.strikeOutPrice)
              : undefined;
            const rawBase = item.basePrice != null && !Number.isNaN(Number(item.basePrice))
              ? Number(item.basePrice)
              : item.price != null && !Number.isNaN(Number(item.price))
              ? Number(item.price)
              : undefined;

            const isFree = item.accessType === "FREE" || item.isFree === true;
            const livePrice = isFree ? 0 : (rawDisc ?? rawBase ?? rawOrig ?? 0);
            const liveStrikeOut = !isFree && ((rawOrig != null && rawOrig > livePrice)
              ? rawOrig
              : (rawBase != null && rawBase > livePrice)
              ? rawBase
              : undefined);

            mappedLive.push({
              id: String(item.id || item.liveCourseId || `live-${idx}`),
              productId: pId,
              title: item.title || item.courseTitle || "Live Course",
              description: item.description || "Interactive Live Training Session",
              categoryName: getCategoryName(item, "LIVE TRAINING").toUpperCase(),
              instructorName: item.instructorName || item.instructor?.name || "Edvanz Instructor",
              totalLessons: item.totalSessions || item.totalLessons || 12,
              rating: item.avgRating || item.rating || 4.8,
              reviewsCount: item.totalReviews || 300,
              price: livePrice,
              strikeOutPrice: liveStrikeOut,
              courseType: "LIVE",
              thumbnailUrl: extractThumbnailUrl(item),
            });
          });
        }

        const mappedRecorded: LibraryCourseItem[] = [];
        const rawRec = recRes.status === "fulfilled" && recRes.value
          ? (Array.isArray(recRes.value?.data)
              ? recRes.value.data
              : Array.isArray(recRes.value)
              ? recRes.value
              : Array.isArray(recRes.value?.content)
              ? recRes.value.content
              : [])
          : [];
        if (rawRec.length > 0) {
          rawRec.forEach((item: any, idx: number) => {
            const itemSector = (item.learningSector || (activeSector === "KIDS" ? "KIDS" : "IT")).toUpperCase();
            if (activeSector === "KIDS" ? itemSector !== "KIDS" : itemSector === "KIDS") return;
            const pId = String(item.productId || item.product_id || item.id || `recorded-${idx}`);
            const rawDisc = item.discountedPrice != null && !Number.isNaN(Number(item.discountedPrice))
              ? Number(item.discountedPrice)
              : item.discountPrice != null && !Number.isNaN(Number(item.discountPrice))
              ? Number(item.discountPrice)
              : undefined;
            const rawOrig = item.originalPrice != null && !Number.isNaN(Number(item.originalPrice))
              ? Number(item.originalPrice)
              : item.strikeOutPrice != null && !Number.isNaN(Number(item.strikeOutPrice))
              ? Number(item.strikeOutPrice)
              : undefined;
            const rawBase = item.basePrice != null && !Number.isNaN(Number(item.basePrice))
              ? Number(item.basePrice)
              : item.price != null && !Number.isNaN(Number(item.price))
              ? Number(item.price)
              : undefined;

            const recPrice = rawDisc ?? rawBase ?? rawOrig ?? 0;
            const recStrikeOut = (rawOrig != null && rawOrig > recPrice)
              ? rawOrig
              : (rawBase != null && rawBase > recPrice)
              ? rawBase
              : undefined;

            mappedRecorded.push({
              id: String(item.id || `recorded-${idx}`),
              productId: pId,
              title: item.title || "Recorded Course",
              description: item.description || "Self-Paced Recorded Online Course",
              categoryName: getCategoryName(item, "WEB DEVELOPMENT").toUpperCase(),
              instructorName: item.instructorName || item.instructor?.name || "Edvanz Instructor",
              totalLessons: item.totalLessons || item.totalModules || 12,
              rating: item.avgRating || item.rating || 4.5,
              reviewsCount: item.totalReviews || 300,
              price: recPrice,
              strikeOutPrice: recStrikeOut,
              courseType: "RECORDED",
              thumbnailUrl: extractThumbnailUrl(item),
            });
          });
        }

        // Combine both Live & Recorded courses
        const combined = [...mappedLive, ...mappedRecorded];

        if (isMounted) {
          setCourses(combined);
        }
      } catch (err) {
        console.error("Error loading library courses:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAllCourses();
    return () => {
      isMounted = false;
    };
  }, [activeSector]);

  // Real-time search filter across BOTH Public Live Courses AND Public Recorded Courses
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const query = searchQuery.toLowerCase().trim();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.instructorName.toLowerCase().includes(query) ||
        c.categoryName.toLowerCase().includes(query)
    );
  }, [courses, searchQuery]);

  const handleAddToCart = (course: LibraryCourseItem) => {
    const targetProductId = String(course.productId || course.id);
    const cartPayload = {
      id: targetProductId,
      productId: targetProductId,
      courseId: course.id,
      title: course.title,
      price: course.price,
      discountedPrice: course.price,
      originalPrice: course.strikeOutPrice || course.price,
      thumbnail: course.thumbnailUrl || "",
      instructor: course.instructorName,
      category: course.categoryName,
      isLive: course.courseType === "LIVE",
      productType: (course.courseType === "LIVE" ? "LIVE_COURSE" : "COURSE") as "LIVE_COURSE" | "COURSE",
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
  };

  return (
    <MainLayout>
      <div className="bg-slate-50/60 min-h-screen pb-20 pt-6">
        <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* TOP BAR: SECTOR SWITCHER + SEARCH */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pt-4">
            <LearningSectorSwitcher
              selectedSector={activeSector}
              onSectorChange={handleSectorChange}
              variant="indigo"
            />
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* LIBRARY HEADER */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 mb-2">
                THE EDVANZ LIBRARY
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Choose what you want to <br />
                <span className="text-indigo-600">move forward on.</span>
              </h1>
            </div>
            <p className="text-slate-500 text-sm sm:text-base max-w-sm leading-relaxed">
              Short, practical courses for the parts of life that do not come with a manual.
            </p>
          </div>

          {/* COURSE GRID */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 rounded-2xl bg-slate-200" />
              ))}
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredCourses.map((course, idx) => {
                const gradientTheme = GRADIENT_THEMES[idx % GRADIENT_THEMES.length];
                const priceDisplay = course.price === 0 ? "Free" : `₹${course.price.toLocaleString("en-IN")}`;
                const strikeDisplay = course.strikeOutPrice != null ? `₹${course.strikeOutPrice.toLocaleString("en-IN")}` : null;

                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div>
                      {/* Thumbnail Image Container */}
                      <div className="relative h-44 w-full overflow-hidden bg-slate-900 shadow-inner">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallbackEl) fallbackEl.style.display = "flex";
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : null}
                        <div
                          style={{ display: course.thumbnailUrl ? "none" : "flex" }}
                          className={`h-full w-full bg-gradient-to-br ${gradientTheme} p-6 text-white flex-col justify-between`}
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                            {course.courseType === "LIVE" ? "LIVE TRAINING" : "RECORDED COURSE"}
                          </span>
                          <div className="font-extrabold text-xl uppercase tracking-tight leading-tight line-clamp-2 drop-shadow-sm">
                            {course.title}
                          </div>
                        </div>
                      </div>

                      {/* Content Info */}
                      <div className="p-5">
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 mb-1">
                          {course.categoryName}
                        </div>

                        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                          {course.title}
                        </h3>

                        <div className="text-xs text-slate-500 font-medium mb-3">
                          {course.instructorName}
                        </div>

                        {/* <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                          <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                          <span>{course.totalLessons} Lessons</span>
                        </div> */}

                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                          <div className="flex items-center gap-1 font-bold text-slate-700">
                            <Star className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600" />
                            <span>{course.rating.toFixed(1)}</span>
                            <span className="text-slate-400 font-normal">({course.reviewsCount})</span>
                          </div>

                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-extrabold text-slate-900">
                              {priceDisplay}
                            </span>
                            {strikeDisplay && (
                              <span className="text-xs font-semibold text-slate-400 line-through">
                                {strikeDisplay}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons: View & Add to cart matching screenshot */}
                    <div className="p-5 pt-0 grid grid-cols-2 gap-3">

                <button
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        View
                      </button>


                <button
                        onClick={() => handleAddToCart(course)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 text-slate-500" />
                        Add to cart
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <p className="text-slate-500 text-base font-medium mb-4">
                {searchQuery.trim()
                  ? `No courses found matching "${searchQuery}".`
                  : `No ${activeSector === "KIDS" ? "Kidz" : "IT"} courses available right now.`}
              </p>
              {searchQuery.trim() && (
                <button
                onClick={() => setSearchQuery("")}
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
              >
                Clear Search
              </button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Courses;
