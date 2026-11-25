import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowUpRight, Star, BookOpen } from "lucide-react";
import { coursesService } from "@/services/courses.service";
import { extractThumbnailUrl } from "@/lib/utils";
import { getLearningSector, setLearningSector } from "@/lib/api-client";
import { LearningSectorSwitcher } from "@/components/home/LearningSectorSwitcher";

function getInitials(name?: string): string {
  if (!name) return "ED";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export interface RecordedCoursesSectionProps {
  selectedSector?: "IT" | "KIDS";
  onSectorChange?: (sector: "IT" | "KIDS") => void;
}

export const RecordedCoursesSection = ({
  selectedSector,
  onSectorChange,
}: RecordedCoursesSectionProps) => {
  const navigate = useNavigate();
  const [internalSector, setInternalSector] = useState<"IT" | "KIDS">(() => getLearningSector());
  const activeSector = selectedSector || internalSector;

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startIndex, setStartIndex] = useState(0);

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
    setStartIndex(0);
    setLoading(true);

    async function loadRecordedCourses() {
      try {
        const res = await coursesService.getPublicCourses(0, 100, activeSector);
        if (!isMounted) return;
        if (res.success && Array.isArray(res.data)) {
          // Strict sector filtering: IT platform sees ONLY IT; KIDS sees ONLY KIDS
          const sectorCourses = res.data.filter((c: any) => {
            const itemSector = (c.learningSector || (activeSector === "KIDS" ? "" : "IT")).toUpperCase();
            return activeSector === "KIDS" ? itemSector === "KIDS" : itemSector !== "KIDS";
          });
          setCourses(sectorCourses);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error("Error loading public recorded courses:", err);
        if (isMounted) setCourses([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadRecordedCourses();
    return () => {
      isMounted = false;
    };
  }, [activeSector]);

  const visibleCount = 4;
  const maxIndex = Math.max(0, courses.length - visibleCount);

  const handlePrev = () => {
    setStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setStartIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const visibleCourses = courses.length > 0 ? courses.slice(startIndex, startIndex + visibleCount) : [];

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-10 gap-4">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-blue-600 mb-2">
              ON YOUR TIME
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Learn online at <span className="text-blue-600">your own pace</span>
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-md mt-2">
              Access expert-led recorded courses anytime, anywhere in {activeSector === "KIDS" ? "Kidz" : "IT"} and learn at your speed.
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

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center shadow-xs">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-inner">
              <BookOpen className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              No Recorded Courses Available for {activeSector === "KIDS" ? "Kidz" : "IT"} Right Now
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
              We are constantly adding new curriculum and self-paced programs. Try selecting the other learning sector or check back soon!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {visibleCourses.map((course: any, idx: number) => {
                const title = course.title || "Recorded Course";
                const categoryTag = (course.categoryName || course.language || "COURSE").toUpperCase();
                const instructorName = course.instructorName || course.instructor?.name || "Edvanz Instructor";
                const level = course.level || "Beginner";
                const totalLessons = course.totalLessons || 12;
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

                const payablePrice = rawDisc ?? rawBase ?? rawOrig ?? 0;
                const strikePrice = (rawOrig != null && rawOrig > payablePrice)
                  ? rawOrig
                  : (rawBase != null && rawBase > payablePrice)
                  ? rawBase
                  : undefined;

                const priceFormatted = payablePrice === 0 ? "Free" : `₹${payablePrice.toLocaleString("en-IN")}`;
                const strikeFormatted = strikePrice != null ? `₹${strikePrice.toLocaleString("en-IN")}` : null;
                const thumbnailUrl = extractThumbnailUrl(course);

                return (
                  <div
                    key={course.id || idx}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div>
                      {/* Course Card Thumbnail */}
                      <div className="relative h-36 w-full overflow-hidden rounded-xl bg-slate-900 shadow-inner mb-4">
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={title}
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                              const fallbackEl = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallbackEl) fallbackEl.style.display = "flex";
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : null}
                        <div
                          style={{ display: thumbnailUrl ? "none" : "flex" }}
                          className="h-full w-full bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 p-4 text-white flex-col justify-between"
                        >
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">
                            {categoryTag}
                          </span>
                          <div className="font-extrabold text-lg uppercase tracking-tight drop-shadow-sm line-clamp-1">
                            {categoryTag}
                          </div>
                        </div>
                      </div>

                      {/* Header Badges: RECORDED + Rating */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-800">
                          RECORDED
                        </span>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>4.8</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors">
                        {title}
                      </h3>

                      {/* Instructor */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                          {getInitials(instructorName)}
                        </div>
                        <span className="text-xs font-medium text-slate-600">{instructorName}</span>
                      </div>

                      {/* Meta Stats */}
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-2 py-2 border-t border-slate-100 mb-3">
                        <span>1,820 Students</span>
                        <span>|</span>
                        <span>{totalLessons} Lessons</span>
                        <span>|</span>
                        <span>{level}</span>
                      </div>
                    </div>

                    {/* Footer: Price & View Course */}
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-slate-900">{priceFormatted}</span>
                        {strikeFormatted && (
                          <span className="text-xs font-semibold text-slate-400 line-through">
                            {strikeFormatted}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        View Course
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navigation Slider Buttons */}
            {courses.length > visibleCount && (
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  onClick={handlePrev}
                  disabled={startIndex === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={startIndex >= maxIndex}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default RecordedCoursesSection;
