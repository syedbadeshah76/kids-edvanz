import { describe, it, expect, vi, beforeEach } from "vitest";
import { practiceTestService } from "@/services/practiceTest/practiceTestService";
import quizService from "@/services/quiz.service";

describe("Practice Test Back Navigation & Attempt Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  describe("Active Attempt Management in practiceTestService", () => {
    it("stores and retrieves active attempt ID for a test", () => {
      const testId = "test-uuid-123";
      const attemptId = "attempt-uuid-456";

      expect(practiceTestService.getActiveAttemptId(testId)).toBeNull();

      practiceTestService.setActiveAttemptId(testId, attemptId);
      expect(practiceTestService.getActiveAttemptId(testId)).toBe(attemptId);

      practiceTestService.clearActiveAttemptId(testId);
      expect(practiceTestService.getActiveAttemptId(testId)).toBeNull();
    });

    it("returns null if the stored attempt has already been COMPLETED", () => {
      const testId = "test-uuid-123";
      const attemptId = "attempt-uuid-456";

      practiceTestService.setActiveAttemptId(testId, attemptId);
      localStorage.setItem(
        `edvanz.pt.attempt.${attemptId}`,
        JSON.stringify({
          attemptId,
          testId,
          status: "COMPLETED",
          startedAt: new Date().toISOString(),
          durationMinutes: 45,
          questions: [],
          answers: [],
        })
      );

      const activeId = practiceTestService.getActiveAttemptId(testId);
      expect(activeId).toBeNull();
    });

    it("returns active attempt ID when attempt is IN_PROGRESS and within duration", () => {
      const testId = "test-uuid-123";
      const attemptId = "attempt-uuid-456";

      practiceTestService.setActiveAttemptId(testId, attemptId);
      localStorage.setItem(
        `edvanz.pt.attempt.${attemptId}`,
        JSON.stringify({
          attemptId,
          testId,
          status: "IN_PROGRESS",
          startedAt: new Date().toISOString(),
          durationMinutes: 45,
          questions: [],
          answers: [],
        })
      );

      const activeId = practiceTestService.getActiveAttemptId(testId);
      expect(activeId).toBe(attemptId);
    });
  });

  describe("Attempt History mapping with in-progress vs completed attempts", () => {
    it("preserves IN_PROGRESS status without forcing it to FAIL", async () => {
      const testId = "11111111-1111-1111-1111-111111111111";
      vi.spyOn(quizService, "getAttemptHistory").mockResolvedValue([
        {
          attemptId: "att-1",
          attemptNumber: 1,
          score: 80,
          maxScore: 100,
          percentage: 80,
          passed: true,
          status: "SUBMITTED",
          startedAt: "2026-10-24T10:00:00Z",
          submittedAt: "2026-10-24T10:30:00Z",
        },
        {
          attemptId: "att-2",
          attemptNumber: 2,
          score: 0,
          maxScore: 0,
          percentage: 0,
          passed: false,
          status: "IN_PROGRESS",
          startedAt: "2026-10-24T11:00:00Z",
          submittedAt: null,
        },
      ]);

      const history = await practiceTestService.getAttemptHistory(testId);
      expect(history).toHaveLength(2);

      // Attempt 1 should be PASS
      expect(history[0].status).toBe("PASS");
      expect(history[0].scorePercentage).toBe(80);

      // Attempt 2 should be IN_PROGRESS, NOT FAIL!
      expect(history[1].status).toBe("IN_PROGRESS");
    });
  });

  describe("Attempt Counting Logic", () => {
    it("completed attempts count only includes PASS and FAIL, not IN_PROGRESS", () => {
      const history = [
        { attemptId: "1", attemptDate: "", scorePercentage: 80, status: "PASS" },
        { attemptId: "2", attemptDate: "", scorePercentage: 0, status: "IN_PROGRESS" },
      ];

      const completed = history.filter((h) => h.status === "PASS" || h.status === "FAIL");
      expect(completed).toHaveLength(1);
    });
  });
});
