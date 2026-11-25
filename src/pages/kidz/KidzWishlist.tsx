import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  Heart,
  Lightbulb,
  Loader2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist, type WishlistItem } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { enrollmentService } from "@/services/enrollment.service";
import { coursesService as kidzCoursesService } from "@/services/kidz/courses.service";
import { enrollmentService as kidzEnrollmentService } from "@/services/kidz/enrollment.service";

import wishlistPandaImg from "@/assets/kidz/wishlist.png";
import codingBracketsImg from "@/assets/kidz/coding-brackets-3d.jpg";
import algebraShapesImg from "@/assets/kidz/algebra-shapes-3d.jpg";
import storyWorkspaceImg from "@/assets/kidz/story-workspace-3d.jpg";

const fallbackImages = [codingBracketsImg, algebraShapesImg, storyWorkspaceImg];

type CourseActionStatus = "purchased" | "in_cart" | "not_in_cart";

function getResolvedProductId(item: WishlistItem, meta?: any): string {
  return String(
    meta?.productId ||
      meta?.product_id ||
      (item as any).productId ||
      (item as any).product_id ||
      item.courseId,
  );
}

function isLiveWishlistCourse(item: WishlistItem, meta?: any): boolean {
  return Boolean(
    meta?.isLive ||
      meta?.productType === "LIVE_COURSE" ||
      String(meta?.courseType || meta?.type || "")
        .toUpperCase()
        .includes("LIVE") ||
      meta?.schedule != null ||
      (item as any).isLive ||
      (item as any).productType === "LIVE_COURSE",
  );
}

function isFreeWishlistCourse(item: WishlistItem, meta?: any): boolean {
  if (meta?.isFree === true || (item as any).isFree === true) return true;
  if (String(meta?.pricingType || meta?.accessType || "").toUpperCase() === "FREE") {
    return true;
  }
  const disc = meta?.discountedPrice ?? item.discountedPrice;
  const price = meta?.price ?? item.price;
  return (disc === 0 || disc === "0") || ((price === 0 || price === "0") && disc == null);
}

function extractAccessIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string" || typeof entry === "number") {
        return String(entry);
      }
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        return String(obj.courseId || obj.productId || obj.id || "");
      }
      return "";
    })
    .filter(Boolean);
}

