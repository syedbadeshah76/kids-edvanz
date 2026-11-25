import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type { EnrolledCourseDTO, LiveClassDTO } from "@/types/kidz/api.types";

export const liveClassService = {
  /**
   * Get student's enrolled live courses
   */
  async getEnrolledLiveCourses(page = 0, size = 10): Promise<EnrolledCourseDTO[]> {
    const response = await apiClient.get<EnrolledCourseDTO[]>(
      `/student/my-courses?productType=LIVE_COURSE&page=${page}&size=${size}`,
    );
    return unwrapArray<EnrolledCourseDTO>(response);
  },

  /**
   * Get approved scheduled live sessions for student's enrolled courses
   */
  async getStudentLiveClasses(): Promise<any[]> {
    const response = await apiClient.get<any>("/student/live-classes");
    return unwrapArray<any>(response);
  },

  /**
   * Student: Join live class
   * GET /api/live-classes/{liveClassId}/join
   */
  async joinLiveClass(liveClassId: string): Promise<any> {
    const response = await apiClient.get<any>(`/live-classes/${liveClassId}/join`);
    return unwrapData<any>(response);
  },
};
