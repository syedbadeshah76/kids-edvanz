// src/components/announcements/AnnouncementCard.tsx
import { format, isToday, isYesterday } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import type { Announcement } from "@/types/announcement.types";
import { AnnouncementTypeChip } from "./AnnouncementTypeChip";
import { CourseNameChip } from "./CourseNameChip";
import { StudentCountChip } from "./StudentCountChip";
import { AnnouncementHtml } from "./AnnouncementHtml";

interface Props {
  announcement: Announcement;
  onEdit?: (a: Announcement) => void;
  onDelete?: (a: Announcement) => void;
}

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

export const AnnouncementCard = ({ announcement, onEdit, onDelete }: Props) => {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 transition hover:bg-gray-50 min-w-0 max-w-full overflow-hidden">
      <div className="flex items-start justify-between gap-3 min-w-0">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h4
            className="text-sm font-semibold text-gray-900 break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2"
            title={announcement.title}
          >
            {announcement.title}
          </h4>
          <AnnouncementTypeChip type={announcement.courseType} className="shrink-0" />
        </div>
        {(onEdit || onDelete) && (
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button
                type="button"
                aria-label="Edit announcement"
                onClick={() => onEdit(announcement)}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-white hover:text-gray-900"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label="Delete announcement"
                onClick={() => onDelete(announcement)}
                className="rounded-md p-1.5 text-gray-500 transition hover:bg-white hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <AnnouncementHtml
        html={announcement.htmlContent}
        className="prose prose-sm mt-2 max-w-none text-gray-600 min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:[overflow-wrap:anywhere] [&_*]:break-words [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all [&_p]:my-1 [&_p]:break-words [&_p]:[overflow-wrap:anywhere] [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h1]:text-gray-900 [&_h2]:text-gray-900 [&_h3]:text-gray-900 [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:overflow-x-auto [&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CourseNameChip name={announcement.courseName} />
          <StudentCountChip count={announcement.studentCount} />
        </div>
        <div className="flex shrink-0 items-center justify-end ml-auto">
          <span className="text-xs text-gray-500">{formatWhen(announcement.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};
