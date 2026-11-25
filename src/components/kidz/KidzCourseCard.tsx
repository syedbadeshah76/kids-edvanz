import { useState } from "react";
import { Star, Users, Clock, Heart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import type { Course } from "@/data/kidz/portal";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";

import codingBracketsImg from "@/assets/kidz/coding-brackets-3d.jpg";
import algebraShapesImg from "@/assets/kidz/algebra-shapes-3d.jpg";
import storyWorkspaceImg from "@/assets/kidz/story-workspace-3d.jpg";

const imageMap: Record<string, string> = {
  "python-quest": codingBracketsImg,
  "algebra-arcade": algebraShapesImg,
  "story-lab": storyWorkspaceImg,
};

export function KidzCourseCard({
  course,
  isPopular = false,
}: {
  course: Course;
  isPopular?: boolean;
}) {
  const navigate = useNavigate();
  const { isEnrolled } = useAppState();
  const { isInCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();

  const enrolled = isEnrolled(course.id) || typeof course.progress === "number";
  const inCart = isInCart(course.id) || isInCart((course as any).productId);
  const favourite = isInWishlist(course.id);
  const [imgError, setImgError] = useState(false);
  const isLiveCourse = Boolean(course.isLive || course.courseType === "LIVE");

  const rawImage =
    (course as any).thumbnailUrl ||
    (course as any).thumbnail ||
    (course as any).coverImage ||
    (course as any).image;

  const hasRawImage = Boolean(
    !imgError &&
    rawImage &&
    typeof rawImage === "string" &&
    rawImage.trim().length > 0
  );

  const imageSrc = hasRawImage
    ? (rawImage as string).trim()
    : (!imgError && imageMap[course.id] ? imageMap[course.id] : null);

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (enrolled) {
      navigate(`/kidz/courses/${course.id}/learn`, { state: { course, isLive: isLiveCourse } });
    } else {
      navigate(`/kidz/courses/${course.id}`, { state: { course, isLive: isLiveCourse } });
    }
  };

  const handleToggleFavourite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (favourite) {
      await removeFromWishlist(course.id);
      toast.message("Removed from favourites");
    } else {
      await addToWishlist({
        id: course.id,
        courseId: course.id,
        productId: (course as any).productId,
        title: course.title,
        thumbnail: imageSrc || "",
        instructor: course.instructor?.name || (course as any).teacher || "Instructor",
        price: course.originalPrice || course.price || 999,
        discountedPrice: course.discountedPrice || course.price || 499,
        rating: course.rating || 5,
        students: (course as any).studentsCount || (course as any).students || 0,
        level: course.level || "Beginner",
        category: (course as any).category || (course as any).subject || "General",
        lessons: course.totalLessons || (course as any).lessons || 12,
      });
      toast.success("Saved to favourites ❤️");
    }
  };

  return (
    <article
      onClick={() => {
        if (enrolled) {
          navigate(`/kidz/courses/${course.id}/learn`, { state: { course, isLive: isLiveCourse } });
        } else {
          navigate(`/kidz/courses/${course.id}`, { state: { course, isLive: isLiveCourse } });
        }
      }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer"
    >
      {/* Thumbnail Header */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-100 flex items-center justify-center">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={course.title}
            onError={() => setImgError(true)}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="size-full bg-slate-100" />
        )}

        {/* Price & Live Badges */}
        <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5 z-10">
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-extrabold shadow-sm ${
              course.price === "Free"
                ? "bg-emerald-600 text-white"
                : "bg-slate-900 text-white"
            }`}
          >
            {course.price}
          </span>
          {isLiveCourse && (
            <span className="flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white shadow-sm uppercase tracking-wider">
              <span className="size-1.5 rounded-full bg-white animate-ping" />
              LIVE
            </span>
          )}
        </div>

        {/* Heart Favorite Button */}
        <button
          type="button"
          aria-label={favourite ? "Remove from favourites" : "Add to favourites"}
          onClick={handleToggleFavourite}
          className="absolute right-3.5 top-3.5 flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm transition-transform hover:scale-110 active:scale-95 z-10"
        >
          <Heart
            className={`size-4 ${
              favourite ? "fill-red-500 text-red-500" : "text-slate-600"
            }`}
          />
        </button>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-wider uppercase text-rose-500">
              {course.subject} · AGES {course.age}
            </p>
            {course.level && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 tracking-wide uppercase">
                {course.level}
              </span>
            )}
          </div>
          <h3 className="mt-1 line-clamp-1 text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
            {course.title}
          </h3>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{course.teacher || "Instructor"}</p>
        </div>

        {/* Info Icons Row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1 text-slate-900 font-bold">
            <Star className="size-3.5 fill-slate-900 text-slate-900" /> {course.rating}
          </span>
          <span className="flex items-center gap-1">
            <Users className="size-3.5 text-slate-400" /> {course.students.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5 text-slate-400" /> {course.duration}
          </span>
          <span>
            {isLiveCourse
              ? course.schedule?.sessionDays
                ? `${course.schedule.sessionDays.split(',').length} days/wk`
                : "Live cohort"
              : `${course.lessons} lessons`}
          </span>
        </div>

        {/* Progress Bar for Continue Learning */}
        {!isPopular && typeof course.progress === "number" && (
          <div className="mt-1 space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${course.progress}%` }}
              />
            </div>
            <p className="text-[11px] font-semibold text-slate-400">
              {course.progress}% · Next: {course.nextLesson || "Next lesson"}
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-auto pt-2">
          <Button
            onClick={handleAction}
            className={`w-full rounded-full py-5 text-sm font-bold shadow-sm transition-all active:scale-[0.99] ${
              inCart
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {enrolled
              ? "Resume"
              : inCart
              ? "In Cart ✓"
              : "View Course"}
          </Button>
        </div>
      </div>
    </article>
  );
}

export const CourseCard = KidzCourseCard;
