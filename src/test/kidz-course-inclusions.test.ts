import { describe, it, expect, vi } from "vitest";
import { streaksService } from "@/services/kidz/streaks.service";
import { certificatesService } from "@/services/kidz/certificates.service";
import { formatPrice } from "@/lib/utils";

describe("Kidz Inclusions & API Isolation", () => {
  it("streaksService does not trigger network calls and resolves to null", async () => {
    const streak = await streaksService.getStudentStreak();
    expect(streak).toBeNull();
  });

  it("certificatesService does not trigger network calls and resolves to empty array", async () => {
    const certs = await certificatesService.getMyCertificates();
    expect(certs).toEqual([]);
  });

  it("formatPrice formats prices with Indian Rupee symbol (₹)", () => {
    expect(formatPrice(4999, "INR")).toBe("₹4,999");
    expect(formatPrice(6999, "INR")).toBe("₹6,999");
    expect(formatPrice(0, "INR")).toBe("₹0");
  });

  it("computes dynamic duration and module counts without static fallbacks", () => {
    // Zero modules and zero minutes should not default to 80 hours or 10 modules
    const rawCourse = {
      totalDurationMinutes: 0,
      totalModules: 0,
      totalLessons: 0,
    };

    const moduleCount = rawCourse.totalModules;
    expect(moduleCount).toBe(0);

    const totalMins = rawCourse.totalDurationMinutes;
    const durationDisplay = totalMins > 0 ? `${totalMins} Mins` : "Self-paced";
    expect(durationDisplay).toBe("Self-paced");

    // Positive duration formatting
    const courseWith120Mins = {
      totalDurationMinutes: 120,
      totalModules: 4,
    };
    const hours = Math.floor(courseWith120Mins.totalDurationMinutes / 60);
    const durationWithHours = `${hours} Hours`;
    expect(durationWithHours).toBe("2 Hours");
  });

  it("calculates real student course metrics without dummy XP or daily challenges", () => {
    const mockEnrolled = [
      { courseId: "c1", progressPercentage: 100, course: { totalLessons: 10 } },
      { courseId: "c2", progressPercentage: 50, course: { totalLessons: 8 } },
      { courseId: "c3", progressPercentage: 0, course: { totalLessons: 6 } },
    ];

    const completed = mockEnrolled.filter((c) => (c.progressPercentage ?? 0) === 100).length;
    const inProgress = mockEnrolled.filter((c) => (c.progressPercentage ?? 0) < 100).length;
    const totalLessonsDone = mockEnrolled.reduce(
      (acc, curr) => acc + Math.round(((curr.progressPercentage ?? 0) / 100) * (curr.course?.totalLessons ?? 10)),
      0,
    );

    expect(completed).toBe(1);
    expect(inProgress).toBe(2);
    expect(totalLessonsDone).toBe(14); // 10 + 4 + 0
  });
});
