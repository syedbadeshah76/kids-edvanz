import type { MeetingStatus } from "@/types/meeting.types";
import {
  STATUS_LABEL,
  STATUS_PILL_CLASSES,
} from "@/constants/meeting.constants";
import { cn } from "@/lib/utils";

interface Props {
  status: MeetingStatus | string;
  className?: string;
}

export const MeetingStatusBadge = ({ status, className }: Props) => {
  const raw = String(status || "").trim();
  const normalizedKey = raw.toLowerCase();

  let label = STATUS_LABEL[status] || STATUS_LABEL[normalizedKey];
  let pillClass =
    STATUS_PILL_CLASSES[status] || STATUS_PILL_CLASSES[normalizedKey];

  if (!label) {
    if (normalizedKey.includes("pending")) {
      label = "Pending";
      pillClass = "bg-amber-100 text-amber-800 border border-amber-200";
    } else if (
      normalizedKey.includes("sched") ||
      normalizedKey.includes("approv")
    ) {
      label = "Approved";
      pillClass = "bg-green-100 text-green-700 border border-green-200";
    } else if (normalizedKey.includes("live")) {
      label = "Live Now";
      pillClass = "bg-red-100 text-red-700 border border-red-200";
    } else {
      label = raw || "Pending";
      pillClass = "bg-gray-100 text-gray-700 border border-gray-200";
    }
  }

  const isLive = normalizedKey === "live";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
        pillClass,
        className,
      )}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
      {label}
    </span>
  );
};
