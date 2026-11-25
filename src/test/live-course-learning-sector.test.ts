import { describe, it, expect, vi, beforeEach } from "vitest";
import { liveCoursesService } from "@/services/liveCourses.service";
import { apiClient } from "@/lib/api-client";

describe("Live Course learningSector creation flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("passes learningSector='KIDS' in payload and X-User-Learning-Sector header during live course creation", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { id: "live-kids-123", title: "Coding for Kids" },
    } as any);

    const payload = {
      title: "Coding for Kids",
      slug: "coding-for-kids",
      description: "Kids programming cohort",
      categoryId: "cat-kids-1",
      language: "English",
      level: "BEGINNER",
      learningSector: "KIDS" as const,
    };

    const result = await liveCoursesService.create(payload);

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, sentPayload, config] = postSpy.mock.calls[0];
    expect(url).toBe("/live-courses");
    expect(sentPayload.learningSector).toBe("KIDS");
    expect(result).toEqual({ id: "live-kids-123", title: "Coding for Kids" });
  });

  it("passes learningSector='IT' in payload and X-User-Learning-Sector header during live course creation", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: { id: "live-it-456", title: "Advanced Kubernetes" },
    } as any);

    const payload = {
      title: "Advanced Kubernetes",
      slug: "advanced-kubernetes",
      description: "Cloud native live sessions",
      categoryId: "cat-it-1",
      language: "English",
      level: "ADVANCED",
      learningSector: "IT" as const,
    };

    const result = await liveCoursesService.create(payload);

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, sentPayload, config] = postSpy.mock.calls[0];
    expect(url).toBe("/live-courses");
    expect(sentPayload.learningSector).toBe("IT");
    expect(result).toEqual({ id: "live-it-456", title: "Advanced Kubernetes" });
  });

  it("passes learningSector in updateBasicInfo and sets X-User-Learning-Sector header", async () => {
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({
      data: { id: "live-kids-123", success: true },
    } as any);

    await liveCoursesService.updateBasicInfo("live-kids-123", {
      title: "Updated Kids Coding",
      categoryId: "cat-kids-2",
      learningSector: "KIDS",
    });

    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [url, sentPayload, config] = patchSpy.mock.calls[0];
    expect(url).toBe("/live-courses/live-kids-123/basic-info");
    expect(sentPayload.learningSector).toBe("KIDS");
  });

  it("passes learningSector in createFullLiveCourse flow", async () => {
    const createSpy = vi.spyOn(liveCoursesService, "create").mockResolvedValue({
      id: "live-orch-789",
    } as any);
    vi.spyOn(liveCoursesService, "upsertSchedule").mockResolvedValue({ success: true } as any);
    const updateBasicSpy = vi.spyOn(liveCoursesService, "updateBasicInfo").mockResolvedValue({ success: true } as any);
    vi.spyOn(liveCoursesService, "upsertPricing").mockResolvedValue({ success: true } as any);
    vi.spyOn(liveCoursesService, "submit").mockResolvedValue({ success: true } as any);

    await liveCoursesService.createFullLiveCourse({
      courseType: "LIVE",
      title: "Full Kids Math Bootcamp",
      description: "Fun math live sessions",
      categoryId: "cat-math",
      learningSector: "KIDS",
      meetingPlatform: "ZOOM",
      timezone: "UTC",
      startDate: "2026-11-01",
      endDate: "2026-12-01",
      durationValue: 4,
      durationUnit: "WEEKS",
      sessionDays: ["MON", "WED"],
      startTime: "10:00",
      endTime: "11:00",
      sessionDurationMinutes: 60,
      maximumSeats: 25,
      enableWaitingList: true,
      recordSessions: true,
      attendanceRequired: true,
      enableLiveChat: true,
      accessType: "PAID",
      basePrice: 1999,
      discountedPrice: 1499,
      visibility: "PUBLIC",
    });

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy.mock.calls[0][0].learningSector).toBe("KIDS");

    expect(updateBasicSpy).toHaveBeenCalledTimes(1);
    expect(updateBasicSpy.mock.calls[0][1].learningSector).toBe("KIDS");
  });
});
