import { AlertTriangle, LogOut, CheckCircle, X } from "lucide-react";

interface Props {
  open: boolean;
  onCancel: () => void;
  onLeave: () => void;
  onSubmit: () => void;
  submitting: boolean;
  answeredCount?: number;
  totalQuestions?: number;
}

export function ExitModal({
  open,
  onCancel,
  onLeave,
  onSubmit,
  submitting,
  answeredCount = 0,
  totalQuestions = 0,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 px-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 id="exit-modal-title" className="text-lg sm:text-xl font-bold text-[#1F2937]">
                Leave or Submit Exam?
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280]">
                You have an assessment currently in progress.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress summary banner */}
        {totalQuestions > 0 && (
          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-slate-600 font-medium">Questions answered:</span>
            <span className="font-bold text-[#2D4BFF]">
              {answeredCount} of {totalQuestions}
            </span>
          </div>
        )}

        {/* Option Descriptions */}
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 text-left text-xs sm:text-sm">
            <div className="font-semibold text-amber-900 flex items-center gap-1.5">
              <LogOut className="h-4 w-4 text-amber-600" />
              <span>Leave Exam</span>
            </div>
            <p className="mt-1 text-slate-600 text-xs leading-relaxed">
              Exit the exam without submitting. Your answers and progress are preserved so your attempt is not wasted. You can return and resume this attempt later before the timer expires.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 p-3.5 text-left text-xs sm:text-sm">
            <div className="font-semibold text-blue-900 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-[#2D4BFF]" />
              <span>Submit Exam</span>
            </div>
            <p className="mt-1 text-slate-600 text-xs leading-relaxed">
              Complete and submit your exam now. Your answers will be graded and recorded as 1 completed attempt. Unanswered questions will be scored as incorrect.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Continue Exam
          </button>
          <button
            onClick={onLeave}
            disabled={submitting}
            className="w-full sm:w-auto rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <LogOut className="h-4 w-4" />
            <span>Leave Exam</span>
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full sm:w-auto rounded-xl bg-[#2D4BFF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3AE6] disabled:opacity-60 transition-colors shadow-xs inline-flex items-center justify-center gap-1.5"
          >
            <CheckCircle className="h-4 w-4" />
            <span>{submitting ? "Submitting..." : "Submit Exam"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
