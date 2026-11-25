import { describe, it, expect, vi, beforeEach } from "vitest";
import { kidzPreferenceService } from "@/services/kidz/preference.service";
import { apiClient } from "@/lib/kidz/kidz-api-client";

vi.mock("@/lib/kidz/kidz-api-client", () => {
  const mockApiClient = {
    get: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  };
  return {
    apiClient: mockApiClient,
    unwrapData: vi.fn((res) => {
      if (res && typeof res === "object" && "data" in res) {
        return (res as any).data;
      }
      return res;
    }),
  };
});

describe("Kidz Preferences Service (/api/kids/preference)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches preferences from /kids/preference and maps keys correctly", async () => {
    const mockBackendResponse = {
      liveClassReminder: true,
      dailyChallengeNudge: false,
      weeklyReport: true,
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockBackendResponse);

    const prefs = await kidzPreferenceService.getPreferences();

    expect(apiClient.get).toHaveBeenCalledWith("/kids/preference");
    expect(prefs).toEqual({
      liveClassReminder: true,
      dailyChallengeNudge: false,
      weeklyReport: true,
    });
  });

  it("handles envelope-wrapped response { success: true, data: { ... } }", async () => {
    const mockEnvelope = {
      success: true,
      data: {
        liveClassReminder: false,
        dailyChallengeNudge: true,
        weeklyReport: false,
      },
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockEnvelope);

    const prefs = await kidzPreferenceService.getPreferences();

    expect(apiClient.get).toHaveBeenCalledWith("/kids/preference");
    expect(prefs).toEqual({
      liveClassReminder: false,
      dailyChallengeNudge: true,
      weeklyReport: false,
    });
  });

  it("updates preferences via PUT /kids/preference with correct payload", async () => {
    const payload = {
      liveClassReminder: false,
      dailyChallengeNudge: true,
      weeklyReport: true,
    };

    vi.mocked(apiClient.put).mockResolvedValueOnce({
      data: payload,
    });

    const res = await kidzPreferenceService.updatePreferences(payload);

    expect(apiClient.put).toHaveBeenCalledWith("/kids/preference", {
      liveClassReminder: false,
      dailyChallengeNudge: true,
      weeklyReport: true,
    });
    expect(res).toEqual(payload);
  });

  it("falls back to PATCH when PUT returns 405 Method Not Allowed", async () => {
    const payload = {
      liveClassReminder: true,
      dailyChallengeNudge: true,
      weeklyReport: true,
    };

    const err405 = { response: { status: 405 } };
    vi.mocked(apiClient.put).mockRejectedValueOnce(err405);
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: payload });

    const res = await kidzPreferenceService.updatePreferences(payload);

    expect(apiClient.put).toHaveBeenCalledWith("/kids/preference", payload);
    expect(apiClient.patch).toHaveBeenCalledWith("/kids/preference", payload);
    expect(res).toEqual(payload);
  });
});
