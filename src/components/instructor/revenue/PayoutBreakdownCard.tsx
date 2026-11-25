import { ShieldCheck } from "lucide-react";
import type { PayoutBreakdown } from "@/types/revenue.types";

interface Props {
  data: PayoutBreakdown;
}

function formatINR(num: number): string {
  return `₹${Number(num || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
      <span className={valueClass ?? "font-semibold text-slate-800 dark:text-slate-200"}>
        {value}
      </span>
    </div>
  );
}

export function PayoutBreakdownCard({ data }: Props) {
  const parsedDate = data.nextPayoutDate ? new Date(data.nextPayoutDate) : null;
  const nextDate =
    parsedDate && !isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "Jul 15";

  return (
    <div className="rounded-[20px] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Payout Breakdown</h3>

      <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
        <Row label="Total Revenue" value={formatINR(data.totalRevenue)} />
        <Row
          label={`Platform Fee (${data.platformFeePercent}%)`}
          value={`-${formatINR(data.platformFee)}`}
          valueClass="font-semibold text-[#EF4444]"
        />
        <Row
          label="Your Earnings"
          value={formatINR(data.instructorEarnings)}
          valueClass="font-semibold text-[#10B981]"
        />
        <Row
          label="Completed Payouts"
          value={formatINR(data.completedPayouts)}
          valueClass="font-semibold text-[#2563EB]"
        />
        <Row
          label="Pending Payout"
          value={formatINR(data.pendingPayout)}
          valueClass="font-semibold text-[#F59E0B]"
        />
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-[#EEF4FF]/70 p-3.5 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="leading-relaxed">
          <div>Admin processes payout every {data.payoutCycleDays} days.</div>
          <div className="font-semibold text-blue-800 dark:text-blue-200">
            Next: {nextDate}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PayoutBreakdownCard;

