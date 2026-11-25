import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Star, ChevronDown, ChevronUp, Laptop, Sparkles, FolderOpen } from "lucide-react";
import { categoriesService } from "@/services/categories.service";
import { coursesService } from "@/services/courses.service";
import { liveCoursesService } from "@/services/liveCourses.service";
import { instructorsService } from "@/services/instructors.service";
import { extractThumbnailUrl } from "@/lib/utils";
import { getLearningSector, setLearningSector } from "@/lib/api-client";
import type { Category } from "@/types/api.types";
import { LearningSectorSwitcher } from "@/components/home/LearningSectorSwitcher";

export interface ExploreCategorySectionProps {
  selectedSector?: "IT" | "KIDS";
  onSectorChange?: (sector: "IT" | "KIDS") => void;
}

export const ExploreCategorySection = ({
  selectedSector,
  onSectorChange,
}: ExploreCategorySectionProps) => {
  const navigate = useNavigate();
  const [internalSector, setInternalSector] = useState<"IT" | "KIDS">(() => getLearningSector());
  const activeSector = selectedSector || internalSector;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [fetchedCourses, setFetchedCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states (5 at a time)
  const [visibleCategoriesCount, setVisibleCategoriesCount] = useState<number>(5);
  const [visibleCoursesCount, setVisibleCoursesCount] = useState<number>(5);

  const handleSectorChange = (sector: "IT" | "KIDS") => {
    if (onSectorChange) {
      onSectorChange(sector);
    } else {
      setInternalSector(sector);
      setLearningSector(sector);
      window.dispatchEvent(new CustomEvent("learningSectorChange", { detail: sector }));
    }
  };

  useEffect(() => {
    const onCustomEvent = (e: Event) => {
      const custom = e as CustomEvent<"IT" | "KIDS">;
      if (custom.detail && (custom.detail === "IT" || custom.detail === "KIDS")) {
        setInternalSector(custom.detail);
      }
    };
    window.addEventListener("learningSectorChange", onCustomEvent);
    return () => window.removeEventListener("learningSectorChange", onCustomEvent);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setVisibleCategoriesCount(5);
    setVisibleCoursesCount(5);

    async function loadData() {
      try {
        const [catRes, pubCoursesRes, liveCoursesRes] = await Promise.allSettled([
          categoriesService.getPublicCategories(activeSector),
          coursesService.getPublicCourses(0, 100, activeSector),
          liveCoursesService.getCatalogLiveCourses({ learningSector: activeSector }),
        ]);

        if (!isMounted) return;

        let catList: Category[] = [];
        if (catRes.status === "fulfilled" && catRes.value.success && Array.isArray(catRes.value.data)) {
          // Strict sector filter on categories
          catList = catRes.value.data.filter((cat) => {
            const itemSector = (cat.learningSector || (activeSector === "KIDS" ? "" : "IT")).toUpperCase();
            return activeSector === "KIDS" ? itemSector === "KIDS" : itemSector !== "KIDS";
          });
          setCategories(catList);
        } else {
          setCategories([]);
        }

        const allCourses: any[] = [];
        if (pubCoursesRes.status === "fulfilled" && pubCoursesRes.value.success && Array.isArray(pubCoursesRes.value.data)) {
          const recList = pubCoursesRes.value.data.filter((item) => {
            const itemSector = (item.learningSector || (activeSector === "KIDS" ? "" : "IT")).toUpperCase();
            return activeSector === "KIDS" ? itemSector === "KIDS" : itemSector !== "KIDS";
          });
          allCourses.push(...recList);
        }

        if (liveCoursesRes.status === "fulfilled" && liveCoursesRes.value) {
          const rawLive = liveCoursesRes.value;
          const liveList = (Array.isArray(rawLive)
            ? rawLive
            : Array.isArray(rawLive?.content)
            ? rawLive.content
            : Array.isArray(rawLive?.data)
            ? rawLive.data
            : []
          ).filter((item: any) => {
            const itemSector = (item.learningSector || (activeSector === "KIDS" ? "" : "IT")).toUpperCase();
            return activeSector === "KIDS" ? itemSector === "KIDS" : itemSector !== "KIDS";
          });

          liveList.forEach((liveItem: any) => {
            if (!allCourses.some((c) => String(c.id) === String(liveItem.id))) {
              allCourses.push({ ...liveItem, isLive: true });
            }
          });
        }

        setFetchedCourses(allCourses);

        if (catList.length > 0) {
          setSelectedCatId(String(catList[0].id));
        } else {
          setSelectedCatId("");
        }
      } catch (err) {
        console.error("Error fetching data for ExploreCategorySection:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeSector]);

  // Fast map of categoryId / slug -> Category object
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((cat) => {
      if (cat.id) map.set(String(cat.id), cat);
      if (cat.slug) map.set(String(cat.slug), cat);
    });
    return map;
  }, [categories]);

  // Determine if a course belongs to a specific category
  const isCourseInCategory = (course: any, cat: Category): boolean => {
    if (!cat || !course) return false;
    const selId = String(cat.id || "");
    const cCatId = course.categoryId ? String(course.categoryId) : "";
    const cSubCatId = course.subcategoryId ? String(course.subcategoryId) : "";

    // 1. Direct ID match on category or subcategory
    if (selId && (cCatId === selId || cSubCatId === selId)) {
      return true;
    }

    // 2. If cat has parentId, match if course specifies this cat as subcategory
    if (cat.parentId && cSubCatId === selId) {
      return true;
    }

    // 3. If cat is a parent of subcategories, any course whose categoryId or subcategoryId matches a child belongs here
    const childCats = categories.filter((ch) => ch.parentId && String(ch.parentId) === selId);
    if (childCats.some((ch) => cCatId === String(ch.id) || cSubCatId === String(ch.id))) {
      return true;
    }

    // 4. Exact normalized category name match (if course has explicit category name string)
    const selNameLower = (cat.name || "").toLowerCase().trim();
    const cCatName = (
      course.categoryName ||
      course.category?.name ||
      (typeof course.category === "string" ? course.category : "")
    )
      .toLowerCase()
      .trim();

    if (cCatName && cCatName === selNameLower) {
      return true;
    }

    return false;
  };

  // Precompute course counts dynamically from backend API data for the active sector
  const courseCountsByCatId = useMemo(() => {
    const counts = new Map<string, number>();
    categories.forEach((cat) => {
      counts.set(String(cat.id), 0);
    });

    fetchedCourses.forEach((course) => {
      categories.forEach((cat) => {
        if (isCourseInCategory(course, cat)) {
          counts.set(String(cat.id), (counts.get(String(cat.id)) || 0) + 1);
        }
      });
    });

    return counts;
  }, [categories, fetchedCourses]);

  const visibleCategories = categories.slice(0, visibleCategoriesCount);

  // Selected Category Object
  const selectedCatObj = useMemo(() => {
    const foundInCurrent = categories.find(
      (c) => String(c.id) === selectedCatId || c.name === selectedCatId
    );
    if (foundInCurrent) return foundInCurrent;

    if (categoryMap.has(selectedCatId)) {
      return categoryMap.get(selectedCatId)!;
    }

    return categories[0] || null;
  }, [categories, selectedCatId, categoryMap]);

  // Helper to resolve the true category name of any course for display
  const resolveCourseCategoryName = (course: any): string => {
    if (course.categoryName && typeof course.categoryName === "string" && course.categoryName.trim()) {
      return course.categoryName.trim();
    }
    if (course.category?.name && typeof course.category.name === "string" && course.category.name.trim()) {
      return course.category.name.trim();
    }

    const cSubCatId = course.subcategoryId ? String(course.subcategoryId) : "";
    if (cSubCatId && categoryMap.has(cSubCatId)) {
      return categoryMap.get(cSubCatId)!.name;
    }

    const cCatId = course.categoryId ? String(course.categoryId) : "";
    if (cCatId && categoryMap.has(cCatId)) {
      return categoryMap.get(cCatId)!.name;
    }

    if (typeof course.category === "string" && course.category.trim()) {
      return course.category.trim();
    }

    return selectedCatObj?.name || "General";
  };

  // Filter courses strictly for the selected category
  const filteredCourses = useMemo(() => {
    if (!selectedCatObj) return [];
    return fetchedCourses.filter((course) => isCourseInCategory(course, selectedCatObj));
  }, [fetchedCourses, selectedCatObj, categories]);

  // Paginated course items for table (5 at a time)
  const displayCourses = useMemo(() => {
    return filteredCourses.slice(0, visibleCoursesCount);
  }, [filteredCourses, visibleCoursesCount]);

  const handleCategorySelect = (catIdOrName: string) => {
    setSelectedCatId(catIdOrName);
    setVisibleCoursesCount(5); // Reset table pagination to 5 when switching category
  };

  return (
    <section className="py-12 sm:py-16 bg-white border-t border-slate-100">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
              FIND YOUR DIRECTION
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Explore courses <span className="text-blue-600">by category</span>
            </h2>
            <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl">
              Choose from a curated range of {activeSector === "KIDS" ? "Kidz" : "IT"} categories and courses designed for real skill development.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-end">
            <LearningSectorSwitcher
              selectedSector={activeSector}
              onSectorChange={handleSectorChange}
              variant="blue"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0">
            {/* Sector Tabs inside Sidebar */}
            <div className="bg-slate-100/90 p-1.5 rounded-xl flex gap-1 mb-4 border border-slate-200/60 shadow-xs">
              <button
                type="button"
                onClick={() => handleSectorChange("IT")}
                className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                  activeSector === "IT"
                    ? "bg-white text-blue-600 font-extrabold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-bold hover:bg-white/50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5" />
                  IT
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    activeSector === "IT" ? "bg-blue-50 text-blue-600" : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {activeSector === "IT" ? fetchedCourses.length : "IT"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSectorChange("KIDS")}
                className={`flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs transition-all cursor-pointer ${
                  activeSector === "KIDS"
                    ? "bg-white text-blue-600 font-extrabold shadow-sm"
                    : "text-slate-600 hover:text-slate-900 font-bold hover:bg-white/50"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Kidz
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    activeSector === "KIDS" ? "bg-blue-50 text-blue-600" : "bg-slate-200/70 text-slate-600"
                  }`}
                >
                  {activeSector === "KIDS" ? fetchedCourses.length : "Kidz"}
                </span>
              </button>
            </div>

            {/* Category List */}
            <div className="space-y-1">
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                ))
              ) : visibleCategories.length > 0 ? (
                visibleCategories.map((cat) => {
                  const catIdOrName = String(cat.id || cat.name);
                  const isSelected = selectedCatObj?.id === cat.id || selectedCatObj?.name === cat.name;
                  const catCourseCount = courseCountsByCatId.get(String(cat.id)) || 0;

                  return (
                    <button
                      key={catIdOrName}
                      onClick={() => handleCategorySelect(catIdOrName)}
                      className={`w-full text-left flex items-center justify-between px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/80 text-blue-600 font-bold border border-blue-100 shadow-xs"
                          : "text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-50"
                      }`}
                    >
                      <span className="line-clamp-1">{cat.name}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {catCourseCount}
                        </span>
                        {isSelected && <ArrowRight className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <FolderOpen className="mx-auto size-6 text-slate-300 mb-1" />
                  No categories found for {activeSector === "KIDS" ? "Kidz" : "IT"}.
                </div>
              )}
            </div>

            {/* Sidebar Categories See More / See Less Button */}
            {categories.length > 5 && (
              <div className="mt-3 pt-2 border-t border-slate-100">
                {visibleCategoriesCount < categories.length ? (
                  <button
                    onClick={() => setVisibleCategoriesCount((prev) => prev + 5)}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center justify-between rounded-lg hover:bg-blue-50/50"
                  >
                    <span>See More</span>
                    <ChevronDown className="h-3.5 w-3.5 text-blue-600" />
                  </button>
                ) : (
                  <button
                    onClick={() => setVisibleCategoriesCount(5)}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer flex items-center justify-between rounded-lg hover:bg-slate-50"
                  >
                    <span>See Less</span>
                    <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column Table & Buttons */}
          <div className="flex-1 min-w-0 w-full">
            <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs mb-5">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200/60 text-[11px] uppercase tracking-wider font-extrabold text-slate-500">
                      <th className="px-6 py-4">COURSE</th>
                      <th className="px-4 py-4">CATEGORY</th>
                      <th className="px-4 py-4">INSTRUCTOR</th>
                      <th className="px-4 py-4">MODE</th>
                      <th className="px-4 py-4">DURATION</th>
                      <th className="px-4 py-4">RATING</th>
                      <th className="px-4 py-4">PRICE</th>
                      <th className="px-6 py-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      [1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-slate-200 rounded-xl" />
                              <div className="h-4 w-36 bg-slate-200 rounded" />
                            </div>
                          </td>
                          <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-20 bg-slate-200 rounded" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                          <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-200 rounded" /></td>
                          <td className="px-6 py-4 text-right"><div className="h-4 w-20 bg-slate-200 rounded ml-auto" /></td>
                        </tr>
                      ))
                    ) : displayCourses.length > 0 ? (
                      displayCourses.map((course: any, idx: number) => {
                        const title = course.title || "Course Title";
                        const displayCategoryName = resolveCourseCategoryName(course);
                        const instructorName =
                          course.instructorName ||
                          course.instructor?.name ||
                          instructorsService.extractInstructorFromMediaUrl(course.thumbnailUrl || course.promoVideoUrl)?.name ||
                          "Edvanz Expert";
                        const isLive = Boolean(
                          course.isLive ||
                          course.schedule ||
                          String(course.courseType || "").toUpperCase().includes("LIVE")
                        );
                        const durationText = course.totalLessons
                          ? `${course.totalLessons} Lessons`
                          : course.totalDurationMinutes
                          ? `${Math.round(course.totalDurationMinutes / 60)} Hours`
                          : "24 Hours";
                        const rating = course.avgRating ? Number(course.avgRating).toFixed(1) : "4.8";
                        const isFree = course.accessType === "FREE" || course.isFree === true;
                        const rawDisc = course.discountedPrice != null && !Number.isNaN(Number(course.discountedPrice))
                          ? Number(course.discountedPrice)
                          : course.discountPrice != null && !Number.isNaN(Number(course.discountPrice))
                          ? Number(course.discountPrice)
                          : undefined;
                        const rawOrig = course.originalPrice != null && !Number.isNaN(Number(course.originalPrice))
                          ? Number(course.originalPrice)
                          : course.strikeOutPrice != null && !Number.isNaN(Number(course.strikeOutPrice))
                          ? Number(course.strikeOutPrice)
                          : undefined;
                        const rawBase = course.basePrice != null && !Number.isNaN(Number(course.basePrice))
                          ? Number(course.basePrice)
                          : course.price != null && !Number.isNaN(Number(course.price))
                          ? Number(course.price)
                          : undefined;

                        const payablePrice = isFree ? 0 : (rawDisc ?? rawBase ?? rawOrig ?? 0);
                        const strikePrice = !isFree && ((rawOrig != null && rawOrig > payablePrice)
                          ? rawOrig
                          : (rawBase != null && rawBase > payablePrice)
                          ? rawBase
                          : undefined);

                        const priceFormatted = payablePrice === 0 ? "Free" : `₹${payablePrice.toLocaleString("en-IN")}`;
                        const strikeFormatted = strikePrice != null ? `₹${strikePrice.toLocaleString("en-IN")}` : null;
                        const thumbnailUrl = extractThumbnailUrl(course);

                        return (
                          <tr key={course.id || idx} className="hover:bg-slate-50/50 transition-colors">
                            {/* Course Thumbnail + Title */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl bg-slate-900 shadow-inner">
                                  {thumbnailUrl ? (
                                    <img
                                      src={thumbnailUrl}
                                      alt={title}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = "none";
                                        const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (fallbackEl) fallbackEl.style.display = "flex";
                                      }}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                  <div
                                    style={{ display: thumbnailUrl ? "none" : "flex" }}
                                    className="h-full w-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 items-center justify-center text-[10px] font-extrabold text-white uppercase"
                                  >
                                    {displayCategoryName.slice(0, 2).toUpperCase()}
                                  </div>
                                </div>
                                <span className="text-sm font-bold text-slate-900 line-clamp-1">
                                  {title}
                                </span>
                              </div>
                            </td>

                            {/* Category Badge */}
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                {displayCategoryName}
                              </span>
                            </td>

                            {/* Instructor Name */}
                            <td className="px-4 py-4 text-xs font-semibold text-slate-600">
                              {instructorName}
                            </td>

                            {/* Mode: Live or Recorded */}
                            <td className="px-4 py-4">
                              {isLive ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Live
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold text-blue-800">
                                  Recorded
                                </span>
                              )}
                            </td>

                            {/* Duration */}
                            <td className="px-4 py-4 text-xs font-medium text-slate-500">
                              {durationText}
                            </td>

                            {/* Rating */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span>{rating}</span>
                              </div>
                            </td>

                            {/* Price */}
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-extrabold text-slate-900">{priceFormatted}</span>
                                {strikeFormatted && (
                                  <span className="text-[10px] text-slate-400 line-through">
                                    {strikeFormatted}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Action Button */}
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  navigate(`/courses/${course.id}`, {
                                    state: { isLive: Boolean(course.isLive) },
                                  })
                                }
                                className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                              >
                                <span>View Course</span>
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <p className="text-sm font-bold text-slate-700">
                            No courses available in this category for {activeSector === "KIDS" ? "Kidz" : "IT"}.
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Select another category from the sidebar or browse other learning programs.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table Bottom Pagination: See More / See Less Courses */}
            {filteredCourses.length > 5 && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Showing {displayCourses.length} of {filteredCourses.length} courses
                </span>
                <div className="flex items-center gap-3">
                  {visibleCoursesCount < filteredCourses.length ? (
                    <button
                      onClick={() => setVisibleCoursesCount((prev) => prev + 5)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-blue-600 bg-blue-50/80 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <span>See More Courses</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setVisibleCoursesCount(5)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      <span>See Less</span>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExploreCategorySection;
