import { describe, it, expect, vi, beforeEach } from "vitest";
import { demoClassService } from "@/services/demoClass.service";
import { apiClient } from "@/lib/api-client";
import { liveCoursesService } from "@/services/liveCourses.service";

describe("Kidz Live Course Book a Demo Flow & APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("fetches demo classes for a live course using GET /api/demo-classes/course/{courseId}", async () => {
    const mockDemos = [
      {
        id: "demo-1",
        courseId: "live-math-1",
        title: "Free Math Demo Session",
        description: "Interactive session on algebra and puzzles",
        scheduledStartAt: "2026-11-01T10:00:00Z",
        scheduledEndAt: "2026-11-01T11:30:00Z",
        durationMinutes: 90,
        meetingPlatform: "ZOOM",
        meetingLink: "https://zoom.us/j/123456789",
        booked: false,
      },
    ];

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: mockDemos,
    } as any);

    const result = await demoClassService.getDemoClassesByCourse("live-math-1");

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith("/demo-classes/course/live-math-1");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Free Math Demo Session");
  });

  it("handles empty demo classes gracefully when instructor has not scheduled any", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: [],
    } as any);
    vi.spyOn(demoClassService, "getCatalogDemoClasses").mockResolvedValueOnce([] as any);

    const result = await demoClassService.getDemoClassesByCourse("45a021a1-9849-440c-a9ee-e86ca72b8f00");

    expect(getSpy).toHaveBeenCalledWith("/demo-classes/course/45a021a1-9849-440c-a9ee-e86ca72b8f00");
    expect(result).toEqual([]);
  });

  it("books a free demo class using POST /api/demo-classes/{demoClassId}/book", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      data: {
        success: true,
        message: "Demo class booked successfully.",
        bookingId: "bk-123",
      },
    } as any);

    const result = await demoClassService.bookDemoClass("demo-1");

    expect(postSpy).toHaveBeenCalledTimes(1);
    expect(postSpy).toHaveBeenCalledWith("/demo-classes/demo-1/book", {});
    expect(result.message).toBe("Demo class booked successfully.");
  });

  it("joins a live demo class using GET /api/demo-classes/{demoClassId}/join", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: {
        joinUrl: "https://zoom.us/j/123456789?pwd=test",
        meetingPassword: "test",
      },
    } as any);

    const result = await demoClassService.joinDemoClass("demo-1");

    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith("/demo-classes/demo-1/join");
    expect(result.joinUrl).toContain("zoom.us");
  });

  it("validates demo classes filter prevents using courseId as demoClassId", () => {
    const courseId = "45a021a1-9849-440c-a9ee-e86ca72b8f00";
    const rawDemoClasses = [
      { id: courseId, courseId, title: "Invalid Fallback" },
      { id: "real-demo-uuid-1", courseId, title: "Real Demo Session" },
    ];

    const valid = rawDemoClasses.filter((d) => d && d.id && d.id !== courseId);
    expect(valid).toHaveLength(1);
    expect(valid[0].id).toBe("real-demo-uuid-1");
  });

  it("returns live courses with schedule=null in getInstructorLiveCourses for dropdown selection", async () => {
    const mockLiveCourses = [
      {
        id: "45a021a1-9849-440c-a9ee-e86ca72b8f00",
        title: "Srikant sir Maths class",
        instructorId: "b8850048-9ba2-4de7-aa59-9f2ca4854548",
        learningSector: "KIDS",
        schedule: null,
        status: "PUBLISHED",
      },
    ];

    vi.spyOn(liveCoursesService, "list").mockResolvedValueOnce(mockLiveCourses);

    const user = {
      id: "353cf165-6301-4562-9806-f689a7334de4",
      email: "srikant@example.com",
      learningSector: "KIDS",
    };

    const courses = await demoClassService.getInstructorLiveCourses(user);

    expect(courses).toHaveLength(1);
    expect(courses[0].id).toBe("45a021a1-9849-440c-a9ee-e86ca72b8f00");
    expect(courses[0].title).toBe("Srikant sir Maths class");
  });

  it("enforces learning sector isolation in getInstructorLiveCourses", async () => {
    const mockLiveCourses = [
      {
        id: "kids-live-1",
        title: "Kids Coding Adventure",
        instructorId: "inst-1",
        learningSector: "KIDS",
        schedule: null,
      },
      {
        id: "it-live-1",
        title: "React DevOps Masterclass",
        instructorId: "inst-1",
        learningSector: "IT",
        schedule: null,
      },
    ];

    vi.spyOn(liveCoursesService, "list").mockResolvedValueOnce(mockLiveCourses);

    const kidsUser = {
      id: "inst-1",
      learningSector: "KIDS",
    };

    const courses = await demoClassService.getInstructorLiveCourses(kidsUser);

    expect(courses).toHaveLength(1);
    expect(courses[0].id).toBe("kids-live-1");
    expect(courses[0].title).toBe("Kids Coding Adventure");
  });
});
