import type { StreakDTO } from "@/types/kidz/api.types";

export const streaksService = {
  /**
   * Streak API is not available on the Kidz platform.
   * Return null immediately without triggering unnecessary network requests or console errors.
   */
  async getStudentStreak(): Promise<StreakDTO | null> {
    return null;
  },
};

