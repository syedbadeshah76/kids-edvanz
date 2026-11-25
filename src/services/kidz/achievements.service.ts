import { apiClient, DEFAULT_TENANT_ID, unwrapData } from "@/lib/kidz/kidz-api-client";
import type {
  CourseAchievementDTO,
  StudentAchievementsResponse,
} from "@/types/kidz/api.types";

/**
 * Resolves the active student ID from auth localStorage or parameters.
 */
function resolveCurrentStudentId(explicitId?: string): string {
  if (explicitId && typeof explicitId === "string" && explicitId.trim()) {
    return explicitId.trim();
  }

  try {
    const rawUser = localStorage.getItem("Edvanz_user");
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id) return String(parsed.id);
      if (parsed?.userId) return String(parsed.userId);
    }
  } catch {
    /* ignore parse errors */
  }

  return (
    localStorage.getItem("studentId") ||
    localStorage.getItem("userId") ||
    ""
  );
}

export const achievementsService = {
  /**
   * Fetches student course achievements and summary counts.
   * Primary route: GET /api/student/courses/acheivements (preserve misspelled route)
   * Fallback route: GET /api/student/courses/achievements (in case route is corrected)
   *
   * Required headers:
   *   X-Tenant-Id: <tenant UUID>
   *   X-Student-Id: <student UUID>
   */
  async getStudentAchievements(studentId?: string): Promise<StudentAchievementsResponse> {
    const tenantId = localStorage.getItem("tenantId") || DEFAULT_TENANT_ID;
    const resolvedStudentId = resolveCurrentStudentId(studentId);

    const headers: Record<string, string> = {
      "X-Tenant-Id": tenantId,
    };
    if (resolvedStudentId) {
      headers["X-Student-Id"] = resolvedStudentId;
    }

    let rawData: any;

    try {
      // 1. Attempt primary backend route (misspelled per contract: /acheivements)
      const response = await apiClient.get<any>("/student/courses/acheivements", {
        headers,
      });
      rawData = unwrapData<any>(response);
    } catch (err: any) {
      // 2. If 404, gracefully fallback to the correctly spelled /achievements route
      if (err?.response?.status === 404) {
        try {
          const fallbackResponse = await apiClient.get<any>("/student/courses/achievements", {
            headers,
          });
          rawData = unwrapData<any>(fallbackResponse);
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      } else {
        throw err;
      }
    }

    // 3. Normalize and sanitize response data safely
    const rawAchievements = Array.isArray(rawData?.achievements)
      ? rawData.achievements
      : [];

    const achievements: CourseAchievementDTO[] = rawAchievements.map((item: any) => ({
      courseId: String(item.courseId || item.id || ""),
      courseTitle: String(item.courseTitle || item.title || "Untitled Course"),
      thumbnailUrl: item.thumbnailUrl ?? item.thumbnail ?? null,
      progressPercentage: Math.max(0, Math.min(100, Math.round(Number(item.progressPercentage ?? 0)))),
      badgeLevel: String(item.badgeLevel || "BRONZE").toUpperCase(),
      completed: Boolean(item.completed || Number(item.progressPercentage ?? 0) >= 100),
    }));

    return {
      courseCount: Number(rawData?.courseCount ?? achievements.length),
      passedTestCount: Number(rawData?.passedTestCount ?? 0),
      liveCourseCount: Number(rawData?.liveCourseCount ?? 0),
      recordedCourseCount: Number(rawData?.recordedCourseCount ?? 0),
      longestStreak: rawData?.longestStreak != null ? Number(rawData.longestStreak) : undefined,
      totalXp: rawData?.totalXp != null ? Number(rawData.totalXp) : undefined,
      achievements,
    };
  },
};
