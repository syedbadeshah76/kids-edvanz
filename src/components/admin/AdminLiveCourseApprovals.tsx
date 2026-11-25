import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Eye, Loader2, Video, Calendar, User, BookOpen } from "lucide-react";
import { liveCoursesService } from "@/services/liveCourses.service";
import { useToast } from "@/hooks/use-toast";

interface AdminLiveCourseItem {
  id: string;
  title: string;
  instructorName?: string;
  instructorEmail?: string;
  categoryName?: string;
  subcategoryName?: string;
  status: string;
  submittedAt?: string;
  startDate?: string;
  endDate?: string;
  basePrice?: number;
  accessType?: string;
  thumbnailUrl?: string;
  maxSeats?: number;
  meetingPlatform?: string;
}

export function AdminLiveCourseApprovals() {
  const { toast } = useToast();
  const [courses, setCourses] = useState<AdminLiveCourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  // Rejection modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingCourseId, setRejectingCourseId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Detail view modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<any>(null);

  const fetchSubmittedCourses = async () => {
    try {
      setLoading(true);
      const res = await liveCoursesService.getAdminSubmittedList({ status: "SUBMITTED", page: 0, size: 50 });
      const items = Array.isArray(res)
        ? res
        : Array.isArray(res?.content)
        ? res.content
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : [];

      setCourses(
        items.map((item: any) => ({
          id: String(item.id || item.liveCourseId || ""),
          title: item.title || item.liveCourse?.title || "Untitled Live Course",
          instructorName:
            item.instructorName ||
            item.instructor?.name ||
            `${item.instructor?.firstName || ""} ${item.instructor?.lastName || ""}`.trim() ||
            "Instructor",
          instructorEmail: item.instructorEmail || item.instructor?.email || "",
          categoryName: item.categoryName || item.category?.name || item.category || "General",
          subcategoryName: item.subcategoryName || item.subcategory?.name || "",
          status: item.status || item.liveCourse?.status || "SUBMITTED",
          submittedAt: item.submittedAt || item.createdAt || item.updatedAt,
          startDate: item.startDate || item.schedule?.startDate,
          basePrice: Number(item.discountedPrice ?? item.pricing?.discountedPrice ?? item.originalPrice ?? item.pricing?.originalPrice ?? item.basePrice ?? item.pricing?.basePrice ?? 0),
          accessType: item.accessType || item.pricing?.accessType || "PAID",
          thumbnailUrl: item.thumbnailUrl || item.liveCourse?.thumbnailUrl || "",
          maxSeats: item.maxSeats || item.schedule?.maxSeats,
          meetingPlatform: item.meetingPlatform || item.schedule?.meetingPlatform || "ZOOM",
        }))
      );
    } catch (err: any) {
      console.error("Failed to load submitted live courses:", err);
      toast({
        title: "Could not load live course approvals",
        description: err?.message || "Please check backend connection.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmittedCourses();
  }, []);

  const handleApprove = async (id: string) => {
    setActionBusyId(id);
    try {
      await liveCoursesService.approve(id);
      try {
        await liveCoursesService.publish(id);
      } catch {
        /* publish endpoint optional if approve already publishes */
      }
      toast({ title: "Live Course Approved", description: "The live course is now published and active." });
      setCourses((prev) => prev.filter((c) => c.id !== id));
      if (detailModalOpen && selectedCourseDetail?.id === id) {
        setDetailModalOpen(false);
      }
    } catch (err: any) {
      toast({
        title: "Approval failed",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingCourseId(id);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingCourseId) return;
    if (!rejectionReason.trim()) {
      toast({ title: "Rejection reason required", description: "Please explain why the course was rejected.", variant: "destructive" });
      return;
    }

    setActionBusyId(rejectingCourseId);
    try {
      await liveCoursesService.reject(rejectingCourseId, rejectionReason.trim());
      toast({ title: "Live Course Rejected", description: "The instructor has been notified with the rejection reason." });
      setCourses((prev) => prev.filter((c) => c.id !== rejectingCourseId));
      setRejectModalOpen(false);
      if (detailModalOpen && selectedCourseDetail?.id === rejectingCourseId) {
        setDetailModalOpen(false);
      }
    } catch (err: any) {
      toast({
        title: "Rejection failed",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleViewDetails = async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const detail = await liveCoursesService.getAdminDetail(id);
      setSelectedCourseDetail(detail?.data ?? detail);
    } catch (err: any) {
      toast({ title: "Could not load course details", description: err?.message, variant: "destructive" });
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Live Course Approvals</h2>
          <p className="text-xs text-muted-foreground">
            Review and approve pending live course submissions from instructors.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubmittedCourses} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-2 text-sm">Loading pending live course submissions...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground">
          <Video className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="text-sm font-medium text-foreground">No Pending Live Courses</p>
          <p className="text-xs">All submitted live courses have been reviewed.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Course</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded bg-muted">
                        {course.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                            <Video className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{course.title}</p>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                            {course.meetingPlatform}
                          </Badge>
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>
                      <p className="font-medium text-foreground">{course.instructorName}</p>
                      {course.instructorEmail && (
                        <p className="text-xs text-muted-foreground">{course.instructorEmail}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="rounded bg-muted px-2 py-0.5 text-xs text-foreground font-medium">
                      {course.categoryName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {course.accessType === "FREE" ? (
                      <Badge variant="secondary">Free</Badge>
                    ) : (
                      <span className="font-medium text-foreground">₹{course.basePrice?.toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {course.submittedAt ? new Date(course.submittedAt).toLocaleDateString() : "Recently"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleViewDetails(course.id)}
                        title="View Details"
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleApprove(course.id)}
                        disabled={actionBusyId === course.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 gap-1 text-xs"
                      >
                        {actionBusyId === course.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectModal(course.id)}
                        disabled={actionBusyId === course.id}
                        className="h-8 gap-1 text-xs"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject Reason Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Live Course</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this live course. The instructor will review this feedback.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Please provide a more detailed syllabus and verify schedule dates."
              rows={4}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject} disabled={!rejectionReason.trim()}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Course Detail View Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submitted Live Course Detail</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">Loading detail...</p>
            </div>
          ) : selectedCourseDetail ? (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                <h3 className="text-base font-semibold text-foreground">
                  {selectedCourseDetail.liveCourse?.title || selectedCourseDetail.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedCourseDetail.liveCourse?.description || selectedCourseDetail.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground font-medium">Instructor</p>
                  <p className="font-semibold text-foreground">
                    {selectedCourseDetail.instructor?.name || selectedCourseDetail.instructorName || "Instructor"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedCourseDetail.instructor?.email || selectedCourseDetail.instructorEmail}
                  </p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground font-medium">Category</p>
                  <p className="font-semibold text-foreground">
                    {selectedCourseDetail.categoryName || selectedCourseDetail.category?.name || "General"}
                  </p>
                </div>
              </div>

              {selectedCourseDetail.schedule && (
                <div className="rounded-lg border p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Live Schedule Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Platform: </span>
                      <span className="font-medium text-foreground">{selectedCourseDetail.schedule.meetingPlatform}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timezone: </span>
                      <span className="font-medium text-foreground">{selectedCourseDetail.schedule.timezone}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start Date: </span>
                      <span className="font-medium text-foreground">{selectedCourseDetail.schedule.startDate}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End Date: </span>
                      <span className="font-medium text-foreground">{selectedCourseDetail.schedule.endDate}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Session Days: </span>
                      <span className="font-medium text-foreground">{selectedCourseDetail.schedule.sessionDays}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Seats: </span>
                      <span className="font-medium text-foreground">{selectedCourseDetail.schedule.maxSeats}</span>
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-4 gap-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleApprove(selectedCourseDetail.id || selectedCourseDetail.liveCourse?.id)}
                >
                  <Check className="mr-1.5 h-4 w-4" /> Approve & Publish
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openRejectModal(selectedCourseDetail.id || selectedCourseDetail.liveCourse?.id)}
                >
                  <X className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No detail available.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
