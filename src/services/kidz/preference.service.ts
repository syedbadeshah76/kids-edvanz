import { apiClient, unwrapData } from "@/lib/kidz/kidz-api-client";

export interface KidzPreferences {
  liveClassReminder: boolean;
  dailyChallengeNudge: boolean;
  weeklyReport: boolean;
}

export const kidzPreferenceService = {
  /**
   * Fetch Kidz notification/preferences
   * GET /api/kids/preference
   */
  async getPreferences(): Promise<KidzPreferences> {
    try {
      const response = await apiClient.get<unknown>("/kids/preference");
      const data = unwrapData<any>(response);

      return {
        liveClassReminder: Boolean(data?.liveClassReminder ?? data?.liveClassReminders ?? true),
        dailyChallengeNudge: Boolean(data?.dailyChallengeNudge ?? true),
        weeklyReport: Boolean(data?.weeklyReport ?? data?.weeklyParentReport ?? true),
      };
    } catch (error) {
      console.warn("Could not fetch kidz preferences from backend, using defaults:", error);
      return {
        liveClassReminder: true,
        dailyChallengeNudge: true,
        weeklyReport: true,
      };
    }
  },

  /**
   * Update Kidz notification/preferences
   * PUT /api/kids/preference (with PATCH/POST fallbacks)
   */
  async updatePreferences(payload: Partial<KidzPreferences>): Promise<KidzPreferences> {
    const body: KidzPreferences = {
      liveClassReminder: payload.liveClassReminder ?? true,
      dailyChallengeNudge: payload.dailyChallengeNudge ?? true,
      weeklyReport: payload.weeklyReport ?? true,
    };

    let response: any;
    try {
      response = await apiClient.put<unknown>("/kids/preference", body);
    } catch (putErr: any) {
      if (putErr?.response?.status === 405) {
        try {
          response = await apiClient.patch<unknown>("/kids/preference", body);
        } catch {
          response = await apiClient.post<unknown>("/kids/preference", body);
        }
      } else {
        throw putErr;
      }
    }

    const data = unwrapData<any>(response);
    return {
      liveClassReminder: Boolean(data?.liveClassReminder ?? body.liveClassReminder),
      dailyChallengeNudge: Boolean(data?.dailyChallengeNudge ?? body.dailyChallengeNudge),
      weeklyReport: Boolean(data?.weeklyReport ?? body.weeklyReport),
    };
  },
};

export default kidzPreferenceService;
