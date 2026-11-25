import type { BadgeDTO, StudentAchievementsResponse } from "@/types/kidz/api.types";
import { achievementsService } from "./achievements.service";

export { achievementsService };

export const badgesService = {
  /**
   * Legacy badge method for backward compatibility
   */
  async getStudentBadges(): Promise<BadgeDTO[]> {
    return [];
  },

  /**
   * Course achievements integration
   */
  async getStudentAchievements(studentId?: string): Promise<StudentAchievementsResponse> {
    return achievementsService.getStudentAchievements(studentId);
  },
};
