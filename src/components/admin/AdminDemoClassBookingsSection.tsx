import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Download,
  Filter,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import { demoClassService } from "@/services/demoClass.service";
import type { AdminDemoClassBooking } from "@/types/demoClass";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function getInitials(name?: string): string {
  if (!name) return "ST";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split("T")[0] || dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getBookingStatus(scheduledStartAt: string, scheduledEndAt: string): {
  label: string;
  variant: "registered" | "upcoming" | "attended" | "completed";
} {
  const now = Date.now();
  const start = new Date(scheduledStartAt).getTime();
  const end = new Date(scheduledEndAt).getTime();

  if (isNaN(start)) {
    return { label: "Registered", variant: "registered" };
  }

  if (now < start - 24 * 60 * 60 * 1000) {
    return { label: "Registered", variant: "registered" };
  }
  if (now < start) {
    return { label: "Upcoming", variant: "upcoming" };
  }
  if (now >= start && (isNaN(end) || now <= end)) {
    return { label: "Attended", variant: "attended" };
  }
  return { label: "Completed", variant: "completed" };
}

export const AdminDemoClassBookingsSection = () => {
  const [bookings, setBookings] = useState<AdminDemoClassBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("ALL");
  const [selectedBooking, setSelectedBooking] = useState<AdminDemoClassBooking | null>(null);

  // Pagination state (matches backend GET /api/demo-classes/admin/demo-class-bookings?page=0&size=5)
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(5);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchBookings() {
      setLoading(true);
      try {
        const data = await demoClassService.getAdminDemoClassBookings(
          page,
          pageSize,
          searchQuery,
          selectedStatusFilter,
          selectedCourseFilter
        );
        if (isMounted) {
          const items = data?.items ?? (Array.isArray(data) ? data : []);
          setBookings(items);
          setTotalElements(data?.totalElements ?? items.length);
          setTotalPages(
            data?.totalPages ?? Math.max(1, Math.ceil((data?.totalElements ?? items.length) / pageSize))
          );
        }
      } catch (err) {
        console.error("Error loading admin demo class bookings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchBookings();
    return () => {
      isMounted = false;
    };
  }, [page, pageSize, searchQuery, selectedCourseFilter, selectedStatusFilter]);

  // Unique list of course titles for filter dropdown
  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    bookings.forEach((b) => {
      if (b.courseTitle) set.add(b.courseTitle);
    });
    return Array.from(set);
  }, [bookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Search text match
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = (b.studentName || "").toLowerCase().includes(q);
        const matchEmail = (b.studentEmail || "").toLowerCase().includes(q);
        const matchCourse = (b.courseTitle || "").toLowerCase().includes(q);
        const matchDemo = (b.demoClassTitle || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchCourse && !matchDemo) {
          return false;
        }
      }

      // Course filter
      if (selectedCourseFilter !== "ALL" && b.courseTitle !== selectedCourseFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter !== "ALL") {
        const { label } = getBookingStatus(b.scheduledStartAt, b.scheduledEndAt);
        if (label.toLowerCase() !== selectedStatusFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, searchQuery, selectedCourseFilter, selectedStatusFilter]);

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) return;
    const headers = [
      "Booking ID",
      "Student Name",
      "Student Email",
      "Student Phone",
      "Demo Class Title",
      "Course Title",
      "Scheduled Start",
      "Scheduled End",
      "Booked At",
    ];

    const rows = filteredBookings.map((b) => [
      b.bookingId,
      `"${b.studentName || ""}"`,
      `"${b.studentEmail || ""}"`,
      `"${b.studentPhone || ""}"`,
      `"${b.demoClassTitle || ""}"`,
      `"${b.courseTitle || ""}"`,
      b.scheduledStartAt || "",
      b.scheduledEndAt || "",
      b.bookedAt || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `demo-class-bookings-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 lg:p-6 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Demo Classes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage live demo class bookings and student participation.
          </p>
        </div>

        <Button
          onClick={handleExportCSV}
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-2 text-xs font-semibold self-start sm:self-auto cursor-pointer"
        >
          <Download className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {/* Search */}
        <div className="relative md:col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search students, email or course..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9 text-xs h-9 rounded-xl border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Course Filter */}
        <select
          value={selectedCourseFilter}
          onChange={(e) => {
            setSelectedCourseFilter(e.target.value);
            setPage(0);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="ALL">All courses</option>
          {courseOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Instructor Filter */}
        <select
          defaultValue="ALL"
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="ALL">All instructors</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatusFilter}
          onChange={(e) => {
            setSelectedStatusFilter(e.target.value);
            setPage(0);
          }}
          className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          <option value="ALL">All statuses</option>
          <option value="registered">Registered</option>
          <option value="upcoming">Upcoming</option>
          <option value="attended">Attended</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table Container with Controlled Scroll Limit */}
      <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="max-h-[440px] overflow-y-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider font-extrabold text-slate-500 dark:text-slate-400 z-10">
              <tr>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-4 py-3.5">Email / Mobile</th>
                <th className="px-4 py-3.5">Demo course</th>
                <th className="px-4 py-3.5">Instructor</th>
                <th className="px-4 py-3.5">Dates</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-950">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="h-7 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => {
                  const initials = getInitials(booking.studentName);
                  const dateFormatted = formatDate(booking.scheduledStartAt);
                  const timeFormatted = formatTime(booking.scheduledStartAt);
                  const { label, variant } = getBookingStatus(
                    booking.scheduledStartAt,
                    booking.scheduledEndAt
                  );

                  return (
                    <tr
                      key={booking.bookingId}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors text-xs"
                    >
                      {/* Student */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-blue-600 text-white font-bold text-xs shrink-0">
                            <AvatarFallback className="bg-blue-600 text-white font-bold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {booking.studentName || "Student"}
                            </p>
                            {/* <p className="text-[11px] text-slate-400 truncate">
                              STU-{booking.studentId?.slice(0, 4) || "1048"}
                            </p> */}
                          </div>
                        </div>
                      </td>

                      {/* Email / Mobile */}
                      <td className="px-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-slate-600 dark:text-slate-300 truncate">
                            {booking.studentEmail || "—"}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {booking.studentPhone || "—"}
                          </p>
                        </div>
                      </td>

                      {/* Demo Course */}
                      <td className="px-4 py-3.5">
                        <div className="min-w-0 max-w-[200px]">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {booking.demoClassTitle || booking.courseTitle || "Demo Class"}
                          </p>
                          {booking.courseTitle && booking.courseTitle !== booking.demoClassTitle && (
                            <p className="text-[11px] text-slate-400 truncate">
                              {booking.courseTitle}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Instructor */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 bg-indigo-600 text-white font-bold text-[10px] shrink-0">
                            <AvatarFallback className="bg-indigo-600 text-white font-bold text-[10px]">
                              ED
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                            Edvanz Expert
                          </span>
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {dateFormatted}
                          </p>
                          {timeFormatted && (
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                              {timeFormatted}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {variant === "registered" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Registered
                          </span>
                        )}
                        {variant === "upcoming" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Upcoming
                          </span>
                        )}
                        {variant === "attended" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Attended
                          </span>
                        )}
                        {variant === "completed" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                            <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                            Completed
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          onClick={() => setSelectedBooking(booking)}
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    <p className="text-sm font-medium">No demo class bookings found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls (backend: /api/demo-classes/admin/demo-class-bookings?page=0&size=5) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Showing{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {totalElements === 0 ? 0 : page * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {Math.min((page + 1) * pageSize, totalElements)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {totalElements}
            </span>{" "}
            bookings
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-background text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>per page</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-center sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="h-8 px-3 text-xs rounded-lg"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum = i;
              if (totalPages > 5 && page > 2) {
                pageNum = Math.min(page - 2 + i, totalPages - 1);
              }
              const isActive = page === pageNum;
              return (
                <Button
                  key={pageNum}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`h-8 w-8 p-0 text-xs rounded-lg ${
                    isActive ? "bg-blue-600 text-white hover:bg-blue-700" : ""
                  }`}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="h-8 px-3 text-xs rounded-lg"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Booking Details</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Full information for demo class booking
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedBooking.studentName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Email:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedBooking.studentEmail}
                  </span>
                </div>
                {selectedBooking.studentPhone && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Phone:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {selectedBooking.studentPhone}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Demo Class Title:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedBooking.demoClassTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Course Title:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedBooking.courseTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Start Time:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {formatDate(selectedBooking.scheduledStartAt)} {formatTime(selectedBooking.scheduledStartAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">End Time:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {formatDate(selectedBooking.scheduledEndAt)} {formatTime(selectedBooking.scheduledEndAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Booked At:</span>
                  <span className="text-slate-500">
                    {formatDate(selectedBooking.bookedAt)} {formatTime(selectedBooking.bookedAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDemoClassBookingsSection;
