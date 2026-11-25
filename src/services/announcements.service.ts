// src/services/announcements.service.ts
// ============= Instructor Announcements Service (backend-ready) =============
// Contract:
//   POST   /api/course_announcements/course/{courseId}   -> create
//   GET    /api/course_announcements/course/{courseId}   -> list by course
//   GET    /api/course_announcements/{announcementId}    -> get by id
//   PUT    /api/course_announcements/{announcementId}    -> update
//   POST   /api/course_announcements/{announcementId}/delete -> delete
import { apiClient } from "@/lib/api-client";
import { coursesService } from "@/services/courses.service";
import { instructorService } from "@/services/instructor.service";
import type { ApiResponse } from "@/types/api.types";
import type {
  Announcement,
  AnnouncementApiResponse,
  CreateAnnouncementRequest,
  EligibleCourseOption,
  UpdateAnnouncementRequest,
} from "@/types/announcement.types";
import { deriveTitle } from "@/lib/announcement.utils";

const unwrap = <T,>(res: unknown): T => {
  if (res && typeof res === "object" && "data" in (res as Record<string, unknown>)) {
    return (res as { data: T }).data;
  }
  return res as T;
};

const toArray = <T,>(value: unknown): T[] => {
  let data = unwrap<unknown>(value);
  if (data && typeof data === "object" && "data" in (data as Record<string, unknown>)) {
    data = (data as Record<string, unknown>).data;
  }
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["content", "items", "announcements", "results", "list"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
};

/** Merge raw backend announcement with course meta for the UI */
export const mapAnnouncement = (
  raw: AnnouncementApiResponse,
  course?: EligibleCourseOption,
): Announcement => {
  const content =
    raw.htmlContent ?? (raw as any).content ?? (raw as any).message ?? "";
  const title =
    (raw as any).title ||
    deriveTitle(content) ||
    "Announcement";

  const studentCount =
    Number(
      raw.totalStudents ??
      raw.total_students ??
      raw.studentCount ??
      raw.studentsCount ??
      (raw as any).totalEnrolled ??
      (raw as any).enrolledStudents ??
      course?.studentCount ??
      0
    ) || 0;

  return {
    id: raw.id,
    htmlContent: content,
    title,
    courseId: raw.courseId,
    courseName: course?.courseName ?? "Course",
    courseType: course?.courseType ?? "recorded",
    studentCount,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    status: "active",
  };
};

const mapEligibleCourse = (c: any): EligibleCourseOption => ({
  courseId: String(c.id ?? c.courseId ?? c.course?.id ?? c.course?.courseId ?? ""),
  courseName: String(c.courseName ?? c.title ?? c.name ?? "Untitled course"),
  courseType:
    String(c.courseType ?? c.type ?? "recorded").toLowerCase().includes("live") ? "live" : "recorded",
  studentCount:
    Number(c.studentCount ?? c.enrolledCount ?? c.totalStudents ?? c.total_students ?? c.students ?? c.studentsCount ?? 0) || 0,
});

export const announcementService = {
  /** Instructor's approved (live + recorded) courses */
  async getEligibleCourses(instructorId?: string): Promise<EligibleCourseOption[]> {
    if (instructorId) {
      try {
        const res = await coursesService.getCourses(
          { instructorId } as any,
          { page: 0, size: 100 } as any,
        );
        const courses = toArray<any>(res)
          .filter((c) => String(c.instructorId ?? c.instructor?.id ?? "") === String(instructorId))
          .map(mapEligibleCourse)
          .filter((c) => c.courseId);

        if (courses.length) return courses;
      } catch {
        // Fall back to instructorService.getCourses() below
      }
    }

    try {
      const res = await instructorService.getCourses();
      return toArray<any>(res).map(mapEligibleCourse).filter((c) => c.courseId);
    } catch {
      return [];
    }
  },

  /** Raw list for a single course */
  async getAnnouncementsByCourse(courseId: string): Promise<AnnouncementApiResponse[]> {
    const res = await apiClient.get<ApiResponse<unknown>>(
      `/course_announcements/course/${courseId}`,
    );
    return toArray<AnnouncementApiResponse>(res);
  },

  /** Alias for getAnnouncementsByCourse */
  async getByCourse(courseId: string): Promise<AnnouncementApiResponse[]> {
    return this.getAnnouncementsByCourse(courseId);
  },

  /** Aggregated feed across every eligible course, newest first */
  async getAnnouncements(courses?: EligibleCourseOption[]): Promise<Announcement[]> {
    const eligible = courses?.length ? courses : await this.getEligibleCourses();
    if (!eligible.length) return [];

    const results = await Promise.all(
      eligible.map(async (course) => {
        try {
          const raws = await this.getAnnouncementsByCourse(course.courseId);
          return raws.map((raw) => mapAnnouncement(raw, course));
        } catch {
          return [] as Announcement[];
        }
      }),
    );

    return results
      .flat()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getAnnouncementById(announcementId: string): Promise<AnnouncementApiResponse> {
    const res = await apiClient.get<ApiResponse<AnnouncementApiResponse>>(
      `/course_announcements/${announcementId}`,
    );
    return unwrap<AnnouncementApiResponse>(res);
  },

  async createAnnouncement(
    payload: CreateAnnouncementRequest,
  ): Promise<AnnouncementApiResponse> {
    const res = await apiClient.post<ApiResponse<AnnouncementApiResponse>>(
      `/course_announcements/course/${payload.courseId}`,
      { htmlContent: payload.htmlContent },
    );
    return unwrap<AnnouncementApiResponse>(res);
  },

  async updateAnnouncement(
    announcementId: string,
    payload: UpdateAnnouncementRequest,
  ): Promise<AnnouncementApiResponse> {
    const res = await apiClient.put<ApiResponse<AnnouncementApiResponse>>(
      `/course_announcements/${announcementId}`,
      { htmlContent: payload.htmlContent },
    );
    return unwrap<AnnouncementApiResponse>(res);
  },

  async deleteAnnouncement(announcementId: string): Promise<{ id: string }> {
    await apiClient.delete(`/course_announcements/${announcementId}`);
    return { id: announcementId };
  },
};

export default announcementService;
