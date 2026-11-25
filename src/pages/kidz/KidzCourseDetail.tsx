import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Play,
  Tv,
  Loader2,
} from "lucide-react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { toast as sonnerToast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAuth } from "@/contexts/AuthContext";
import { useCart, type CartItem } from "@/contexts/CartContext";
import { coursesService } from "@/services/courses.service";
import { coursesService as kidzCoursesService } from "@/services/kidz/courses.service";
import { instructorsService } from "@/services/instructors.service";
import { reviewsService, type CourseReview } from "@/services/reviews.service";
import { enrollmentService } from "@/services/enrollment.service";
import { demoClassService, parseDemoDate } from "@/services/demoClass.service";
import type { DemoClassItem } from "@/types/demoClass";
import { BookFreeDemoModal } from "@/components/courses/BookFreeDemoModal";
import {
  formatEmbedVideoUrl,
  getAuthRedirectPath,
} from "@/lib/utils";

import storyWorkspaceImg from "@/assets/kidz/story-workspace-3d.jpg";
import heroBooksImg from "@/assets/kidz/hero-books-stack.jpg";
import codingBracketsImg from "@/assets/kidz/coding-brackets-3d.jpg";
import algebraShapesImg from "@/assets/kidz/algebra-shapes-3d.jpg";
import "./kidz.css";

type Lesson = {
  id: string;
  title: string;
  duration: string;
  videoDurationSeconds?: number;
  videoUrl?: string;
  previewEnabled?: boolean;
  isFreePreview?: boolean;
};

type Module = {
  id: string;
  title: string;
  duration: string;
  lessons: Lesson[];
};

