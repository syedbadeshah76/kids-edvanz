import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { quizService } from "@/services/kidz/quiz.service";
import { cn } from "@/lib/utils";
import type { QuizQuestionDTO, QuizSubmitAnswer } from "@/types/kidz/api.types";

const QUESTION_SECONDS = 30;
const answerLetters = ["A", "B", "C", "D"];

export function KidzQuizDialog({
  quizId,
  title,
  open,
  onOpenChange,
}: {
  quizId?: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { setQuizScore } = useAppState();
  const [questions, setQuestions] = useState<QuizQuestionDTO[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<QuizSubmitAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [finalPercentage, setFinalPercentage] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);

  const reset = () => {
    setIndex(0);
    setPicked(null);
    setCorrect(0);
    setFinished(false);
    setFinalPercentage(null);
    setUserAnswers([]);
    setSecondsLeft(QUESTION_SECONDS);
  };

  // Fetch or start attempt when opened
  useEffect(() => {
    if (!open) return;
    reset();

    if (!quizId) {
      // Question prompt if no specific quizId provided
      setQuestions([
        {
          attemptQuestionId: "q1",
          questionText: `Ready to test your knowledge on ${title}?`,
          options: [
            { key: "A", text: "Yes, let's do it!" },
            { key: "B", text: "Absolutely ready" },
            { key: "C", text: "I've been studying" },
            { key: "D", text: "All of the above" },
          ],
        },
      ]);
      return;
    }

    setIsLoading(true);
    quizService
      .startAttempt(quizId)
      .then(async (attempt) => {
        setAttemptId(attempt.attemptId);
        const qList = await quizService.getAttemptQuestions(attempt.attemptId);
        setQuestions(qList);
      })
      .catch((err) => {
        console.warn("Could not start quiz attempt:", err);
        toast.error("Could not load quiz questions.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open, quizId, title]);

  const question = questions[index];
  const progress = finished || questions.length === 0 ? 100 : ((index + 1) / questions.length) * 100;

  const advance = useCallback(
    async (selectedIdx: number | null) => {
      if (!question || finished) return;

      const selectedOptionKey =
        selectedIdx !== null ? question.options[selectedIdx]?.key : undefined;

      const nextAnswer: QuizSubmitAnswer = {
        attemptQuestionId: question.attemptQuestionId,
        selectedAnswers: selectedOptionKey ? [selectedOptionKey] : [],
      };

      const nextAnswers = [...userAnswers, nextAnswer];
      setUserAnswers(nextAnswers);

      // Simple correct increment for feedback
      const wasAnswered = selectedIdx !== null;
      const nextCorrect = correct + (wasAnswered ? 1 : 0);

      if (index + 1 >= questions.length) {
        setCorrect(nextCorrect);
        setFinished(true);

        // If active attempt on backend, submit
        if (attemptId) {
          try {
            const result = await quizService.submitAttempt(attemptId, { answers: nextAnswers });
            const scorePercent = result.percentage ?? Math.round((nextCorrect / questions.length) * 100);
            setFinalPercentage(scorePercent);
            setQuizScore(title, scorePercent);
            toast.success(`Quiz complete — ${scorePercent}%!`);
            return;
          } catch (err) {
            console.warn("Quiz submission failed:", err);
          }
        }

        const scorePercent = Math.round((nextCorrect / questions.length) * 100);
        setFinalPercentage(scorePercent);
        setQuizScore(title, scorePercent);
        toast.success(`Quiz complete — ${scorePercent}%!`);
      } else {
        setCorrect(nextCorrect);
        setIndex(index + 1);
        setPicked(null);
        setSecondsLeft(QUESTION_SECONDS);
      }
    },
    [attemptId, correct, finished, index, question, questions.length, setQuizScore, title, userAnswers],
  );

  useEffect(() => {
    if (!open || finished || picked !== null || isLoading) return;
    if (secondsLeft <= 0) {
      void advance(null);
      return;
    }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [advance, finished, isLoading, open, picked, secondsLeft]);

  const selectAnswer = (answerIndex: number) => {
    if (picked !== null) return;
    setPicked(answerIndex);
  };

  const scoreDisplay = finalPercentage ?? Math.round((correct / Math.max(1, questions.length)) * 100);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-h-[96dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto border-0 bg-transparent p-2 shadow-none sm:rounded-[2.5rem] sm:p-8 [&>button]:right-5 [&>button]:top-5 [&>button]:z-30 [&>button]:rounded-full [&>button]:border-2 [&>button]:border-quiz-ink [&>button]:bg-card [&>button]:p-2 [&>button]:text-quiz-ink [&>button]:opacity-100">
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{finished ? "Quiz results" : `Question ${index + 1} of ${questions.length}`}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="quiz-card-shadow rounded-[2rem] border-4 border-quiz-ink bg-card p-12 text-center sm:rounded-[2.5rem]">
            <Loader2 className="mx-auto size-10 animate-spin text-blue-600 mb-4" />
            <h3 className="text-lg font-black text-slate-800">Preparing your challenge...</h3>
            <p className="mt-1 text-xs text-slate-400 font-semibold">Loading questions and starting session.</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="quiz-card-shadow rounded-[2rem] border-4 border-quiz-ink bg-card p-12 text-center sm:rounded-[2.5rem]">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-xl font-black text-slate-900">No Questions Available</h3>
            <p className="mt-1 text-xs text-slate-500 font-semibold">
              The questions for this quiz are currently being updated by the instructor.
            </p>
            <Button
              className="mt-6 rounded-full bg-quiz-ink font-black text-white"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : finished ? (
          <div className="quiz-card-shadow relative overflow-hidden rounded-[2rem] border-4 border-quiz-ink bg-card px-6 py-10 text-center sm:rounded-[2.5rem] sm:px-12 sm:py-14">
            <div className="animate-quiz-celebrate mx-auto grid size-24 place-items-center rounded-full border-4 border-quiz-ink bg-quiz-pop text-5xl sm:size-28">
              {scoreDisplay >= 70 ? "🎉" : "💪"}
            </div>
            <p className="mt-6 text-sm font-black uppercase text-quiz-ink">Challenge complete</p>
            <p className="mt-2 text-5xl font-black text-foreground sm:text-7xl">{scoreDisplay}%</p>
            <p className="mt-3 font-bold text-muted-foreground">
              {correct} of {questions.length} questions correct
            </p>
            <div className="mx-auto mt-8 flex max-w-sm flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="h-12 flex-1 rounded-full border-2 border-quiz-ink font-black text-quiz-ink" onClick={reset}>Try again</Button>
              <Button className="h-12 flex-1 rounded-full bg-quiz-ink font-black text-primary-foreground hover:bg-quiz-ink/90" onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : question ? (
          <div className="quiz-card-shadow relative rounded-[2rem] border-4 border-quiz-ink bg-card p-5 sm:rounded-[2.5rem] sm:p-10">
            <div className="pointer-events-none absolute -right-1 top-12 hidden sm:block">
              <div className="animate-quiz-mascot relative grid size-32 place-items-center rounded-full border-4 border-quiz-ink bg-quiz-pop text-6xl shadow-lg lg:size-36">
                🦊
                <Sparkles className="absolute -left-4 top-2 size-8 text-destructive" aria-hidden="true" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pr-10 sm:pr-28">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-quiz-ink bg-quiz-soft px-3 py-1.5 text-xs font-black uppercase text-quiz-ink sm:px-4">
                <span className="size-2.5 animate-pulse rounded-full bg-mint" /> Question {index + 1} of {questions.length}
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <div className="h-5 flex-1 overflow-hidden rounded-full border-2 border-quiz-ink bg-quiz-soft p-0.5" role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                <div className="h-full rounded-full bg-quiz-ink transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className={cn("flex min-w-20 items-center justify-center gap-1.5 font-black", secondsLeft <= 10 ? "text-destructive" : "text-quiz-ink")} aria-live="polite">
                <Clock3 className="size-5" />
                <span>{secondsLeft}s</span>
              </div>
            </div>

            <div className="mt-7 min-h-32 rounded-3xl bg-quiz-soft px-5 py-7 sm:mr-20 sm:px-8">
              <p className="text-xs font-black uppercase text-quiz-ink">{title}</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-foreground sm:text-3xl">
                {question.questionText}
              </h2>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {question.options.map((opt, i) => {
                const isPicked = picked === i;
                const state = isPicked ? "correct" : "idle";

                return (
                  <Button
                    key={opt.key || opt.text}
                    type="button"
                    variant="outline"
                    disabled={picked !== null}
                    onClick={() => selectAnswer(i)}
                    className={cn(
                      "h-auto min-h-20 justify-start whitespace-normal rounded-2xl border-4 px-4 py-4 text-left text-base font-black transition-all duration-200 disabled:pointer-events-none disabled:opacity-100 sm:min-h-24 sm:px-5 sm:text-lg",
                      state === "correct" && "quiz-answer-shadow -translate-y-1 border-mint bg-mint/20 text-mint-foreground",
                      state === "idle" && "border-quiz-ink bg-card text-foreground hover:-translate-y-1 hover:bg-quiz-soft hover:quiz-answer-shadow active:translate-y-0 active:shadow-none",
                    )}
                  >
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-base font-black", state === "correct" ? "bg-mint text-primary-foreground" : "bg-quiz-ink text-primary-foreground")}>
                      {state === "correct" ? <Check className="size-5" /> : opt.key || answerLetters[i] || "•"}
                    </span>
                    <span>{opt.text}</span>
                  </Button>
                );
              })}
            </div>

            <div className="mt-6 flex min-h-12 items-center justify-between gap-4">
              <p className={cn("text-sm font-bold", picked === null ? "text-muted-foreground" : "text-mint-foreground")} aria-live="polite">
                {picked === null ? "Pick the answer that feels right." : "Answer selected!"}
              </p>
              <Button
                className="h-12 shrink-0 rounded-full bg-quiz-ink px-7 font-black text-primary-foreground shadow-md hover:bg-quiz-ink/90 active:translate-y-0.5"
                disabled={picked === null}
                onClick={() => void advance(picked)}
              >
                {index + 1 >= questions.length ? "See results" : "Next question"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export const QuizDialog = KidzQuizDialog;
