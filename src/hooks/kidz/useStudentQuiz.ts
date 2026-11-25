import { useCallback, useState } from "react";
import { toast } from "sonner";

import { quizService } from "@/services/kidz/quiz.service";
import type {
  QuizDTO,
  QuizQuestionDTO,
  QuizResultDTO,
  QuizReviewDTO,
} from "@/types/kidz/api.types";
import { extractErrorMessage } from "@/lib/kidz/kidz-api-error";

export function useStudentQuiz(quizId?: string) {
  const [quiz, setQuiz] = useState<QuizDTO | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [result, setResult] = useState<QuizResultDTO | null>(null);
  const [review, setReview] = useState<QuizReviewDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadQuiz = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const data = await quizService.getQuizById(id);
      setQuiz(data);
      return data;
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to load quiz details"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startQuiz = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const attemptRes = await quizService.startAttempt(id);
      setAttemptId(attemptRes.attemptId);

      const loadedQuestions = await quizService.getAttemptQuestions(attemptRes.attemptId);
      setQuestions(loadedQuestions);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setResult(null);
      setReview(null);
      return attemptRes;
    } catch (err) {
      toast.error(extractErrorMessage(err, "Could not start quiz attempt"));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectAnswer = useCallback((questionId: string, answerKey: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: [answerKey],
    }));
  }, []);

  const submitQuiz = useCallback(async () => {
    if (!attemptId) return null;
    setIsSubmitting(true);
    try {
      const answersPayload = Object.entries(selectedAnswers).map(
        ([attemptQuestionId, selected]) => ({
          attemptQuestionId,
          selectedAnswers: selected,
        }),
      );

      const res = await quizService.submitAttempt(attemptId, {
        answers: answersPayload,
      });
      setResult(res);

      // Attempt to load review
      try {
        const rev = await quizService.getAttemptReview(attemptId);
        setReview(rev);
      } catch {
        /* review might be disabled */
      }

      return res;
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to submit quiz answers"));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, selectedAnswers]);

  return {
    quiz,
    attemptId,
    questions,
    currentIndex,
    selectedAnswers,
    result,
    review,
    isLoading,
    isSubmitting,
    setCurrentIndex,
    loadQuiz,
    startQuiz,
    selectAnswer,
    submitQuiz,
  };
}