const imageMap: Record<string, string> = {
  "python-quest": codingBracketsImg,
  "algebra-arcade": algebraShapesImg,
  "story-lab": storyWorkspaceImg,
};

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}min` : `${h}h`;
};

const normalizeCurriculum = (sections: any[]): Module[] => {
  if (!Array.isArray(sections) || sections.length === 0) return [];
  return sections.map((s: any, mi: number) => {
    const lessons = (s.lessons ?? s.items ?? []).map((l: any, li: number) => ({
      id: String(l.id ?? l.lessonId ?? `l-${mi}-${li}`),
      title: l.title ?? `Lesson ${li + 1}`,
      duration: formatDuration(
        l.videoDurationSeconds ??
          (l.durationMinutes ? l.durationMinutes * 60 : undefined) ??
          l.duration,
      ),
      videoDurationSeconds:
        l.videoDurationSeconds ??
        (l.durationMinutes ? l.durationMinutes * 60 : undefined),
      videoUrl: l.videoUrl || l.mediaUrl || l.url,
      previewEnabled: !!(l.previewEnabled || l.isPreview || l.isFreePreview || li === 0),
      isFreePreview: !!(l.previewEnabled || l.isPreview || l.isFreePreview || li === 0),
    }));
    const totalSec = lessons.reduce(
      (sum: number, l: any) => sum + (l.videoDurationSeconds || 0),
      0,
    );
    const modSec = s.durationMinutes ? s.durationMinutes * 60 : totalSec;
    return {
      id: String(s.id ?? s.moduleId ?? `m-${mi}`),
      title: s.title ? `${String(mi + 1).padStart(2, "0")}: ${s.title}` : `${String(mi + 1).padStart(2, "0")}: Module ${mi + 1}`,
      duration: formatDuration(modSec || totalSec),
      lessons,
    };
  });
};

export function KidzCourseDetail() {
  const { courseId = "" } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateCourse = (location.state as any)?.course;

  const { isAuthenticated } = useAuth();
  const { addToCart, isInCart } = useCart();

  const [course, setCourse] = useState<any | null>(stateCourse || null);
  const [loading, setLoading] = useState(!stateCourse);
  const [error, setError] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState(false);

  const isLiveCourse = Boolean(
    course?.isLive ||
      (location.state as any)?.isLive ||
      String(course?.courseType || "").toUpperCase().includes("LIVE") ||
      String(course?.type || "").toUpperCase().includes("LIVE") ||
      course?.productType === "LIVE_COURSE" ||
      course?.schedule != null ||
      course?.liveCourseStatus != null ||
      course?.meetingPlatform != null,
  );

  const [resolvedInstructorName, setResolvedInstructorName] = useState("");

  const [curriculum, setCurriculum] = useState<Module[]>([]);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [enrolledCount, setEnrolledCount] = useState<number | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Video Preview Dialog State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState("Course Preview");

  // Demo class booking states
  const [hasBookedDemo, setHasBookedDemo] = useState<boolean>(() => {
    try {
      if (!courseId) return false;
      return localStorage.getItem(`demo_booked_${courseId}`) === "true";
    } catch {
      return false;
    }
  });
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoClasses, setDemoClasses] = useState<DemoClassItem[]>(() => {
    try {
      if (!courseId) return [];
      const cached = localStorage.getItem(`demo_classes_${courseId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (courseId && localStorage.getItem(`demo_booked_${courseId}`) === "true") {
      setHasBookedDemo(true);
    }
  }, [courseId]);

  const loadDemoClasses = useCallback(async () => {
    if (!courseId) return;
    try {
      const list = await demoClassService.getDemoClassesByCourse(courseId);
      if (Array.isArray(list)) {
        setDemoClasses(list);
        try {
          localStorage.setItem(`demo_classes_${courseId}`, JSON.stringify(list));
        } catch {}
        const anyBooked = list.some((d) => d.booked);
        if (anyBooked) {
          setHasBookedDemo(true);
          localStorage.setItem(`demo_booked_${courseId}`, "true");
        }
      }
    } catch (err) {
      console.warn("Failed to load demo classes for course:", err);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId && isLiveCourse) {
      loadDemoClasses();
    }
  }, [courseId, isLiveCourse, loadDemoClasses]);

  // Load Course Details dynamically from API
  useEffect(() => {
    setThumbError(false);
    if (!courseId) {
      setError("No course specified.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadCourseData() {
      // 1. Direct fetch from GET /courses/{courseId}
      try {
        const kidzCourse = await kidzCoursesService.getCourseById(courseId);
        if (!isMounted) return;
        if (kidzCourse && (kidzCourse.id || kidzCourse.title)) {
          setCourse(kidzCourse);
          if (Array.isArray(kidzCourse.modules) && kidzCourse.modules.length > 0) {
            setCurriculum(normalizeCurriculum(kidzCourse.modules));
          }
          return;
        }
      } catch {
        /* fallback to live or recorded list */
      }

      // 2. Check if it is a Live Course
      try {
        const liveCatalog = await kidzCoursesService.getLiveCourses({ learningSector: "KIDS" });
        if (!isMounted) return;
        const matchLive = liveCatalog.find(
          (item) => String(item.id) === String(courseId) || String(item.slug) === String(courseId)
        );
        if (matchLive) {
          setCourse({ ...matchLive, isLive: true, courseType: "LIVE" });
          return;
        }
      } catch {
        /* fallback */
      }

      // 3. Fallback to recorded courses list
      try {
        const recordedList = await kidzCoursesService.getRecordedCourses({ page: 0, size: 50 });
        if (!isMounted) return;
        const matchRec = recordedList?.find(
          (item) => String(item.id) === String(courseId) || String(item.slug) === String(courseId)
        );
        if (matchRec) {
          setCourse(matchRec);
          if (Array.isArray(matchRec.modules) && matchRec.modules.length > 0) {
            setCurriculum(normalizeCurriculum(matchRec.modules));
          }
          return;
        }
      } catch {
        /* fallback to state */
      }

      if (stateCourse && (stateCourse.id || stateCourse.title)) {
        if (!isMounted) return;
        setCourse(stateCourse);
        return;
      }

      if (isMounted) {
        setError("Course not found");
      }
    }

    loadCourseData().finally(() => {
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Load Instructor Details
  useEffect(() => {
    if (!course) return;
    let isMounted = true;

    instructorsService
      .resolveInstructorForCourse(course)
      .then((inst) => {
        if (!isMounted || !inst) return;
        if (inst.name && inst.name.toLowerCase() !== "instructor") {
          setResolvedInstructorName(inst.name);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [course]);

  // Load Curriculum (Modules + Lessons) dynamically from API
  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;

    async function loadCurriculum() {
      let sections: any[] = [];
      try {
        const kidzMods = await kidzCoursesService.getModulesByCourse(courseId);
        if (Array.isArray(kidzMods) && kidzMods.length > 0) {
          sections = kidzMods;
        }
      } catch {
        /* try fallback */
      }

      if (sections.length === 0) {
        try {
          const res: any = await coursesService.getCourseCurriculum(courseId);
          const data = res?.data ?? res ?? [];
          if (Array.isArray(data) && data.length > 0) {
            sections = data;
          }
        } catch {
          /* ignore */
        }
      }

      if (Array.isArray(sections) && sections.length > 0) {
        const enriched = await Promise.all(
          sections.map(async (s: any) => {
            if (Array.isArray(s.lessons) && s.lessons.length > 0) return s;
            try {
              const lRes: any = await kidzCoursesService
                .getLessonsByModule(s.id ?? s.moduleId)
                .catch(() => coursesService.getLessonsByModule(s.id ?? s.moduleId));
              const lessons = lRes?.data ?? lRes ?? [];
              return { ...s, lessons: Array.isArray(lessons) ? lessons : [] };
            } catch {
              return { ...s, lessons: [] };
            }
          }),
        );
        if (isMounted) {
          setCurriculum(normalizeCurriculum(enriched));
        }
      } else if (isMounted) {
        if (course && Array.isArray(course.modules) && course.modules.length > 0) {
          setCurriculum(normalizeCurriculum(course.modules));
        } else {
          setCurriculum([]);
        }
      }
    }

    void loadCurriculum();

    return () => {
      isMounted = false;
    };
  }, [courseId, course]);

  // Load Enrollment status & count
  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;

    if (isAuthenticated) {
      enrollmentService
        .checkEnrollment(courseId)
        .then((res: any) => {
          if (isMounted && res?.success) {
            setIsEnrolled(Boolean(res.data?.isEnrolled));
          }
        })
        .catch(() => {});
    }

    enrollmentService
      .getCourseEnrollmentCount(courseId)
      .then((res: any) => {
        if (!isMounted) return;
        const count = typeof res?.data?.count === "number" ? res.data.count : null;
        setEnrolledCount(count);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [courseId, isAuthenticated]);

  // Load Reviews
  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;

    reviewsService
      .getByCourse(courseId)
      .then((res: any) => {
        if (!isMounted) return;
        const data = res?.data ?? res ?? [];
        const list = Array.isArray(data) ? data : [data];
        const normalized = list.map((r: any) => ({
          id: String(r.id ?? r.reviewId),
          userId: r.userId,
          userName: r.userName ?? r.user?.name ?? "Happy Learner",
          userAvatar: r.userAvatar ?? r.user?.avatar,
          rating: Number(r.rating ?? 5),
          reviewText: r.reviewText ?? r.text ?? "Great course! I learned so much from this.",
          createdAt: r.createdAt ?? new Date().toISOString(),
          helpfulCount: Number(r.helpfulCount ?? r.helpful ?? 3),
          notHelpfulCount: Number(r.notHelpfulCount ?? 0),
          userCurrentVote: r.userCurrentVote ?? "NONE",
          courseId: r.courseId,
          courseName: r.courseName,
          status: r.status,
        }));
        setReviews(normalized);
      })
      .catch(() => {
        if (isMounted) setReviews([]);
      });

    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Derived Fields
  const c: any = course || {};
  const targetProductId = c.productId || c.product_id || c.id || courseId;
  const isUnpublished = c.isPublished === false;
  const isAddedToCart = Boolean(
    (targetProductId && isInCart(targetProductId)) || (c.id && isInCart(c.id)),
  );

  const directInstructorName =
    typeof c.instructor === "object"
      ? c.instructor?.name
      : c.instructorName ??
        (typeof c.instructor === "string" && c.instructor.toLowerCase() !== "instructor"
          ? c.instructor
          : "");

  const instructorName =
    resolvedInstructorName ||
    (directInstructorName && directInstructorName.toLowerCase() !== "instructor"
      ? directInstructorName
      : "");

  const rawThumbnail =
    c.thumbnailUrl ||
    c.thumbnail ||
    c.coverImage ||
    imageMap[courseId];

  const hasThumbnail = Boolean(
    !thumbError &&
    rawThumbnail &&
    typeof rawThumbnail === "string" &&
    rawThumbnail.trim().length > 0
  );

  const thumbnailImg = hasThumbnail ? (rawThumbnail as string).trim() : null;

  const rawPrice = Number(c.price ?? 0);
  const rawDiscPrice = Number(c.discountedPrice ?? c.discountPrice ?? 0);
  const rawBasePrice = Number(c.basePrice ?? 0);

  const price = rawDiscPrice > 0 ? rawDiscPrice : rawPrice > 0 ? rawPrice : rawBasePrice > 0 ? rawBasePrice : 0;
  const originalPrice = Number(
    c.strikeOutPrice ?? c.originalPrice ?? (rawBasePrice > price ? rawBasePrice : 0),
  );

  const isFree = Boolean(
    c.isFree ||
    String(c.pricingType || "").toUpperCase() === "FREE" ||
    String(c.type || "").toUpperCase() === "FREE" ||
    (c.price === 0 && (!c.discountedPrice || c.discountedPrice === 0)) ||
    (c.price === "0" && !c.discountedPrice),
  );

  const formattedPrice = isFree ? "Free" : `₹ ${price}`;
  const formattedOriginalPrice = originalPrice > price ? `₹ ${originalPrice}` : null;

  const subjectName = c.subject || c.category?.name || c.category || (isFree ? "Coding" : "Math");
  const categoryDisplay = (subjectName || "Coding").toUpperCase();

  const studentCountDisplay = enrolledCount !== null
    ? enrolledCount
    : Number(c.enrolledStudentsCount ?? c.totalStudents ?? c.students ?? 0);



  const validDemoClasses = useMemo<DemoClassItem[]>(() => {
    if (!Array.isArray(demoClasses)) return [];
    return demoClasses.filter((d) => d && d.id && d.id !== courseId && d.id !== course?.id);
  }, [demoClasses, courseId, course?.id]);

  const bookedDemo =
    validDemoClasses.find((d) => d.booked) ||
    (hasBookedDemo && validDemoClasses.length > 0 ? validDemoClasses[0] : null) ||
    (validDemoClasses.length > 0 ? validDemoClasses[0] : null);

  const isDemoLiveNow = (() => {
    if (!bookedDemo) return false;
    const start = parseDemoDate(
      bookedDemo.scheduledStartAt || (bookedDemo as any).scheduledAt || (bookedDemo as any).scheduled_at,
    );
    if (!start) return false;
    const durationMin = bookedDemo.durationMinutes || 90;
    const end = parseDemoDate(bookedDemo.scheduledEndAt) || (start + durationMin * 60 * 1000);
    return currentTime >= start - 15 * 60 * 1000 && currentTime <= end;
  })();

  const handleJoinDemo = async (demoId?: string) => {
    const targetId = demoId || bookedDemo?.id;
    if (!targetId) {
      sonnerToast.error("Demo class not found");
      return;
    }
    try {
      const res = await demoClassService.joinDemoClass(targetId);
      const joinUrl =
        res?.joinUrl ||
        res?.url ||
        (typeof res === "string" ? res : null) ||
        bookedDemo?.joinUrl ||
        course?.schedule?.meetingLink;

      if (joinUrl && typeof joinUrl === "string" && joinUrl.startsWith("http")) {
        sonnerToast.success("Joining Demo Class...");
        window.open(joinUrl, "_blank", "noopener,noreferrer");
      } else {
        sonnerToast.warning("Wait for the instructor to join the meeting.", {
          description: "The instructor has not started the session yet. Please try again shortly.",
        });
      }
    } catch (err: any) {
      const joinUrl = bookedDemo?.joinUrl || course?.schedule?.meetingLink;
      if (joinUrl && typeof joinUrl === "string" && joinUrl.startsWith("http")) {
        sonnerToast.success("Joining Demo Class...");
        window.open(joinUrl, "_blank", "noopener,noreferrer");
        return;
      }
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Wait for the instructor to join the meeting.";

      sonnerToast.warning("Wait for the instructor to join the meeting.", {
        description: errMsg.includes("instructor") ? errMsg : "Wait for the instructor to join the meeting.",
      });
    }
  };

  const handleBookingSuccess = (demoClassId: string) => {
    if (courseId) {
      localStorage.setItem(`demo_booked_${courseId}`, "true");
    }
    try {
      const prevDemos = JSON.parse(localStorage.getItem("edvanz_booked_demos") || "[]");
      if (Array.isArray(prevDemos) && !prevDemos.includes(demoClassId)) {
        prevDemos.push(demoClassId);
        localStorage.setItem("edvanz_booked_demos", JSON.stringify(prevDemos));
      }
    } catch {}
    setHasBookedDemo(true);
    setDemoClasses((prev) =>
      prev.map((d) => (d.id === demoClassId ? { ...d, booked: true } : d)),
    );
    loadDemoClasses();
  };

  const totalCurriculumSeconds = curriculum.reduce((acc, m) => {
    return (
      acc +
      m.lessons.reduce((lAcc, l: any) => {
        const sec =
          l.videoDurationSeconds ??
          (l.durationMinutes ? l.durationMinutes * 60 : 0);
        return lAcc + (sec || 0);
      }, 0)
    );
  }, 0);

  const apiDurationMins = Number(
    c.totalDurationMinutes ?? c.durationMinutes ?? c.total_duration_minutes ?? 0,
  );
  const totalMins =
    apiDurationMins > 0
      ? apiDurationMins
      : totalCurriculumSeconds > 0
      ? Math.max(1, Math.round(totalCurriculumSeconds / 60))
      : 0;

  const formattedDurationLength = (() => {
    if (totalMins > 0) {
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      if (h > 0 && m > 0) return `${h}H ${m}m total Length`;
      if (h > 0) return `${h}H total Length`;
      return `${m}m total Length`;
    }
    if (
      c.totalDurationMinutes == null &&
      c.durationMinutes == null &&
      c.total_duration_minutes == null &&
      typeof c.duration === "string" &&
      c.duration.trim()
    ) {
      const trimmed = c.duration.trim();
      return trimmed.toLowerCase().includes("length") ? trimmed : `${trimmed} total Length`;
    }
    return null;
  })();

  const curriculumLessonsCount = curriculum.reduce((acc, m) => acc + m.lessons.length, 0);
  const apiLessonsCount = Number(c.totalLessons ?? 0);
  const totalLectures = curriculumLessonsCount > 0 ? curriculumLessonsCount : apiLessonsCount;

  const lessonsCountDisplay =
    totalLectures > 0
      ? `${totalLectures} ${totalLectures === 1 ? "Lesson" : "Lessons"}`
      : null;

  const freeOutcomes =
    Array.isArray(c.learningOutcomes) && c.learningOutcomes.length > 0
      ? c.learningOutcomes.slice(0, 3)
      : Array.isArray(c.whatYouWillLearn) && c.whatYouWillLearn.length > 0
      ? c.whatYouWillLearn.slice(0, 3)
      : [
          "Build your first python game",
          "Understanding Basic programming Concept",
          "Solve fun challenges and quizzez",
        ];

  const premiumOutcomes =
    Array.isArray(c.learningOutcomes) && c.learningOutcomes.length > 0
      ? c.learningOutcomes.slice(0, 4)
      : Array.isArray(c.whatYouWillLearn) && c.whatYouWillLearn.length > 0
      ? c.whatYouWillLearn.slice(0, 4)
      : [
          "Full access to all lessons",
          "Downloade resources and worksheets",
          "Ask doubt in community",
          "Certificate After completion",
        ];

  const reviewStats = {
    avg: reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : Number(c.avgRating ?? c.rating ?? 0),
    total: reviews.length || Number(c.totalReviews ?? c.reviewCount ?? 0),
  };

  const cartPayload: CartItem = {
    id: targetProductId,
    productId: targetProductId,
    courseId: c.id || courseId,
    title: c.title || "Course",
    thumbnail: thumbnailImg,
    instructor: instructorName || "Instructor",
    price: price,
    discountedPrice: price,
    originalPrice: originalPrice > price ? originalPrice : undefined,
    isLive: isLiveCourse,
    productType: isLiveCourse ? "LIVE_COURSE" : "COURSE",
    description: c.description || c.tagline,
    totalLessons: totalLectures,
    duration: formattedDurationLength ?? "",
    rating: reviewStats.avg,
    reviewCount: reviewStats.total,
  };

  const handleAddToCart = async () => {
    if (isUnpublished) {
      sonnerToast.error("This course is currently unavailable for purchase (not published yet).");
      return;
    }

    if (!targetProductId) {
      sonnerToast.error("Course information not ready");
      return;
    }

    if (!isAuthenticated) {
      try {
        localStorage.setItem("edvanz_pending_cart", JSON.stringify(cartPayload));
      } catch {}
      const targetAuth = getAuthRedirectPath();
      navigate(`${targetAuth}?redirect=${encodeURIComponent(`/kidz/courses/${courseId}`)}`);
      return;
    }

    try {
      await addToCart(cartPayload);
    } catch {
      // Error message is cleanly toasted by CartContext
    }
  };

  const handleStartFreeCourse = async () => {
    if (!isAuthenticated) {
      const targetAuth = getAuthRedirectPath();
      navigate(`${targetAuth}?redirect=${encodeURIComponent(`/kidz/courses/${courseId}`)}`);
      return;
    }

    try {
      if (!isEnrolled) {
        await enrollmentService.enrollInCourse(courseId);
        setIsEnrolled(true);
        sonnerToast.success("Successfully enrolled in free course! 🎉");
      }
      navigate(`/kidz/courses/${courseId}/learn`);
    } catch {
      navigate(`/kidz/courses/${courseId}/learn`);
    }
  };

  // Resolve actual preview video from course modules' first lesson with a videoUrl
  const actualPreviewVideoUrl = useMemo<string | null>(() => {
    // 1. Check curriculum or course modules
    const modsToCheck =
      Array.isArray(curriculum) && curriculum.length > 0
        ? curriculum
        : Array.isArray(c.modules) && c.modules.length > 0
        ? c.modules
        : [];

    if (modsToCheck.length > 0) {
      for (const m of modsToCheck) {
        const lessons = m.lessons || m.items || [];
        if (Array.isArray(lessons) && lessons.length > 0) {
          for (const l of lessons) {
            const vUrl = l.videoUrl || l.mediaUrl || l.url;
            if (vUrl && typeof vUrl === "string" && vUrl.trim().startsWith("http")) {
              return vUrl.trim();
            }
          }
        }
      }
    }

    // 2. Direct lesson list if any
    if (Array.isArray(c.lessons) && c.lessons.length > 0) {
      for (const l of c.lessons) {
        const vUrl = l.videoUrl || l.mediaUrl || l.url;
        if (vUrl && typeof vUrl === "string" && vUrl.trim().startsWith("http")) {
          return vUrl.trim();
        }
      }
    }

    // 3. Direct course video URL if explicitly provided by API
    if (c.promoVideoUrl && typeof c.promoVideoUrl === "string" && c.promoVideoUrl.trim().startsWith("http")) {
      return c.promoVideoUrl.trim();
    }
    if (c.previewVideoUrl && typeof c.previewVideoUrl === "string" && c.previewVideoUrl.trim().startsWith("http")) {
      return c.previewVideoUrl.trim();
    }
    if (c.videoUrl && typeof c.videoUrl === "string" && c.videoUrl.trim().startsWith("http")) {
      return c.videoUrl.trim();
    }

    // ZERO hardcoded fallbacks! If modules are empty or have no video, return null!
    return null;
  }, [c, curriculum]);

  const openVideoPreview = (url?: string, title?: string) => {
    const rawUrl = url || actualPreviewVideoUrl;
    if (!rawUrl) {
      sonnerToast.info("No preview video available for this course yet.");
      return;
    }
    setPreviewVideoUrl(rawUrl);
    setPreviewVideoTitle(title || c.title || "Course Preview");
    setVideoModalOpen(true);
  };

  // Loading State
  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-10 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-black text-slate-800">Loading course details...</h2>
        <p className="mt-1 text-xs font-semibold text-slate-400">Fetching lessons, modules, and teacher info for you.</p>
      </div>
    );
  }

  // Not Found State
  if (error || !course) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center py-20 text-center">
        <div className="grid size-20 place-items-center rounded-3xl bg-blue-50 text-4xl mb-4">
          🔍
        </div>
        <h2 className="text-2xl font-black text-slate-900">Course Not Found</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          {error || "We couldn't locate this course in the catalog. It might have been moved or updated."}
        </p>
        <Button asChild className="mt-6 rounded-full bg-blue-600 px-6 font-bold text-white shadow-md hover:bg-blue-700">
          <Link to="/kidz/explore">
            <ArrowLeft className="mr-2 size-4" /> Back to Explore
          </Link>
        </Button>
      </div>
    );
  }

  const { embedUrl, isDirectVideo } = formatEmbedVideoUrl(previewVideoUrl);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 pb-20 pt-2 sm:px-6">
      {/* ── Top Header Navigation ── */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-blue-600 hover:underline"
        >
          BACK TO COURSE
        </button>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          {isFree ? "Enroll Course For Free" : "Enroll in Course"}
        </h1>
      </div>

      {/* ── Main Card Container ── */}
      <div className="rounded-3xl border border-slate-100/90 bg-white p-6 shadow-sm sm:p-8 space-y-6">
        {/* If Premium Course: Back arrow & "Unlock a Course" title inside card */}
        {!isFree && (
          <div className="relative flex items-center justify-center border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Back"
              className="absolute left-0 grid size-8 place-items-center rounded-full text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900">Unlock a Course</h2>
          </div>
        )}

        {/* ── Top Section: 2 Columns (Thumbnail on Left + Details on Right) ── */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          {/* Left: Course Thumbnail (Play preview only if module/lesson video exists) */}
          <div className="group relative aspect-square w-64 sm:w-72 md:w-80 shrink-0 overflow-hidden rounded-2xl bg-slate-100 shadow-sm flex items-center justify-center">
            {thumbnailImg ? (
              <img
                src={thumbnailImg}
                alt={c.title}
                onError={() => setThumbError(true)}
                className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="size-full bg-slate-100" />
            )}
            {actualPreviewVideoUrl && (
              <>
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/30 transition-colors" />
                <button
                  type="button"
                  onClick={() => openVideoPreview(actualPreviewVideoUrl)}
                  aria-label="Preview Course Video"
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                >
                  <div className="grid size-12 sm:size-14 place-items-center rounded-full bg-white/95 text-blue-600 shadow-lg transition-transform group-hover:scale-110 active:scale-95">
                    <Play className="size-5 sm:size-6 fill-blue-600 translate-x-0.5" />
                  </div>
                </button>
              </>
            )}
          </div>

          {/* Right: Ordered Information */}
          <div className="flex flex-1 flex-col justify-between self-stretch w-full">
            <div>
              {/* Category & Badge Row */}
              <div className="flex items-start justify-between gap-2">
                {/* 1. Course category at the top */}
                <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                  {categoryDisplay}
                </span>

                {/* Badge: Free (green) vs Premium (blue) */}
                {isFree ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    Free
                  </span>
                ) : (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-600">
                    Premium
                  </span>
                )}
              </div>

              {/* 2. Course title */}
              <h2 className="mt-2 text-xl font-black text-slate-900 leading-snug sm:text-2xl">
                {c.title}
              </h2>

              {/* 3. Course description */}
              {c.description && (
                <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500 line-clamp-2">
                  {c.description}
                </p>
              )}

              {/* 4. Instructor's name */}
              {instructorName && (
                <p className="mt-1.5 text-sm font-semibold text-slate-500">
                  {instructorName}
                </p>
              )}
            </div>

            {/* 5, 6, 7, 8 in correct order */}
            <div className="mt-4 space-y-1.5 text-sm font-medium text-slate-600">
              {/* 5. Total number of lessons (only when available) */}
              {lessonsCountDisplay && <p>{lessonsCountDisplay}</p>}
              {/* 6. Total lesson duration (only when available) */}
              {formattedDurationLength && <p>{formattedDurationLength}</p>}
              {/* 7. Completion certificate information */}
              {c.certificateEnabled !== false && <p>Certificate Completion</p>}
              {/* 8. "Learn at Your Own Pace" section */}
              <p>Learn at your own pace</p>
            </div>
          </div>
        </div>

        {/* ── Middle: Lavender Banner Section ── */}
        {isFree ? (
          /* Free Course Banner: Rating & Learners + Beginners Friendly */
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#ede9fe] px-5 py-3.5 text-xs sm:text-sm font-bold text-slate-900">
            <div className="flex items-center gap-1.5 text-amber-500">
              <span>⭐</span>
              <span className="text-slate-900 font-bold">
                {reviewStats.avg.toFixed(1)} ({studentCountDisplay.toLocaleString()} {studentCountDisplay === 1 ? "learner" : "learners"})
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span>📊</span>
              <span>{c.level || "Beginners Friendly"}</span>
            </div>
          </div>
        ) : (
          /* Premium Course Banner: 9. Unlock This Course, 10. Discounted price, 11. Original price */
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#ede9fe] px-5 py-3.5 text-xs sm:text-sm font-bold text-slate-900">
            {/* 9. "Unlock This Course" section */}
            <span className="text-slate-900">Unlock this Course</span>

            {/* 10. Discounted price & 11. Original price with strikethrough */}
            <div className="flex items-baseline gap-2">
              <span className="text-base sm:text-lg font-black text-slate-900">
                {formattedPrice}
              </span>
              {formattedOriginalPrice && (
                <span className="text-xs sm:text-sm font-semibold text-slate-400 line-through">
                  {formattedOriginalPrice}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-700">
              <span>📊</span>
              <span>Lifetime Access</span>
            </div>
          </div>
        )}

        {/* ── Bottom Section: What you'll Learn ── */}
        <div className="space-y-3 pt-1">
          <h3 className="text-base font-bold text-slate-900">What you&apos;ll Learn</h3>
          <div className="space-y-2.5">
            {(isFree ? freeOutcomes : premiumOutcomes).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700">
                <div className="grid size-5 place-items-center rounded-full bg-emerald-600 text-white shrink-0">
                  <Check className="size-3 stroke-[3]" />
                </div>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        {isFree ? (
          /* Free Course Action Button: Full-width "Start" */
          <div className="pt-2">
            <Button
              type="button"
              onClick={handleStartFreeCourse}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm sm:text-base font-bold text-white shadow-md hover:bg-blue-700 active:scale-[0.99] transition-all"
            >
              Start
            </Button>
          </div>
        ) : (
          /* Premium Course Action Buttons */
          <div className="flex items-center justify-end gap-3 pt-3">
            {/* Live Course: Book a Demo Button */}
            {isLiveCourse && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isDemoLiveNow) {
                    handleJoinDemo();
                  } else {
                    setDemoModalOpen(true);
                  }
                }}
                className="rounded-xl border border-blue-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-blue-600 hover:bg-blue-50 active:scale-95 transition-all"
              >
                {isDemoLiveNow ? "Join Demo Live Now" : hasBookedDemo ? "Demo Booked" : "Free Demo"}
              </Button>
            )}

            {/* Add to Cart Button (replaces Get Now per user prompt) */}
            <Button
              type="button"
              disabled={isUnpublished && !isEnrolled && !isAddedToCart}
              onClick={
                isEnrolled
                  ? () => navigate(`/kidz/courses/${courseId}/learn`)
                  : isAddedToCart
                  ? () => navigate("/kidz/cart")
                  : handleAddToCart
              }
              className={`rounded-xl px-7 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 ${
                isEnrolled
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : isAddedToCart
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : isUnpublished
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isEnrolled
                ? "Continue Learning 🚀"
                : isAddedToCart
                ? "✓ In Cart"
                : isUnpublished
                ? "Currently Unavailable"
                : "Add to Cart"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialog Video Preview Modal ── */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-3xl rounded-3xl p-0 overflow-hidden bg-black text-white border-none shadow-2xl">
          <DialogHeader className="p-4 bg-slate-900 border-b border-slate-800">
            <DialogTitle className="text-sm font-extrabold text-white flex items-center gap-2">
              <Tv className="size-4 text-blue-400" />
              {previewVideoTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="relative aspect-video w-full bg-black">
            {embedUrl ? (
              isDirectVideo ? (
                <video
                  src={embedUrl}
                  controls
                  autoPlay
                  className="size-full object-contain"
                />
              ) : (
                <iframe
                  src={embedUrl}
                  title={previewVideoTitle}
                  className="size-full border-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )
            ) : (
              <div className="flex size-full flex-col items-center justify-center text-center p-8">
                <Play className="size-12 text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-300">Preview video is loading...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Course Free Demo Modal */}
      <BookFreeDemoModal
        open={demoModalOpen}
        onOpenChange={setDemoModalOpen}
        demoClasses={validDemoClasses}
        courseTitle={c?.title || "Live Course"}
        courseDescription={c?.description || c?.tagline || "Live course sessions and practical training."}
        onBookingSuccess={handleBookingSuccess}
      />
    </div>
  );
}

export const CourseDetailPage = KidzCourseDetail;
export default KidzCourseDetail;
