import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Building2,
  Lock,
  ChevronRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import revenueService from "@/services/instructor/revenueService";
import type {
  RevenueOverview,
  PayoutAccount,
  CourseRevenue,
} from "@/types/revenue.types";
import { PayoutAccountModal } from "./PayoutAccountModal";

function formatINR(num: number): string {
  return `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function InstructorPayoutRequest() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [overview, setOverview] = useState<RevenueOverview | null>(null);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [amountStr, setAmountStr] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [ov, acc] = await Promise.all([
          revenueService.getOverview(),
          revenueService.getPayoutAccount(),
        ]);
        if (cancelled) return;
        setOverview(ov);
        setPayoutAccount(acc);
      } catch (err: any) {
        if (!cancelled) {
          toast.error("Failed to load earnings or payout details");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute maximum withdrawable earnings
  // If a course is selected, max is that course's revenue, else instructor total earnings minus pending payouts
  const totalEarnings = overview?.breakdown.instructorEarnings ?? 0;
  const pendingPayout = overview?.breakdown.pendingPayout ?? 0;
  const availableOverall = Math.max(0, totalEarnings - pendingPayout);

  const selectedCourse = overview?.revenueByCourse.find(
    (c) => c.courseId === selectedCourseId
  );

  const maxWithdrawable = selectedCourse
    ? Number(selectedCourse.revenue || 0)
    : availableOverall;

  const handleUseMaximum = () => {
    if (maxWithdrawable <= 0) {
      toast.error("No available earnings to withdraw");
      return;
    }
    setAmountStr(maxWithdrawable.toFixed(2));
  };

  // Calculations for breakdown
  const amountNum = parseFloat(amountStr) || 0;
  const feePercent = overview?.breakdown.platformFeePercent ?? 30;
  const platformFeeAmount = amountNum * (feePercent / 100);
  const netPayoutAmount = Math.max(0, amountNum - platformFeeAmount);

  const isAmountValid = amountNum >= 50 && amountNum <= maxWithdrawable;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payoutAccount?.payoutAccountId) {
      toast.error("Please add and verify your bank payout account first");
      setModalOpen(true);
      return;
    }

    if (amountNum < 50) {
      toast.error("Minimum payout request is ₹50.00");
      return;
    }

    if (amountNum > maxWithdrawable) {
      toast.error(`Requested amount exceeds available balance of ${formatINR(maxWithdrawable)}`);
      return;
    }

    if (!confirmed) {
      toast.error("Please check the confirmation box to proceed");
      return;
    }

    try {
      setSubmitting(true);
      const res = await revenueService.requestPayout({
        courseId: selectedCourseId || null,
        amount: amountNum,
        payoutAccountId: payoutAccount.payoutAccountId,
      });

      toast.success(res.message || "Payout request submitted successfully!");
      // Navigate back to revenue dashboard after short delay
      setTimeout(() => {
        navigate("/instructor/revenue");
      }, 1000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to submit payout request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[450px] items-center justify-center p-6 text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span>Loading payout options…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Breadcrumb & Header */}
        <div>
          <button
            type="button"
            onClick={() => navigate("/instructor/revenue")}
            className="group mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            Instructor earnings
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white md:text-3xl">
            Request a payout
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Choose how much of your available earnings you would like to withdraw.
          </p>
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <div className="rounded-[20px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-6">
              {/* Highlight Card: Total Earnings */}
              <div className="flex items-center justify-between rounded-xl bg-[#EEF4FF] dark:bg-blue-950/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-white shadow-xs">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Total Earnings
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-[#1D4ED8] dark:text-blue-400">
                      {formatINR(availableOverall > 0 ? availableOverall : totalEarnings)}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Last updated today
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Field 1: SELECT COURSE */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    SELECT COURSE
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">All Courses (Overall Earnings)</option>
                      {overview?.revenueByCourse.map((c) => (
                        <option key={c.courseId} value={c.courseId}>
                          {c.courseName || c.courseTitle} — {formatINR(c.revenue)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 text-xs">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Field 2: PAYOUT AMOUNT */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    PAYOUT AMOUNT
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-semibold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="50"
                      max={maxWithdrawable}
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-8 pr-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Minimum payout: ₹50.00
                    </span>
                    <button
                      type="button"
                      onClick={handleUseMaximum}
                      className="font-semibold text-[#1D4ED8] hover:underline dark:text-blue-400"
                    >
                      Use maximum
                    </button>
                  </div>
                </div>

                {/* Section 3: Payout breakdown */}
                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Payout breakdown
                  </h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Requested Amount</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      ₹ {amountNum.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      Platform fee ({feePercent}%)
                    </span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      -₹ {platformFeeAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      Estimated net payout
                    </span>
                    <span className="text-base font-bold text-[#1D4ED8] dark:text-blue-400">
                      ₹ {netPayoutAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Section 4: PAYMENT METHOD */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    PAYMENT METHOD
                  </label>

                  {payoutAccount ? (
                    <div>
                      <div className="flex items-center justify-between rounded-xl border border-blue-400 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/30 p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Building2 className="h-5 w-5 shrink-0 text-slate-700 dark:text-slate-300" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {payoutAccount.payoutMethod === "BANK_TRANSFER"
                                ? "Bank Transfer"
                                : payoutAccount.payoutMethod === "UPI"
                                ? "UPI Transfer"
                                : payoutAccount.payoutMethod || "Bank Transfer"}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {payoutAccount.bankName} • {payoutAccount.accountType} • ending in{" "}
                              {payoutAccount.accountNumber?.slice(-4) || "••••"}
                              {payoutAccount.upiId && ` • UPI: ${payoutAccount.upiId}`}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            payoutAccount.verificationStatus === "VERIFIED"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400"
                          }`}
                        >
                          {payoutAccount.verificationStatus === "VERIFIED" ? "Verified" : "Pending"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="mt-2 text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Update bank details
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
                      <p className="text-xs text-slate-500 mb-2">
                        No payout account configured yet.
                      </p>
                      <button
                        type="button"
                        onClick={() => setModalOpen(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Add bank details
                      </button>
                    </div>
                  )}
                </div>

                {/* Section 5: Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    I confirm this request is accurate and understand it will be reviewed before payment is processed.
                  </span>
                </label>

                {/* Section 6: Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/instructor/revenue")}
                    disabled={submitting}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !confirmed || !isAmountValid || !payoutAccount}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit payout request
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Info Cards */}
          <div className="space-y-6 lg:col-span-5">
            {/* Card 1: What happens next? */}
            <div className="rounded-[20px] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-5">
                What happens next?
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-xs font-bold text-blue-700 dark:text-blue-300">
                    1
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                    Admin verifies your earnings, tax information, and payout account.
                  </p>
                </li>
                <li className="flex items-start gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-xs font-bold text-blue-700 dark:text-blue-300">
                    2
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                    Approved requests are queued for the next payment cycle.
                  </p>
                </li>
                <li className="flex items-start gap-3.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-950 text-xs font-bold text-blue-700 dark:text-blue-300">
                    3
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                    Funds arrive through your verified ACH account.
                  </p>
                </li>
              </ol>
            </div>

            {/* Card 2: Secure payout process */}
            <div className="rounded-[20px] border border-[#A7F3D0] dark:border-emerald-900 bg-[#ECFDF5] dark:bg-emerald-950/30 p-5">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm mb-1.5">
                <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Secure payout process</span>
              </div>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Your request and bank details are encrypted and shared only with authorized payout staff.
              </p>
            </div>
          </div>
        </div>

        {/* Payout Account Modal */}
        <PayoutAccountModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          currentAccount={payoutAccount}
          onSuccess={(savedAcc) => setPayoutAccount(savedAcc)}
        />
      </div>
    </div>
  );
}

export default InstructorPayoutRequest;
