import { apiClient, unwrapArray, unwrapData } from "@/lib/kidz/kidz-api-client";
import type {
  QuizAttemptHistoryItem,
  QuizAttemptResponse,
  QuizDTO,
  QuizQuestionDTO,
  QuizResultDTO,
  QuizReviewDTO,
  QuizSubmitRequest,
} from "@/types/kidz/api.types";

export const quizService = {
  /**
   * Get quiz details by ID
   */
  async getQuizById(quizId: string): Promise<QuizDTO> {
    const response = await apiClient.get<QuizDTO>(`/quizzes/${quizId}`);
    return unwrapData(response);
  },

  /**
   * Start a new quiz attempt
   */
  async startAttempt(quizId: string): Promise<QuizAttemptResponse> {
    const response = await apiClient.post<QuizAttemptResponse>(
      `/quizzes/${quizId}/attempts`,
    );
    return unwrapData(response);
  },

  /**
   * Fetch questions for an active attempt
   */
  async getAttemptQuestions(attemptId: string): Promise<QuizQuestionDTO[]> {
    const response = await apiClient.get<QuizQuestionDTO[]>(
      `/quizzes/attempts/${attemptId}/questions`,
    );
    return unwrapArray<QuizQuestionDTO>(response);
  },

  /**
   * Submit answers for a quiz attempt
   */
  async submitAttempt(
    attemptId: string,
    answers: QuizSubmitRequest,
  ): Promise<QuizResultDTO> {
    const response = await apiClient.post<QuizResultDTO>(
      `/quizzes/attempts/${attemptId}/submit`,
      answers,
    );
    return unwrapData(response);
  },

  /**
   * Review submitted attempt with correct answers and explanations
   */
  async getAttemptReview(attemptId: string): Promise<QuizReviewDTO> {
    const response = await apiClient.get<QuizReviewDTO>(
      `/quizzes/attempts/${attemptId}/review`,
    );
    return unwrapData(response);
  },

  /**
   * Get student's previous attempt history for this quiz
   */
  async getAttemptHistory(quizId: string): Promise<QuizAttemptHistoryItem[]> {
    const response = await apiClient.get<QuizAttemptHistoryItem[]>(
      `/quizzes/${quizId}/attempts/history`,
    );
    return unwrapArray<QuizAttemptHistoryItem>(response);
  },
};
