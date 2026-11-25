import { useEffect, useState } from "react";
import { Brain, Sparkles, Target, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import { QuizDialog } from "@/components/kidz/KidzQuizDialog";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { useStudentCourses } from "@/hooks/kidz/useStudentCourses";
import { practiceTestService } from "@/services/kidz/practiceTestService";
import { apiClient, unwrapArray } from "@/lib/kidz/kidz-api-client";
import type { QuizDTO } from "@/types/kidz/api.types";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";

export function QuizzesPage() {
  useDocumentMeta(
    "Quizzes & Practice Tests - EDVANZ",
    "Timed quizzes with instant feedback and interactive scores.",
  );

  const [activeTab, setActiveTab] = useState<"quizzes" | "practice">("quizzes");
  const [activeQuiz, setActiveQuiz] = useState<{ id: string; title: string } | null>(null);
  const { quizScores } = useAppState();
  const { enrolledCourses } = useStudentCourses();

  const [quizzesList, setQuizzesList] = useState<QuizDTO[]>([]);
  const [practiceTestsList, setPracticeTestsList] = useState<QuizDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const loadQuizzes = async () => {
      try {
        const courseIds = enrolledCourses.map((e) => e.courseId);

        // Fetch practice tests for enrolled courses
        let pts: QuizDTO[] = [];
        if (courseIds.length > 0) {
          const testPromises = courseIds.map((cid) =>
            practiceTestService.getPracticeTestsByCourse(cid).catch(() => [] as QuizDTO[]),
          );
          const results = await Promise.all(testPromises);
          pts = results.flat();
        }

        // Fetch general or course quizzes
        let generalQuizzes: QuizDTO[] = [];
        try {
          const res = await apiClient.get<QuizDTO[]>("/quizzes");
          generalQuizzes = unwrapArray<QuizDTO>(res);
        } catch {
          generalQuizzes = [];
        }

        if (isMounted) {
          setPracticeTestsList(pts);
          setQuizzesList(generalQuizzes);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadQuizzes();

    return () => {
      isMounted = false;
    };
  }, [enrolledCourses]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">TEST YOURSELF</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
          {activeTab === "quizzes" ? "Assignments / Quizzes" : "Fun Practice Tests"}
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Short, fast, and weirdly addictive. Beat your best score to climb the leaderboard.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("quizzes")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
            activeTab === "quizzes"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Brain className="size-4" />
          <span>Assignments / Quizzes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("practice")}
          className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
            activeTab === "practice"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Target className="size-4" />
          <span>Fun Practice Tests</span>
        </button>
      </div>

      {isLoading ? (
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center py-20 text-center">
          <Loader2 className="size-10 animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-black text-slate-800">Loading assessments...</h2>
        </div>
      ) : activeTab === "quizzes" ? (
        quizzesList.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {quizzesList.map((quiz) => {
              const best = quizScores[quiz.title];
              const attempted = best !== null && best !== undefined;

              return (
                <article
                  key={quiz.id}
                  className="flex flex-col justify-between rounded-3xl border border-[#ddd6fe] bg-[#ede9fe]/80 p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        {quiz.description || "Course Assessment"}
                      </p>
                      <h2 className="mt-1 text-lg font-black text-slate-900">{quiz.title}</h2>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        {quiz.questionCount || 10} Questions · {quiz.durationMinutes || 10} Mins
                      </p>
                    </div>
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
                      🧠 
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-bold text-slate-400">
                      {attempted ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Sparkles className="size-3.5" /> Best Score {best}%
                        </span>
                      ) : (
                        <span>Not Attempted Yet</span>
                      )}
                    </p>

                    <Button
                      onClick={() => setActiveQuiz({ id: quiz.id, title: quiz.title })}
                      className="w-full rounded-full bg-blue-600 py-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95"
                    >
                      {attempted ? "Retry Quiz" : "Start Quiz"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
            <div className="grid size-16 place-items-center rounded-2xl bg-purple-50 text-purple-600 mb-3">
              <Brain className="size-8" />
            </div>
            <h3 className="text-xl font-black text-slate-800">No quizzes assigned yet</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500 max-w-md">
              Assignments and quizzes will appear here as your instructors publish them for your enrolled courses.
            </p>
            <Button asChild className="mt-6 rounded-full bg-blue-600 px-6 font-bold text-white shadow-md hover:bg-blue-700">
              <Link to="/kidz/explore">Explore Courses</Link>
            </Button>
          </div>
        )
      ) : practiceTestsList.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {practiceTestsList.map((pt) => {
            const best = quizScores[pt.title];
            const attempted = best !== null && best !== undefined;

            return (
              <article
                key={pt.id}
                className="flex flex-col justify-between rounded-3xl border border-[#bae6fd] bg-[#f0f9ff] p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-sky-600">
                        {pt.description || "Practice Gauntlet"}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        Interactive
                      </span>
                    </div>
                    <h2 className="mt-1 text-lg font-black text-slate-900">{pt.title}</h2>
                    <p className="mt-0.5 text-xs font-semibold text-slate-500">
                      {pt.questionCount || 15} Questions · {pt.durationMinutes || 15} Mins
                    </p>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-xs">
                    🎯
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Pass Score: {pt.passingPercentage ?? 70}%</span>
                    {attempted && (
                      <span className="text-sky-600">Your Best: {best}%</span>
                    )}
                  </div>

                  <Button
                    onClick={() => setActiveQuiz({ id: pt.id, title: pt.title })}
                    className="w-full rounded-full bg-blue-600 py-5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95"
                  >
                    {attempted ? "Retry Practice Test" : "Start Practice Test"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="grid size-16 place-items-center rounded-2xl bg-sky-50 text-sky-600 mb-3">
            <Target className="size-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800">No practice tests available yet</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500 max-w-md">
            Practice gauntlets and showdowns will become available as you unlock and progress through your course modules.
          </p>
          <Button asChild className="mt-6 rounded-full bg-blue-600 px-6 font-bold text-white shadow-md hover:bg-blue-700">
            <Link to="/kidz/my-learning">My Learning</Link>
          </Button>
        </div>
      )}

      {activeQuiz && (
        <QuizDialog
          quizId={activeQuiz.id}
          title={activeQuiz.title}
          open={activeQuiz !== null}
          onOpenChange={(open) => !open && setActiveQuiz(null)}
        />
      )}
    </div>
  );
}

export const KidzQuizzes = QuizzesPage;
export default KidzQuizzes;
