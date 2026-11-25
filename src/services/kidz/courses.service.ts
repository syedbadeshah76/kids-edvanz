import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type {
  CourseDTO,
  CourseModuleDTO,
  CourseProgressDTO,
  LessonDTO,
  LessonSessionDTO,
  SaveLessonSessionRequest,
} from "@/types/kidz/api.types";

export interface CourseCatalogParams {
  page?: number;
  size?: number;
  subject?: string;
  search?: string;
}

export const coursesService = {
  /**
   * Fetch public recorded courses specifically requesting /public/courses?page=0&size=50&learningSector=KIDS
   */
  async getRecordedCourses(params?: {
    page?: number;
    size?: number;
    subject?: string;
    search?: string;
  }): Promise<CourseDTO[]> {
    const page = params?.page ?? 0;
    const size = params?.size ?? 50;
    const query = new URLSearchParams({
      page: String(page),
      size: String(size),
      learningSector: "KIDS",
    });
    if (params?.subject && params.subject !== "All") query.append("subject", params.subject);
    if (params?.search) query.append("search", params.search);

    try {
      const response = await apiClient.get<CourseDTO[]>(`/courses?${query.toString()}`);
      const list = unwrapArray<CourseDTO>(response);
      if (Array.isArray(list) && list.length > 0) {
        return list.filter((c) => (c.learningSector || "").toUpperCase() === "KIDS");
      }
    } catch (err) {
      console.warn("Failed to fetch recorded courses from /courses:", err);
    }
  },

  /**
   * Fetch public live courses specifically requesting /catalog/live-courses?status=PUBLISHED&learningSector=KIDS
   * and strictly filtering to the target learningSector (defaults to KIDS)
   */
  async getLiveCourses(params?: {
    status?: string;
    learningSector?: string;
  }): Promise<any[]> {
    const status = params?.status ?? "PUBLISHED";
    const learningSector = params?.learningSector ?? "KIDS";
    try {
      const response = await apiClient.get<any[]>(
        `/catalog/live-courses?status=${status}&learningSector=${learningSector}`,
      );
      const list = unwrapArray<any>(response);
      return list.filter((c) => (c.learningSector || "").toUpperCase() === learningSector.toUpperCase());
    } catch (err) {
      console.warn("Failed to fetch live courses from /catalog/live-courses:", err);
      return [];
    }
  },

  /**
   * Fetch public catalog of courses (strictly filtered to KIDS learning sector)
   */
  async getPublicCatalog(params?: CourseCatalogParams): Promise<CourseDTO[]> {
    const page = params?.page ?? 0;
    const size = params?.size ?? 12;
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    if (params?.subject && params.subject !== "All") query.append("subject", params.subject);
    if (params?.search) query.append("search", params.search);
    query.append("learningSector", "KIDS");

    let rawList: CourseDTO[] = [];
    try {
      const response = await apiClient.get<CourseDTO[]>(`/courses?${query.toString()}`);
      rawList = unwrapArray<CourseDTO>(response);
    } catch {
      /* fallback */
    }

    if (rawList.length === 0) {
      try {
        const response = await apiClient.get<CourseDTO[]>(`/courses?${query.toString()}`);
        rawList = unwrapArray<CourseDTO>(response);
      } catch {
        /* fallback */
      }
    }

    // STRICT SECTOR FILTERING: Only return courses that belong to the KIDS learning sector
    return rawList.filter((c) => {
      const sector = (c.learningSector || "").toUpperCase();
      return sector === "KIDS";
    });
  },

  /**
   * Fetch approved courses list (strictly filtered to KIDS learning sector)
   */
  async getApprovedCourses(page = 0, size = 100): Promise<CourseDTO[]> {
    const response = await apiClient.get<CourseDTO[]>(
      `/courses?page=${page}&size=${size}&learningSector=KIDS`,
    );
    const list = unwrapArray<CourseDTO>(response);
    return list.filter((c) => (c.learningSector || "").toUpperCase() === "KIDS");
  },

  /**
   * Get single course details by ID
   */
  async getCourseById(courseId: string): Promise<CourseDTO> {
    const response = await apiClient.get<CourseDTO>(`/courses/${courseId}`);
    return unwrapData(response);
  },

  /**
   * Get enrolled student count for a course
   */
  async getEnrollmentCount(courseId: string): Promise<number> {
    const response = await apiClient.get<{ count?: number; enrolledCount?: number } | number>(
      `/courses/${courseId}/enrollments/count`,
    );
    const data = unwrapData(response);
    if (typeof data === "number") return data;
    if (data && typeof data === "object") {
      return (data as { count?: number; enrolledCount?: number }).count ?? (data as { count?: number; enrolledCount?: number }).enrolledCount ?? 0;
    }
    return 0;
  },

  /**
   * Get curriculum modules for a course
   */
  async getModulesByCourse(courseId: string): Promise<CourseModuleDTO[]> {
    const response = await apiClient.get<CourseModuleDTO[]>(`/modules/course/${courseId}`);
    return unwrapArray<CourseModuleDTO>(response);
  },

  /**
   * Get lessons inside a specific module
   */
  async getLessonsByModule(moduleId: string): Promise<LessonDTO[]> {
    const response = await apiClient.get<LessonDTO[]>(`/lessons/modules/${moduleId}`);
    return unwrapArray<LessonDTO>(response);
  },

  /**
   * Get single lesson details
   */
  async getLessonById(lessonId: string): Promise<LessonDTO> {
    const response = await apiClient.get<LessonDTO>(`/lessons/${lessonId}`);
    return unwrapData(response);
  },

  /**
   * Get student's enrolled courses with optional filter: ALL | IN_PROGRESS | COMPLETED
   */
  async getStudentCourses(
    filter: "ALL" | "IN_PROGRESS" | "COMPLETED" = "ALL",
    page = 0,
    size = 10,
  ): Promise<CourseDTO[]> {
    const response = await apiClient.get<CourseDTO[]>(
      `/student/courses?filter=${filter}&page=${page}&size=${size}&learningSector=KIDS`,
    );
    const list = unwrapArray<CourseDTO>(response);
    return list.filter((c) => !c.learningSector || (c.learningSector || "").toUpperCase() === "KIDS");
  },

  /**
   * Get student progress for a specific course
   */
  async getCourseProgress(
    courseId: string,
  ): Promise<
    CourseProgressDTO & {
      lastLessonId?: string;
      completedQuizzes?: number;
      totalQuizzes?: number;
      startedAt?: string | null;
      completedAt?: string | null;
    }
  > {
    try {
      const response = await apiClient.get<any>(
        `/student/courses/${courseId}/progress`,
      );
      const raw: any = unwrapData(response) ?? {};
      const rawIds = Array.isArray(raw.completedLessonIds)
        ? raw.completedLessonIds
        : Array.isArray(raw.completedLessonIdsList)
        ? raw.completedLessonIdsList
        : Array.isArray(raw.completedLessons)
        ? raw.completedLessons
        : Array.isArray(raw.completedLessonIdList)
        ? raw.completedLessonIdList
        : Array.isArray(raw.completed_lessons)
        ? raw.completed_lessons
        : [];
      const completedLessonIds = rawIds.map((id: any) => String(id));
      const pct = Number(raw.progressPercentage ?? raw.progress ?? 0);
      const completedLessonsCount =
        typeof raw.completedLessons === "number"
          ? raw.completedLessons
          : completedLessonIds.length;
      const lastLessonId = raw.lastLessonId
        ? String(raw.lastLessonId)
        : raw.last_lesson_id
        ? String(raw.last_lesson_id)
        : undefined;

      return {
        courseId: String(raw.courseId ?? courseId),
        status: raw.status ?? (pct >= 100 ? "COMPLETED" : pct > 0 ? "IN_PROGRESS" : "NOT_STARTED"),
        progressPercentage: Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0,
        completedModules: Number(raw.completedModules ?? 0) || 0,
        totalModules: Number(raw.totalModules ?? 0) || 0,
        completedLessons: Number.isFinite(completedLessonsCount) ? completedLessonsCount : 0,
        totalLessons: Number(raw.totalLessons ?? 0) || 0,
        completedQuizzes: Number(raw.completedQuizzes ?? 0) || 0,
        totalQuizzes: Number(raw.totalQuizzes ?? 0) || 0,
        startedAt: raw.startedAt ?? null,
        completedAt: raw.completedAt ?? null,
        completedLessonIds,
        ...(lastLessonId ? { lastLessonId } : {}),
      };
    } catch {
      return {
        courseId,
        status: "NOT_STARTED",
        progressPercentage: 0,
        completedModules: 0,
        totalModules: 0,
        completedLessons: 0,
        totalLessons: 0,
        completedQuizzes: 0,
        totalQuizzes: 0,
        startedAt: null,
        completedAt: null,
        completedLessonIds: [],
      };
    }
  },

  /**
   * Get student video/lesson session playback state
   */
  async getLessonSession(
    lessonId: string,
    signal?: AbortSignal,
  ): Promise<LessonSessionDTO> {
    try {
      const response = await apiClient.get<any>(
        `/student/lessons/${lessonId}/session`,
        signal ? { signal } : undefined,
      );
      const raw: any = unwrapData(response) ?? {};
      const pct = Math.min(100, Math.max(0, Number(raw?.progressPercentage ?? 0) || 0));
      const lastPositionSeconds = Math.max(0, Number(raw?.lastPositionSeconds ?? 0) || 0);
      const watchedSeconds = Math.max(
        lastPositionSeconds,
        Number(raw?.watchedSeconds ?? 0) || 0,
      );
      const completed = Boolean(
        raw?.completedLesson ??
          raw?.completed ??
          raw?.isCompleted ??
          pct >= 80,
      );
      return {
        lessonId: String(raw?.lessonId ?? lessonId),
        watchedSeconds,
        lastPositionSeconds,
        progressPercentage: pct,
        completed,
      };
    } catch (err: any) {
      if (
        err?.name === "CanceledError" ||
        err?.name === "AbortError" ||
        err?.code === "ERR_CANCELED"
      ) {
        throw err;
      }
      return {
        lessonId,
        watchedSeconds: 0,
        lastPositionSeconds: 0,
        progressPercentage: 0,
        completed: false,
      };
    }
  },

  /**
   * Save video/lesson playback session.
   * Business rule: if progressPercentage >= 80 (or explicit completion flag is set), marks completed = true.
   */
  async saveLessonSession(
    lessonId: string,
    payload: {
      lastPositionSeconds: number;
      watchedSeconds: number;
      playbackRate?: number;
      progressPercentage: number;
      completed?: boolean;
      completedLesson?: boolean;
      isCompleted?: boolean;
    },
  ): Promise<LessonSessionDTO> {
    const safeLastPos = Math.max(0, Math.round(Number(payload.lastPositionSeconds) || 0));
    const safeWatched = Math.max(
      safeLastPos,
      Math.round(Number(payload.watchedSeconds) || 0),
    );
    const safePct = Math.min(
      100,
      Math.max(0, Math.round(Number(payload.progressPercentage) || 0)),
    );
    const playbackRate = Number(payload.playbackRate ?? 1.0) || 1.0;
    const isCompleted = Boolean(
      payload.completed ||
        payload.completedLesson ||
        payload.isCompleted ||
        safePct >= 80,
    );

    const requestBody: SaveLessonSessionRequest = {
      lastPositionSeconds: safeLastPos,
      watchedSeconds: safeWatched,
      playbackRate,
      progressPercentage: safePct,
      completed: isCompleted,
      completedLesson: isCompleted,
      isCompleted: isCompleted,
    };

    const response = await apiClient.put<any>(
      `/student/lessons/${lessonId}/session`,
      requestBody,
    );
    const raw: any = unwrapData(response) ?? {};
    const respPct =
      raw?.progressPercentage != null
        ? Math.min(100, Math.max(0, Number(raw.progressPercentage) || 0))
        : safePct;
    const respLastPos =
      raw?.lastPositionSeconds != null
        ? Math.max(0, Number(raw.lastPositionSeconds) || 0)
        : safeLastPos;
    const respWatched =
      raw?.watchedSeconds != null
        ? Math.max(respLastPos, Number(raw.watchedSeconds) || 0)
        : safeWatched;

    return {
      lessonId: String(raw?.lessonId ?? lessonId),
      lastPositionSeconds: respLastPos,
      watchedSeconds: respWatched,
      progressPercentage: respPct,
      completed: Boolean(
        raw?.completedLesson ??
          raw?.completed ??
          raw?.isCompleted ??
          (isCompleted || respPct >= 80),
      ),
    };
  },

  /**
   * Mark full course completed
   */
  async completeCourse(courseId: string): Promise<CourseProgressDTO> {
    let response: any;
    try {
      response = await apiClient.put<any>(
        `/student/courses/${courseId}/complete`,
      );
    } catch {
      response = await apiClient.post<any>(
        `/student/courses/${courseId}/complete`,
      );
    }
    const raw: any = unwrapData(response) ?? {};
    const rawIds = Array.isArray(raw.completedLessonIds)
      ? raw.completedLessonIds
      : Array.isArray(raw.completedLessons)
      ? raw.completedLessons
      : [];
    const completedLessonIds = rawIds.map((id: any) => String(id));
    return {
      courseId: String(raw.courseId ?? courseId),
      status: raw.status ?? "COMPLETED",
      progressPercentage: Number(raw.progressPercentage ?? 100) || 100,
      completedModules: Number(raw.completedModules ?? 0) || 0,
      totalModules: Number(raw.totalModules ?? 0) || 0,
      completedLessons:
        typeof raw.completedLessons === "number"
          ? raw.completedLessons
          : completedLessonIds.length,
      totalLessons: Number(raw.totalLessons ?? 0) || 0,
      completedLessonIds,
    };
  },

  /**
   * Search courses using POST /courses/searchfilters
   * Supports keyword search / auto-suggestion and category filtering
   */
  async searchCoursesFilters(params: {
    keyword?: string;
    categoryIds?: string[];
    page?: number;
    size?: number;
    sortBy?: string;
  }): Promise<{
    courses: CourseDTO[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }> {
    const payload: Record<string, any> = {
      page: params.page ?? 0,
      size: params.size ?? 10,
      sortBy: params.sortBy || "latest",
    };
    if (params.keyword?.trim()) {
      payload.keyword = params.keyword.trim();
    }
    if (params.categoryIds && params.categoryIds.length > 0) {
      payload.categoryIds = params.categoryIds;
    }

    try {
      const response = await apiClient.post<any>("/courses/searchfilters", payload);
      const data = unwrapData(response) || response.data || response;
      const rawCourses: CourseDTO[] = Array.isArray(data?.courses)
        ? data.courses
        : Array.isArray(data)
        ? data
        : [];

      // Filter to KIDS courses when in kidz portal
      const kidsCourses = rawCourses.filter(
        (c) => !c.learningSector || (c.learningSector || "").toUpperCase() === "KIDS"
      );

      return {
        courses: kidsCourses.length > 0 ? kidsCourses : rawCourses,
        page: data?.page ?? 0,
        size: data?.size ?? payload.size,
        totalElements: data?.totalElements ?? kidsCourses.length,
        totalPages: data?.totalPages ?? 1,
      };
    } catch (err) {
      console.warn("Failed to search courses with /courses/searchfilters:", err);
      return {
        courses: [],
        page: 0,
        size: payload.size,
        totalElements: 0,
        totalPages: 0,
      };
    }
  },
};
