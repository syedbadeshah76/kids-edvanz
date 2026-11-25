import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PaginationMeta } from "@/types/meeting.types";

interface Props {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export const MeetingPagination = ({
  meta,
  onPageChange,
  onPageSizeChange,
}: Props) => {
  const { page, totalPages, totalItems, pageSize } = meta;
  if (totalItems === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-gray-500">
          Showing <span className="font-medium text-gray-700">{start}</span>–
          <span className="font-medium text-gray-700">{end}</span> of{" "}
          <span className="font-medium text-gray-700">{totalItems}</span>
        </p>
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 outline-none focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 p-0 rounded-lg border-gray-200 text-gray-600 disabled:opacity-40"
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-gray-400 text-xs">
              …
            </span>
          ) : (
            <Button
              key={p}
              size="sm"
              onClick={() => onPageChange(p)}
              className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-semibold transition-colors ${
                p === page
                  ? "bg-[#1D61E7] hover:bg-blue-700 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 p-0 rounded-lg border-gray-200 text-gray-600 disabled:opacity-40"
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
