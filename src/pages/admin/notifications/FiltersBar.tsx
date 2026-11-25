import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import type {
  NotificationFilters,
  TargetAudience,
} from "@/types/admin-notification.types";
import { NOTIFICATION_TYPE_OPTIONS } from "./notification-utils";

interface FiltersBarProps {
  filters: NotificationFilters;
  onChange: (filters: NotificationFilters) => void;
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search notifications..."
          className="pl-9"
          aria-label="Search notifications"
        />
      </div>
      <Select
        value={filters.audience}
        onValueChange={(value) =>
          onChange({ ...filters, audience: value as TargetAudience | "all" })
        }
      >
        <SelectTrigger className="w-full sm:w-44" aria-label="Filter by audience">
          <SelectValue placeholder="All audiences" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All audiences</SelectItem>
          <SelectItem value="student">Students</SelectItem>
          <SelectItem value="instructor">Instructors</SelectItem>
          <SelectItem value="kids">Kids</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={filters.type}
        onValueChange={(value) =>
          onChange({ ...filters, type: value })
        }
      >
        <SelectTrigger className="w-full sm:w-48" aria-label="Filter by type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {NOTIFICATION_TYPE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default FiltersBar;
