import { useMemo } from "react";
import { sanitizeHtml } from "@/lib/announcement.utils";
import { cn } from "@/lib/utils";

interface Props {
  html: string;
  className?: string;
}

export const AnnouncementHtml = ({ html, className }: Props) => {
  const safe = useMemo(() => sanitizeHtml(html), [html]);
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none text-gray-700 min-w-0 max-w-full overflow-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:[overflow-wrap:anywhere] [&_*]:break-words [&_a]:text-blue-600 [&_a]:underline [&_a]:break-all [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-gray-900 [&_p]:my-1 [&_p]:break-words [&_p]:[overflow-wrap:anywhere] [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_table]:overflow-x-auto [&_table]:max-w-full [&_img]:max-w-full [&_img]:h-auto",
        className
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
};
