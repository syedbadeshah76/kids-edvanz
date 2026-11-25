import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type { DemoClassDTO } from "@/types/kidz/api.types";

export const demoClassService = {
  /**
   * Fetch public upcoming demo classes
   */
  async getDemoClasses(): Promise<DemoClassDTO[]> {
    const response = await apiClient.get<DemoClassDTO[]>("/catalog/demo-classes");
    return unwrapArray<DemoClassDTO>(response);
  },

  /**
   * Book a seat in a demo class
   */
  async bookDemoClass(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.post<{ success: boolean; message?: string }>(
      `/demo-classes/${id}/book`,
    );
    return unwrapData(response);
  },

  /**
   * Get meeting join URL for a booked demo class
   */
  async getJoinLink(id: string): Promise<{ meetingJoinUrl: string; joinUrl?: string }> {
    const response = await apiClient.get<{ meetingJoinUrl: string; joinUrl?: string }>(
      `/demo-classes/${id}/join`,
    );
    return unwrapData(response);
  },
};
