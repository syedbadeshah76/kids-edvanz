import { describe, it, expect, vi, beforeEach } from "vitest";
import { coursesService } from "@/services/kidz/courses.service";
import { apiClient } from "@/lib/kidz/kidz-api-client";
import { isCourseFree, normalizeLevel } from "@/pages/kidz/KidzExplore";

describe("Kidz Explore Course Type Selection & API Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getRecordedCourses hits /public/courses with page=0, size=50, learningSector=KIDS and filters to KIDS", async () => {
    const mockRecordedData = [
      {
        id: "rec-1",
        title: "Coding for Kids",
        learningSector: "KIDS",
        level: "BEGINNER",
        price: 0,
      },
      {
        id: "rec-2",
        title: "Spring Boot Microservices",
        learningSector: "IT",
        level: "ADVANCED",
        discountedPrice: 4999,
      },
      {
        id: "rec-3",
        title: "Math Fun",
        learningSector: "KIDS",
        level: "INTERMEDIATE",
        discountedPrice: 499,
      },
    ];

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: mockRecordedData,
    } as any);

    const result = await coursesService.getRecordedCourses({ page: 0, size: 50 });

    expect(getSpy).toHaveBeenCalledTimes(1);
    const calledUrl = getSpy.mock.calls[0][0];
    expect(calledUrl).toContain("/public/courses");
    expect(calledUrl).toContain("page=0");
    expect(calledUrl).toContain("size=50");
    expect(calledUrl).toContain("learningSector=KIDS");
    // Strictly filters out IT courses
    expect(result).toHaveLength(2);
    expect(result.map(c => c.title)).toEqual(["Coding for Kids", "Math Fun"]);
  });

  it("getLiveCourses hits /catalog/live-courses with status=PUBLISHED, learningSector=KIDS and filters out IT courses", async () => {
    const mockLiveData = [
      {
        id: "live-1",
        title: "Advance Power Bi",
        learningSector: "IT",
        status: "PUBLISHED",
        level: "INTERMEDIATE",
        discountedPrice: 641.99,
        accessType: "PAID",
      },
      {
        id: "live-2",
        title: "LIVE KIDZ Course",
        learningSector: "KIDS",
        status: "PUBLISHED",
        level: "BEGINNER",
        accessType: "PAID",
      },
      {
        id: "live-3",
        title: "Robotics and Scratch Game Building for Kids",
        learningSector: "KIDS",
        status: "PUBLISHED",
        level: "BEGINNER",
        accessType: "PAID",
      },
      {
        id: "live-4",
        title: "React Live by badshah",
        learningSector: "IT",
        status: "PUBLISHED",
        level: "ADVANCED",
        accessType: "PAID",
      },
    ];

    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      data: mockLiveData,
    } as any);

    const result = await coursesService.getLiveCourses({
      status: "PUBLISHED",
      learningSector: "KIDS",
    });

    expect(getSpy).toHaveBeenCalledTimes(1);
    const calledUrl = getSpy.mock.calls[0][0];
    expect(calledUrl).toBe(
      "/catalog/live-courses?status=PUBLISHED&learningSector=KIDS",
    );
    // Strictly filters out IT live courses, returning only KIDS live courses
    expect(result).toHaveLength(2);
    expect(result.map(c => c.title)).toEqual([
      "LIVE KIDZ Course",
      "Robotics and Scratch Game Building for Kids",
    ]);
    expect(result.every(c => c.learningSector === "KIDS")).toBe(true);
  });

  it("isCourseFree accurately detects free vs paid courses for both models", () => {
    // Free variations
    expect(isCourseFree({ isFree: true })).toBe(true);
    expect(isCourseFree({ accessType: "FREE" })).toBe(true);
    expect(isCourseFree({ discountedPrice: 0 })).toBe(true);
    expect(isCourseFree({ price: 0 })).toBe(true);
    expect(isCourseFree({ basePrice: 0 })).toBe(true);
    expect(isCourseFree({ originalPrice: 0, discountedPrice: null })).toBe(true);

    // Paid / Premium variations
    expect(isCourseFree({ accessType: "PAID", discountedPrice: 641.99 })).toBe(false);
    expect(isCourseFree({ accessType: "PAID", originalPrice: 99.99, discountedPrice: null })).toBe(false);
    expect(isCourseFree({ price: 4999, isFree: false })).toBe(false);
    expect(isCourseFree({ discountedPrice: 49.99 })).toBe(false);
  });

  it("normalizeLevel converts raw and enum strings to standard levels", () => {
    expect(normalizeLevel("BEGINNER")).toBe("Beginner");
    expect(normalizeLevel("beginner")).toBe("Beginner");
    expect(normalizeLevel("INTERMEDIATE")).toBe("Intermediate");
    expect(normalizeLevel("ADVANCED")).toBe("Advanced");
    expect(normalizeLevel(undefined)).toBe("Beginner");
    expect(normalizeLevel("MID_LEVEL")).toBe("Intermediate");
  });
});
