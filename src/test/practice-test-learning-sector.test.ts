import { describe, it, expect, vi, beforeEach } from "vitest";
import { instructorService } from "@/services/instructor.service";
import { instructorPracticeTestService } from "@/services/instructor-practice-test.service";
import quizService from "@/services/quiz.service";
import { apiClient } from "@/lib/api-client";

describe("Practice Test Learning Sector Flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("instructorService.getMyCourses", () => {
    it("passes learningSector in query and X-User-Learning-Sector header when requested for IT", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({
        success: true,
        data: [{ id: "c-it-1", title: "IT Course", learningSector: "IT" }],
      } as any);

      await instructorService.getMyCourses({ page: 0, size: 100 }, "IT");

      expect(getSpy).toHaveBeenCalledTimes(1);
      const [url, config] = getSpy.mock.calls[0];
      expect(url).toContain("/courses");
      expect(url).toContain("learningSector=IT");
      expect(config?.headers?.["X-User-Learning-Sector"]).toBe("IT");
    });

    it("passes learningSector in query and X-User-Learning-Sector header when requested for KIDS", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({
        success: true,
        data: [{ id: "c-kids-1", title: "Kids Math", learningSector: "KIDS" }],
      } as any);

      await instructorService.getMyCourses({ page: 0, size: 100 }, "KIDS");

      expect(getSpy).toHaveBeenCalledTimes(1);
      const [url, config] = getSpy.mock.calls[0];
      expect(url).toContain("/courses");
      expect(url).toContain("learningSector=KIDS");
      expect(config?.headers?.["X-User-Learning-Sector"]).toBe("KIDS");
    });
  });

  describe("instructorPracticeTestService.getPracticeTests", () => {
    it("fetches IT practice tests with X-User-Learning-Sector header", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({
        data: [
          { quizId: "q-it-1", title: "Python Test", learningSector: "IT" },
        ],
      } as any);

      const tests = await instructorPracticeTestService.getPracticeTests(0, 10, undefined, "IT");

      expect(getSpy).toHaveBeenCalledTimes(1);
      const [url, config] = getSpy.mock.calls[0];
      expect(url).toBe("/quizzes/practice-tests");
      expect(config?.headers?.["X-User-Learning-Sector"]).toBe("IT");
      expect(tests[0].learningSector).toBe("IT");
      expect(tests[0].id).toBe("q-it-1");
    });

    it("fetches KIDS practice tests with X-User-Learning-Sector header", async () => {
      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({
        data: [
          { quizId: "q-kids-1", title: "Fun Science Test", learningSector: "KIDS" },
        ],
      } as any);

      const tests = await instructorPracticeTestService.getPracticeTests(0, 10, undefined, "KIDS");

      expect(getSpy).toHaveBeenCalledTimes(1);
      const [url, config] = getSpy.mock.calls[0];
      expect(url).toBe("/quizzes/practice-tests");
      expect(config?.headers?.["X-User-Learning-Sector"]).toBe("KIDS");
      expect(tests[0].learningSector).toBe("KIDS");
      expect(tests[0].id).toBe("q-kids-1");
    });

    it("fetches both IT and KIDS practice tests when learningSector is 'ALL'", async () => {
      vi.spyOn(apiClient, "get").mockImplementation((url: string, config?: any) => {
        const sector = config?.headers?.["X-User-Learning-Sector"];
        if (sector === "IT") {
          return Promise.resolve({
            data: [{ quizId: "q-it-all", title: "IT Test", learningSector: "IT" }],
          } as any);
        }
        if (sector === "KIDS") {
          return Promise.resolve({
            data: [{ quizId: "q-kids-all", title: "Kids Test", learningSector: "KIDS" }],
          } as any);
        }
        return Promise.resolve({ data: [] } as any);
      });

      const tests = await instructorPracticeTestService.getPracticeTests(0, 10, undefined, "ALL");

      expect(tests).toHaveLength(2);
      expect(tests.some((t) => t.id === "q-it-all" && t.learningSector === "IT")).toBe(true);
      expect(tests.some((t) => t.id === "q-kids-all" && t.learningSector === "KIDS")).toBe(true);
    });
  });

  describe("quizService.uploadQuestionBank with learningSector", () => {
    it("passes X-User-Learning-Sector header and learningSector param when uploading question bank", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
        data: { message: "Uploaded" },
      } as any);

      const file = new File(["dummy"], "questions.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      await quizService.uploadQuestionBank(file, "c-kids-123", undefined, "KIDS");

      expect(postSpy).toHaveBeenCalledTimes(1);
      const [url, formData, config] = postSpy.mock.calls[0];
      expect(url).toBe("/questionbank/upload");
      expect(config?.params?.courseId).toBe("c-kids-123");
      expect(config?.params?.learningSector).toBe("KIDS");
      expect(config?.headers?.["X-User-Learning-Sector"]).toBe("KIDS");
    });
  });

  describe("quizService.createQuiz with learningSector", () => {
    it("passes learningSector in payload", async () => {
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
        data: { id: "new-quiz-1" },
      } as any);

      await quizService.createQuiz({
        courseId: "course-it-999",
        title: "Database Quiz",
        learningSector: "IT",
      });

      expect(postSpy).toHaveBeenCalledTimes(1);
      const [url, payload] = postSpy.mock.calls[0];
      expect(url).toBe("/quizzes");
      expect((payload as any).learningSector).toBe("IT");
    });
  });
});
