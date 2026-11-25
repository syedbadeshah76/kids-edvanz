import { useState } from "react";
import type { RevenueTransaction } from "@/types/revenue.types";
import { cn } from "@/lib/utils";

interface Props {
  data: RevenueTransaction[];
}

function formatINR(num: number): string {
  return `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status?: string }) {
  const norm = String(status || "").toLowerCase();

  let label = "Completed";
  let classes = "bg-[#EEF4FF] text-[#2563EB]";

  if (norm.includes("refund")) {
    label = "Refunded";
    classes = "bg-[#FEF2F2] text-[#EF4444]";
  } else if (norm.includes("pend")) {
    label = "Pending";
    classes = "bg-[#FFFBEB] text-[#D97706]";
  } else if (norm.includes("fail")) {
    label = "Failed";
    classes = "bg-[#FEF2F2] text-[#EF4444]";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold",
        classes
      )}
    >
      {label}
    </span>
  );
}

export function TransactionHistory({ data }: Props) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const totalPages = Math.max(1, Math.ceil((data?.length || 0) / pageSize));
  const displayed = data ? data.slice((page - 1) * pageSize, page * pageSize) : [];

  return (
    <div className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          Transaction History
        </h3>
        {data && data.length > pageSize && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="inline-flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded border border-slate-200 px-2 py-0.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-slate-200 px-2 py-0.5 font-medium hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {!data || data.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-500">
          No transactions yet.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-left text-xs font-semibold text-slate-400">
                <th className="pb-3 pr-4">Student</th>
                <th className="pb-3 pr-4">Course</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {displayed.map((t, idx) => (
                <tr key={t.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-3.5 pr-4 font-semibold text-slate-900 dark:text-white">
                    {t.studentName}
                  </td>
                  <td className="py-3.5 pr-4 text-slate-600 dark:text-slate-300">
                    {t.courseName || t.courseTitle || "Course"}
                  </td>
                  <td className="py-3.5 pr-4 font-semibold text-[#10B981]">
                    {formatINR(t.amount)}
                  </td>
                  <td className="py-3.5 pr-4 text-slate-500 dark:text-slate-400">
                    {formatDate(t.transactionDate || t.date)}
                  </td>
                  <td className="py-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;