export function KidzWishlist() {
  useDocumentMeta(
    "My Wishlist - EDVANZ Kidz",
    "Save your favourite kidz courses and come back to them anytime!",
  );

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { items, loading, removeFromWishlist, refreshWishlist } = useWishlist();
  const { addToCart, isInCart, refresh: refreshCart } = useCart();
  const { isEnrolled: isLocalEnrolled } = useAppState();

  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [statusLoading, setStatusLoading] = useState<boolean>(true);
  const [courseMetaMap, setCourseMetaMap] = useState<Record<string, any>>({});
  const fetchedCourseIdsRef = useRef<Set<string>>(new Set());

  const refreshPurchasedStatus = useCallback(async () => {
    const hasToken =
      typeof window !== "undefined" && Boolean(localStorage.getItem("accessToken"));
    if (!hasToken && !isAuthenticated) {
      setEnrolledIds(new Set());
      return;
    }

    try {
      const [enrolledSetResult, accessProductsResult] = await Promise.allSettled([
        enrollmentService.getEnrolledCourseIds(),
        kidzEnrollmentService.getAccessProducts(),
      ]);

      const merged = new Set<string>();
      if (enrolledSetResult.status === "fulfilled") {
        enrolledSetResult.value.forEach((id) => {
          if (id) merged.add(String(id));
        });
      }
      if (accessProductsResult.status === "fulfilled") {
        extractAccessIds(accessProductsResult.value).forEach((id) => {
          merged.add(String(id));
        });
      }
      setEnrolledIds(merged);
    } catch {
      /* ignore */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;
    setStatusLoading(true);
    void Promise.allSettled([
      refreshWishlist(),
      refreshCart(),
      refreshPurchasedStatus(),
    ]).finally(() => {
      if (active) setStatusLoading(false);
    });
    return () => {
      active = false;
    };
  }, [refreshWishlist, refreshCart, refreshPurchasedStatus]);

  const resolveCourseMeta = useCallback(async (courseId: string): Promise<any | null> => {
    try {
      const course = await kidzCoursesService.getCourseById(courseId);
      if (course && (course.id || course.title)) {
        setCourseMetaMap((prev) => ({ ...prev, [courseId]: course }));
        return course;
      }
    } catch {
      /* fallback to live catalog */
    }

    try {
      const liveList = await kidzCoursesService.getLiveCourses({ learningSector: "KIDS" });
      const liveMatch = liveList.find((c) => String(c.id) === String(courseId));
      if (liveMatch) {
        const enriched = { ...liveMatch, isLive: true, productType: "LIVE_COURSE" };
        setCourseMetaMap((prev) => ({ ...prev, [courseId]: enriched }));
        return enriched;
      }
    } catch {
      /* ignore */
    }

    return null;
  }, []);

  useEffect(() => {
    const missingIds = items
      .map((item) => String(item.courseId))
      .filter((id) => id && !fetchedCourseIdsRef.current.has(id));

    if (missingIds.length === 0) return;
    missingIds.forEach((id) => fetchedCourseIdsRef.current.add(id));

    let isMounted = true;

    async function loadMissingCourseMetadata() {
      const unresolvedIds: string[] = [];
      const resolvedEntries: Record<string, any> = {};

      await Promise.all(
        missingIds.map(async (id) => {
          try {
            const course = await kidzCoursesService.getCourseById(id);
            if (course && (course.id || course.title)) {
              resolvedEntries[id] = course;
              return;
            }
          } catch {
            /* try live courses */
          }
          unresolvedIds.push(id);
        }),
      );

      if (unresolvedIds.length > 0) {
        try {
          const liveList = await kidzCoursesService.getLiveCourses({
            learningSector: "KIDS",
          });
          unresolvedIds.forEach((id) => {
            const match = liveList.find((c) => String(c.id) === id);
            if (match) {
              resolvedEntries[id] = {
                ...match,
                isLive: true,
                productType: "LIVE_COURSE",
              };
            }
          });
        } catch {
          /* ignore */
        }
      }

      if (isMounted && Object.keys(resolvedEntries).length > 0) {
        setCourseMetaMap((prev) => ({ ...prev, ...resolvedEntries }));
      }
    }

    void loadMissingCourseMetadata();

    return () => {
      isMounted = false;
    };
  }, [items]);

  const getCourseStatus = (item: WishlistItem): CourseActionStatus => {
    const courseId = String(item.courseId);
    const meta = courseMetaMap[courseId];
    const targetProductId = getResolvedProductId(item, meta);
    const metaId = meta?.id ? String(meta.id) : "";

    const isPurchased = Boolean(
      isLocalEnrolled(courseId) ||
        enrolledIds.has(courseId) ||
        enrolledIds.has(targetProductId) ||
        (metaId && enrolledIds.has(metaId)),
    );

    if (isPurchased) return "purchased";

    const inCart = Boolean(
      isInCart(courseId) ||
        isInCart(targetProductId) ||
        (metaId && isInCart(metaId)),
    );

    if (inCart) return "in_cart";

    return "not_in_cart";
  };

  const handleRemove = async (courseId: string, title?: string) => {
    setRemovingId(courseId);
    try {
      await removeFromWishlist(courseId);
      toast.success(
        title ? `"${title}" removed from wishlist` : "Removed from wishlist",
      );
    } catch {
      toast.error("Could not remove course from wishlist");
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    const courseId = String(item.courseId);
    if (addingId === courseId) return;

    setAddingId(courseId);
    try {
      let meta = courseMetaMap[courseId];
      if (!meta) {
        meta = await resolveCourseMeta(courseId);
      }

      if (meta?.isPublished === false) {
        toast.error(
          "This course is currently unavailable for purchase (not published yet).",
        );
        return;
      }

      const targetProductId = getResolvedProductId(item, meta);
      const metaId = meta?.id ? String(meta.id) : "";

      if (
        isLocalEnrolled(courseId) ||
        enrolledIds.has(courseId) ||
        enrolledIds.has(targetProductId) ||
        (metaId && enrolledIds.has(metaId))
      ) {
        toast.info("You already own this course! Click Start Learning to continue.");
        return;
      }

      if (
        isInCart(courseId) ||
        isInCart(targetProductId) ||
        (metaId && isInCart(metaId))
      ) {
        toast.info("Course is already in your cart!");
        return;
      }

      const isLiveCourse = isLiveWishlistCourse(item, meta);
      const rawOrig = Number(
        meta?.originalPrice ?? meta?.basePrice ?? item.price ?? 0,
      );
      const rawDisc = Number(
        meta?.discountedPrice ??
          meta?.discountPrice ??
          item.discountedPrice ??
          item.price ??
          0,
      );
      const effectiveOrig = rawOrig > 0 ? rawOrig : rawDisc;
      const effectiveDisc = rawDisc > 0 ? rawDisc : effectiveOrig;

      await addToCart({
        id: targetProductId,
        productId: targetProductId,
        courseId,
        title: item.title || meta?.title || "Course",
        thumbnail:
          item.thumbnail || meta?.thumbnailUrl || meta?.thumbnail || "",
        instructor: item.instructor || meta?.instructorName || "Instructor",
        price: effectiveOrig,
        originalPrice: effectiveOrig > effectiveDisc ? effectiveOrig : undefined,
        discountedPrice: effectiveDisc,
        isLive: isLiveCourse,
        productType: isLiveCourse ? "LIVE_COURSE" : "COURSE",
        totalLessons: item.lessons ?? meta?.totalLessons,
      });

      // Keep the course in the Wishlist and ensure cart state stays synced.
      await refreshCart();
    } catch (err: any) {
      const errCode = err?.response?.data?.code;
      const errMsg = String(
        err?.response?.data?.message || err?.message || "",
      ).toLowerCase();

      if (errCode === "CRT_004" || errMsg.includes("already in your cart")) {
        await refreshCart();
      } else if (errMsg.includes("already have access")) {
        await refreshPurchasedStatus();
      } else if (!err?.response) {
        toast.error("Could not add course to cart");
      }
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 pb-16">
      {/* Top Header */}
      <div>
        <Link
          to="/kidz/explore"
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors"
        >
          <ChevronLeft className="size-4" />
          BACK TO COURSE
        </Link>
        <h1 className="mt-2 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
          My Wishlist
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Save your favourite courses and come back to anytime!
        </p>
      </div>

      {/* Main Grid: Left Items + Right Panda Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Wishlist Items List */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {loading && items.length === 0 ? (
            /* Loading Skeletons */
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs animate-pulse"
                >
                  <div className="size-24 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-slate-100 rounded w-2/3" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/80 py-16 px-6 text-center shadow-xs">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mb-4 shadow-xs">
                <Heart className="size-8 fill-rose-500 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Your Wishlist is Empty</h3>
              <p className="mt-2 max-w-md text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed">
                Explore our fun courses and click the heart icon on any course to save it here for later!
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Button
                  asChild
                  className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-5 shadow-sm"
                >
                  <Link to="/kidz/explore">
                    Explore Courses 🚀
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            /* List of Cards */
            items.map((item, idx) => {
              const fallback = fallbackImages[idx % fallbackImages.length];
              const meta = courseMetaMap[item.courseId];
              const thumbnailSrc =
                item.thumbnail?.trim() ||
                meta?.thumbnailUrl?.trim() ||
                meta?.thumbnail?.trim() ||
                fallback;
              const isLiveCourse = isLiveWishlistCourse(item, meta);
              const isFree = isFreeWishlistCourse(item, meta);
              const currentPrice =
                item.discountedPrice ??
                meta?.discountedPrice ??
                item.price ??
                meta?.price ??
                499;

              const isRemoving = removingId === item.courseId;
              const isAdding = addingId === item.courseId;
              const actionStatus = getCourseStatus(item);
              const isCheckingInitialStatus =
                statusLoading && actionStatus === "not_in_cart";

              return (
                <article
                  key={item.courseId || item.id}
                  className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-all duration-200 hover:border-slate-200 hover:shadow-md"
                >
                  {/* Left: Thumbnail & Course Info */}
                  <div
                    className="flex items-start sm:items-center gap-4 flex-1 min-w-0 cursor-pointer"
                    onClick={() =>
                      navigate(`/kidz/courses/${item.courseId}`, {
                        state: { course: meta, isLive: isLiveCourse },
                      })
                    }
                  >
                    <div className="size-24 sm:size-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100 shadow-2xs">
                      <img
                        src={thumbnailSrc}
                        alt={item.title}
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src !== fallback) {
                            img.src = fallback;
                          }
                        }}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {item.title}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Ages 6 - 10 : {item.lessons || meta?.totalLessons || 12} Lessons : Certificate
                      </p>

                      <div className="mt-3 flex items-center gap-2.5 flex-wrap">
                        <span className="text-base sm:text-lg font-black text-slate-900">
                          {isFree ? "Free" : `₹ ${currentPrice}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Heart + Status Action Button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 shrink-0">
                    {/* Top Icon: Pink Heart */}
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRemove(item.courseId, item.title)}
                        disabled={isRemoving || isAdding}
                        aria-label="Remove from wishlist"
                        title="Remove from wishlist"
                        className="transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Heart className="size-5 fill-rose-500 text-rose-500" />
                      </button>
                    </div>

                    {/* Bottom: Status-based Action Button */}
                    {isCheckingInitialStatus ? (
                      <Button
                        type="button"
                        disabled
                        className="rounded-xl bg-slate-100 text-slate-500 font-bold text-xs px-5 py-2.5 flex items-center gap-2 shadow-none"
                      >
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Checking...</span>
                      </Button>
                    ) : actionStatus === "purchased" ? (
                      <Button
                        type="button"
                        disabled={isRemoving}
                        onClick={() =>
                          navigate(`/kidz/courses/${item.courseId}/learn`, {
                            state: { course: meta, isLive: isLiveCourse },
                          })
                        }
                        className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <BookOpen className="size-3.5" />
                        <span>Start Learning</span>
                      </Button>
                    ) : actionStatus === "in_cart" ? (
                      <Button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => navigate("/cart")}
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <ArrowRight className="size-3.5" />
                        <span>Go to Cart</span>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => void handleAddToCart(item)}
                        disabled={isAdding || isRemoving}
                        className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        {isAdding ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ShoppingCart className="size-3.5" />
                        )}
                        <span>{isAdding ? "Adding..." : "Add to Cart"}</span>
                      </Button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Column: Panda Wishlist Banner Card */}
        <div className="lg:col-span-5">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06b6d4] via-[#38bdf8] to-[#f472b6] p-6 shadow-md flex flex-col items-center justify-between min-h-[500px]">
            {/* Top Panda Image */}
            <div className="relative z-10 w-full flex justify-center pt-2">
              <img
                src={wishlistPandaImg}
                alt="My Wishlist Panda"
                className="w-56 sm:w-64 max-w-full h-auto object-contain drop-shadow-xl select-none pointer-events-none"
              />
            </div>

            {/* Bottom White Bubble Card */}
            <div className="relative z-10 w-full bg-white rounded-3xl p-6 sm:p-7 text-center shadow-xl mt-6 flex flex-col items-center">
              <div className="size-11 rounded-full bg-rose-50 flex items-center justify-center mb-3 shadow-2xs">
                <Heart className="size-5 fill-rose-500 text-rose-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Your Wishlist
              </h3>
              <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed max-w-xs">
                Keep your favourite courses here and continue your learning journey anytime!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banner: Still thinking? */}
      <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xs">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
            <Lightbulb className="size-7 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-black text-slate-900">Still thinking?</h4>
            <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-500">
              Explore more courses and add them to your wishlist!
            </p>
          </div>
        </div>

        <Button
          asChild
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-8 py-5 shadow-sm shrink-0"
        >
          <Link to="/kidz/explore">
            Explore Courses
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default KidzWishlist;
