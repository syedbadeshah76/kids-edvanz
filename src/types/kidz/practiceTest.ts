/**
 * Practice Test Type Definitions
 * Matches Java Spring Boot practice test contracts
 */

export interface PracticeTestSummary {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  totalQuestions: number;
  durationMinutes: number;
  passingPercentage: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  category?: string;
  attemptsCount?: number;
  bestScore?: number;
}

export interface PracticeTestQuestion {
  attemptQuestionId: string;
  questionText: string;
  marks: number;
  options: Array<{
    key: string;
    text: string;
  }>;
}

export interface PracticeTestAttempt {
  attemptId: string;
  testId: string;
  totalQuestions: number;
  durationMinutes: number;
  startedAt: string;
}

export interface PracticeTestSubmitRequest {
  answers: Array<{
    attemptQuestionId: string;
    selectedAnswers: string[];
  }>;
}

export interface PracticeTestResult {
  attemptId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
}
