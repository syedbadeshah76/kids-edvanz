import type { CourseType } from "@/types/announcement.types";
import { cn } from "@/lib/utils";

interface Props {
  type: CourseType;
  className?: string;
}

export const AnnouncementTypeChip = ({ type, className }: Props) => {
  const label = type === "live" ? "Live" : "Recorded";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-medium text-white",
        className
      )}
    >
      {label}
    </span>
  );
};
