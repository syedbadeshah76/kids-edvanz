import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type {
  EnrolledCourseDTO,
  EnrollmentAccessCheckDTO,
  FreeEnrollRequest,
} from "@/types/kidz/api.types";

export const enrollmentService = {
  /**
   * Get all courses enrolled by current student
   */
  async getMyEnrollments(productType: "COURSE" | "LIVE_COURSE" = "COURSE", page = 0, size = 100): Promise<EnrolledCourseDTO[]> {
    const response = await apiClient.get<any>(
      `/student/my-courses?productType=${productType}&page=${page}&size=${size}`,
    );
    const rawList = unwrapArray<any>(response);

    return rawList.map((item: any) => {
      const courseId = String(item.courseId || item.id || "");
      const courseObj = {
        id: courseId,
        title: item.title || item.courseTitle || "Course",
        thumbnailUrl: item.thumbnailUrl || item.thumbnail || item.coverImage,
        learningSector: item.learningSector || "KIDS",
        totalLessons: item.totalLessons ?? 0,
        completedLessons: item.completedLessons ?? 0,
        instructorName: item.instructorName || item.instructor?.name || "Instructor",
        level: item.level || "BEGINNER",
        isFree: item.isFree || item.price === 0,
        rating: item.avgRating || item.rating || 4.8,
        enrolledStudentsCount: item.enrolledStudentsCount || item.studentsCount || 100,
        duration: item.duration || (item.totalDurationMinutes ? `${Math.round(item.totalDurationMinutes / 60)}h` : "2h"),
        ...(item.course || {}),
      };

      return {
        enrollmentId: String(item.enrollmentId || item.id || courseId),
        courseId,
        course: courseObj,
        progressPercentage: Number(item.progressPercentage ?? item.progress ?? 0),
        enrolledAt: item.enrolledAt || new Date().toISOString(),
        productType: item.productType || productType,
        ...item,
      } as EnrolledCourseDTO;
    });
  },

  /**
   * Get product access list
   */
  async getAccessProducts(): Promise<string[]> {
    const response = await apiClient.get<string[] | { productIds?: string[] }>("/access/products");
    return unwrapArray<string>(response);
  },

  /**
   * Check if current student has access to a course / product
   */
  async checkAccess(productId: string): Promise<EnrollmentAccessCheckDTO> {
    const response = await apiClient.get<EnrollmentAccessCheckDTO>(`/access/check/${productId}`);
    return unwrapData(response);
  },

  /**
   * Enroll into a free course
   */
  async enrollFree(payload: FreeEnrollRequest): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      "/orders/enroll",
      payload,
    );
    return unwrapData(response);
  },
};
