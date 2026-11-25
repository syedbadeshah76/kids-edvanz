import { useState } from "react";
import type { CourseRevenue } from "@/types/revenue.types";

interface Props {
  data: CourseRevenue[];
}

function formatINR(num: number): string {
  return `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function RevenueByCourse({ data }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue by Course</h3>
        <div className="py-12 text-center text-sm text-slate-500">
          No course revenue data available yet.
        </div>
      </div>
    );
  }

  // Sort by revenue descending so top earners are at top
  const sorted = [...data].sort((a, b) => b.revenue - a.revenue);
  const max = Math.max(...sorted.map((d) => d.revenue), 1);
  const displayedCourses = showAll ? sorted : sorted.slice(0, 5);

  return (
    <div className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Revenue by Course</h3>
        {sorted.length > 5 && (
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {showAll ? "Show less" : `View all (${sorted.length})`}
          </button>
        )}
      </div>

      <div className="mt-5 space-y-5">
        {displayedCourses.map((c) => {
          const widthPercent = c.revenue > 0 ? Math.max(8, (c.revenue / max) * 100) : 0;
          const title = c.courseName || c.courseTitle || "Course";

          return (
            <div key={c.courseId} className="group">
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {title}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {c.sales.toLocaleString()} sales
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-bold text-slate-900 dark:text-white">
                  {formatINR(c.revenue)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 flex items-center gap-3">
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-[#1D4ED8] transition-all duration-500 ease-out"
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RevenueByCourse;

