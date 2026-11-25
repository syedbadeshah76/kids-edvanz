import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type {
  PracticeTestAverageDTO,
  QuizAttemptResponse,
  QuizDTO,
  QuizQuestionDTO,
  QuizResultDTO,
  QuizReviewDTO,
  QuizSubmitRequest,
} from "@/types/kidz/api.types";

export const practiceTestService = {
  /**
   * Get all practice tests for a given course
   */
  async getPracticeTestsByCourse(courseId: string): Promise<QuizDTO[]> {
    const response = await apiClient.get<QuizDTO[]>(
      `/quizzes/course/${courseId}/practice-tests`,
    );
    return unwrapArray<QuizDTO>(response);
  },

  /**
   * Get student's historical average on course practice tests
   */
  async getStudentAverage(
    studentId: string,
    courseId: string,
  ): Promise<PracticeTestAverageDTO> {
    const response = await apiClient.get<PracticeTestAverageDTO>(
      `/quizzes/student/${studentId}/course/${courseId}/practice-test/average`,
    );
    return unwrapData(response);
  },

  /**
   * Start a practice test attempt
   */
  async startAttempt(quizId: string): Promise<QuizAttemptResponse> {
    const response = await apiClient.post<QuizAttemptResponse>(
      `/quizzes/${quizId}/attempts`,
    );
    return unwrapData(response);
  },

  /**
   * Get questions for practice test attempt
   */
  async getAttemptQuestions(attemptId: string): Promise<QuizQuestionDTO[]> {
    const response = await apiClient.get<QuizQuestionDTO[]>(
      `/quizzes/attempts/${attemptId}/questions`,
    );
    return unwrapArray<QuizQuestionDTO>(response);
  },

  /**
   * Submit practice test attempt
   */
  async submitAttempt(
    attemptId: string,
    payload: QuizSubmitRequest,
  ): Promise<QuizResultDTO> {
    const response = await apiClient.post<QuizResultDTO>(
      `/quizzes/attempts/${attemptId}/submit`,
      payload,
    );
    return unwrapData(response);
  },

  /**
   * Review submitted practice test attempt
   */
  async getAttemptReview(attemptId: string): Promise<QuizReviewDTO> {
    const response = await apiClient.get<QuizReviewDTO>(
      `/quizzes/attempts/${attemptId}/review`,
    );
    return unwrapData(response);
  },
};
