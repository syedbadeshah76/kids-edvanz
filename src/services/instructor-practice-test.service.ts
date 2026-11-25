import { apiClient } from "@/lib/api-client";

export interface InstructorPracticeTestAnalytics {
  totalTests: number;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
  avgAttemptsPerTest?: number;
  avgAttemptsDelta?: string;
  studentPassRate?: number;
  studentPassRateDelta?: string;
  avgTimePerQuestion?: number;
  avgTimePerQuestionDelta?: string;
}

export interface InstructorPracticeTestItem {
  id: string;
  title: string;
  courseName?: string;
  courseTitle?: string;
  courseId?: string;
  moduleId?: string;
  learningSector?: "IT" | "KIDS";
  questionCount?: number;
  durationMinutes?: number;
  status?: string;
  totalAttempts?: number;
  averageScore?: number;
  passRate?: number;
  avgTimePerQuestion?: number;
}

class InstructorPracticeTestService {
  /** Fetch Analytics using GET /quizzes/practice-tests/analytics */
  async getAnalytics(learningSector?: "IT" | "KIDS" | "ALL"): Promise<InstructorPracticeTestAnalytics> {
    try {
      const headers: Record<string, string> = {};
      const params: Record<string, any> = {};
      if (learningSector && learningSector !== "ALL") {
        headers["X-User-Learning-Sector"] = learningSector;
        params.learningSector = learningSector;
      }
      const res: any = await apiClient
        .get("/quizzes/practice-tests/analytics", {
          params: Object.keys(params).length ? params : undefined,
          headers: Object.keys(headers).length ? headers : undefined,
        })
        .catch(() => null);
      const data = res?.data ?? res ?? {};
      return {
        totalTests: Number(data.totalTests ?? data.totalQuizzes ?? data.totalPracticeTests ?? 0),
        totalAttempts: Number(data.totalAttempts ?? 0),
        averageScore: Number(data.averageScore ?? data.avgScore ?? 0),
        passRate: Number(data.passRate ?? 0),
        avgAttemptsPerTest: Number(data.avgAttemptsPerTest ?? 0),
        avgAttemptsDelta: String(data.avgAttemptsDelta ?? "+0.0"),
        studentPassRate: Number(data.studentPassRate ?? data.passRate ?? 0),
        studentPassRateDelta: String(data.studentPassRateDelta ?? "+0.0%"),
        avgTimePerQuestion: Number(data.avgTimePerQuestion ?? data.avgTimePerQuestionMinutes ?? 0),
        avgTimePerQuestionDelta: String(data.avgTimePerQuestionDelta ?? "0.0 min"),
      };
    } catch {
      return {
        totalTests: 0,
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
      };
    }
  }

  /** Fetch Practice Tests list for a specific sector */
  private async fetchSectorPracticeTests(
    page = 0,
    size = 10,
    courseId?: string,
    sector: "IT" | "KIDS" = "IT"
  ): Promise<InstructorPracticeTestItem[]> {
    let rawQuizzes: any[] = [];
    const headers: Record<string, string> = { "X-User-Learning-Sector": sector };
    const params: Record<string, any> = { page, size, learningSector: sector };

    // 1. Primary endpoint: GET /quizzes/practice-tests?page={page}&size={size}
    try {
      const res: any = await apiClient.get("/quizzes/practice-tests", { params, headers });
      const data = res?.data ?? res;
      if (Array.isArray(data)) rawQuizzes = data;
      else if (Array.isArray(data?.content)) rawQuizzes = data.content;
      else if (Array.isArray(data?.items)) rawQuizzes = data.items;
    } catch {}

    // 2. Fallback if courseId is passed: GET /quizzes/course/{courseId}
    if (!rawQuizzes.length && courseId) {
      try {
        const res: any = await apiClient.get(`/quizzes/course/${courseId}`, { headers });
        const data = res?.data ?? res;
        if (Array.isArray(data)) rawQuizzes = data;
        else if (Array.isArray(data?.content)) rawQuizzes = data.content;
      } catch {}
    }

    // 3. Fallback: GET /quizzes?quizType=PRACTICE
    if (!rawQuizzes.length) {
      try {
        const res: any = await apiClient.get("/quizzes", {
          params: { quizType: "PRACTICE", page, size, learningSector: sector },
          headers,
        });
        const data = res?.data ?? res;
        if (Array.isArray(data)) rawQuizzes = data;
        else if (Array.isArray(data?.content)) rawQuizzes = data.content;
        else if (Array.isArray(data?.items)) rawQuizzes = data.items;
      } catch {}
    }

    return rawQuizzes
      .map((q: any) => {
        const id = String(q.quizId || q.id || q.uuid || "");
        if (!id) return null;
        return {
          id,
          title: String(q.title || "Practice Test"),
          courseName: String(q.courseTitle || q.courseName || q.course?.title || "Course"),
          courseTitle: String(q.courseTitle || q.courseName || q.course?.title || "Course"),
          courseId: String(q.courseId || q.course?.id || ""),
          moduleId: String(q.moduleId || q.module?.id || ""),
          learningSector: (q.learningSector || sector) as "IT" | "KIDS",
          questionCount: Number(q.questionCount ?? q.totalQuestions ?? q.questions?.length ?? 10),
          durationMinutes: Number(q.durationMinutes ?? q.timeLimit ?? 45),
          status: String(q.status || q.quizStatus || "Active"),
          totalAttempts: Number(q.totalAttempts ?? 0),
          averageScore: q.averageScore != null ? Number(q.averageScore) : 0,
          passRate: q.passRate != null ? Number(q.passRate) : 0,
          avgTimePerQuestion: q.avgTimePerQuestionMinutes != null ? Number(q.avgTimePerQuestionMinutes) : 1.5,
        };
      })
      .filter(Boolean) as InstructorPracticeTestItem[];
  }

  /** Fetch Practice Tests list using GET /quizzes/practice-tests?page={page}&size={size} */
  async getPracticeTests(
    page = 0,
    size = 10,
    courseId?: string,
    learningSector?: "IT" | "KIDS" | "ALL"
  ): Promise<InstructorPracticeTestItem[]> {
    if (!learningSector || learningSector === "ALL") {
      const [itRes, kidsRes] = await Promise.allSettled([
        this.fetchSectorPracticeTests(page, size, courseId, "IT"),
        this.fetchSectorPracticeTests(page, size, courseId, "KIDS"),
      ]);
      const list: InstructorPracticeTestItem[] = [];
      const seen = new Set<string>();

      if (itRes.status === "fulfilled") {
        itRes.value.forEach((item) => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            list.push(item);
          }
        });
      }
      if (kidsRes.status === "fulfilled") {
        kidsRes.value.forEach((item) => {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            list.push(item);
          }
        });
      }
      return list;
    }

    return this.fetchSectorPracticeTests(page, size, courseId, learningSector);
  }
}

export const instructorPracticeTestService = new InstructorPracticeTestService();
