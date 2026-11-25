import { Badge } from "@/components/ui/badge";
import type {
  AnnouncementSummary,
  AnnouncementStatus,
} from "@/types/meeting.types";

const STATUS_STYLES: Record<AnnouncementStatus, string> = {
  delivered: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-blue-100 text-blue-700",
  failed: "bg-red-100 text-red-700",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const AnnouncementSummaryCard = ({
  item,
}: {
  item: AnnouncementSummary;
}) => (
  <div className="rounded-lg border border-gray-200 p-5 bg-white min-w-0 max-w-full overflow-hidden">
    <div className="flex items-start justify-between gap-3 min-w-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h4 className="font-medium text-gray-900 break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2" title={item.title}>
            {item.title}
          </h4>
          {item.isLive && (
            <Badge className="bg-blue-600 hover:bg-blue-600 text-white rounded-full text-[10px] px-2 py-0.5 shrink-0">
              Live
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 min-w-0">
          <Badge
            variant="outline"
            className="text-blue-600 border-blue-200 rounded-full max-w-[200px] truncate"
            title={item.courseName}
          >
            {item.courseName}
          </Badge>
          <Badge
            variant="outline"
            className="text-cyan-700 border-cyan-200 bg-cyan-50 rounded-full shrink-0"
          >
            {item.studentCount} students
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          {formatDate(item.createdAt)} · {item.openRate}% open rate
        </p>
      </div>
      <span
        className={`text-xs rounded-full px-3 py-1 capitalize shrink-0 ${STATUS_STYLES[item.status]}`}
      >
        {item.status}
      </span>
    </div>
  </div>
);
