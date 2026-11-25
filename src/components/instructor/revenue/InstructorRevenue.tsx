import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IndianRupee, Hourglass, CalendarDays, RefreshCw } from "lucide-react";
import revenueService from "@/services/instructor/revenueService";
import type {
  RevenueOverview,
  RevenueTransaction,
} from "@/types/revenue.types";
import { StatCard } from "./StatCard";
import { RevenueByCourse } from "./RevenueByCourse";
import { PayoutBreakdownCard } from "./PayoutBreakdownCard";
import { TransactionHistory } from "./TransactionHistory";
import { RevenueTrend } from "./RevenueTrend";

function formatINR(num: number): string {
  return `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function InstructorRevenue() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [ov, tx] = await Promise.all([
          revenueService.getOverview(),
          revenueService.getTransactions({ page: 1, limit: 50 }),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setTransactions(tx.items);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load revenue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Loading revenue data…</span>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error ?? "Failed to load revenue overview"}
        </div>
      </div>
    );
  }

  const { stats, breakdown, revenueByCourse, trend } = overview;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
              Revenue
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage all payouts and refunds here
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/instructor/payout")}
            className="inline-flex items-center justify-center rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            Request Payout
          </button>
        </header>

        {/* 4 Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Revenue"
            value={formatINR(stats.totalRevenue)}
            icon={IndianRupee}
          />
          <StatCard
            label="Pending Payouts"
            value={formatINR(stats.pendingPayout)}
            icon={Hourglass}
          />
          <StatCard
            label="This Month"
            value={formatINR(stats.thisMonthRevenue)}
            icon={CalendarDays}
          />
          <StatCard
            label="Transactions"
            value={stats.transactions.toLocaleString()}
            icon={RefreshCw}
          />
        </div>

        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-[#EEF4FF]/70 px-4 py-2.5 text-sm font-normal text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          <span className="mr-2 font-bold text-blue-600 dark:text-blue-400">←</span>
          Payouts processed by Admin Portal · Admin → Revenue → Instructor Payouts
        </div>

        {/* Two Column Layout matching Figma */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Revenue By Course & Transaction History */}
          <div className="space-y-6 lg:col-span-7">
            <RevenueByCourse data={revenueByCourse} />
            <TransactionHistory data={transactions} />
          </div>

          {/* Right Column: Payout Breakdown & Revenue Trend */}
          <div className="space-y-6 lg:col-span-5">
            <PayoutBreakdownCard data={breakdown} />
            <RevenueTrend data={trend} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstructorRevenue;

