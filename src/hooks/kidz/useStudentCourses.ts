import { useCallback, useEffect, useState } from "react";

import { coursesService } from "@/services/kidz/courses.service";
import { enrollmentService } from "@/services/kidz/enrollment.service";
import type { CourseDTO, EnrolledCourseDTO } from "@/types/kidz/api.types";
import { extractErrorMessage } from "@/lib/kidz/kidz-api-error";

export function useStudentCourses() {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseDTO[]>([]);
  const [catalog, setCatalog] = useState<CourseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrolled = useCallback(async () => {
    try {
      const data = await enrollmentService.getMyEnrollments("COURSE", 0, 100);
      const kidsEnrolled = data.filter((e) => {
        const sector = (e.course?.learningSector || (e as any).learningSector || "").toUpperCase();
        return !sector || sector === "KIDS";
      });
      setEnrolledCourses(kidsEnrolled);
      return kidsEnrolled;
    } catch (err) {
      console.warn("Could not load enrolled courses:", err);
      return [];
    }
  }, []);

  const fetchCatalog = useCallback(async (subject?: string, search?: string) => {
    try {
      const data = await coursesService.getPublicCatalog({
        page: 0,
        size: 50,
        ...(subject ? { subject } : {}),
        ...(search ? { search } : {}),
      });
      const kidsCourses = data.filter((c) => (c.learningSector || "").toUpperCase() === "KIDS");
      setCatalog(kidsCourses);
      return kidsCourses;
    } catch (err) {
      const msg = extractErrorMessage(err, "Failed to load courses");
      setError(msg);
      return [];
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.allSettled([fetchEnrolled(), fetchCatalog()]).finally(() => {
      if (mounted) {
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fetchCatalog, fetchEnrolled]);

  return {
    enrolledCourses,
    catalog,
    isLoading,
    error,
    refreshEnrolled: fetchEnrolled,
    refreshCatalog: fetchCatalog,
  };
}
