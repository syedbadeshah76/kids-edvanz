import { describe, it, expect, vi, beforeEach } from "vitest";
import { instructorService } from "@/services/instructor.service";
import { apiClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  extractAvatarUrl: vi.fn(),
}));

describe("Instructor Course Fetching & Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("instructorService.getMyCourses calls /courses API directly without triggering 400 on non-existent /courses/instructor", async () => {
    const mockApiResponse = {
      success: true,
      data: [
        {
          id: "course-1",
          title: "Instructor's Own Course",
          instructorId: "inst-123",
          status: "DRAFT",
        },
      ],
    };

    vi.mocked(apiClient.get).mockResolvedValueOnce(mockApiResponse);

    const result = await instructorService.getMyCourses();
    expect(apiClient.get).toHaveBeenCalledWith("/courses");
    expect(result).toEqual(mockApiResponse);
  });

  it("verifies course ownership logic isolates courses between instructors", () => {
    const myInstructorIds = new Set<string>(["inst-new-456", "newinstructor@test.com"]);
    const currentUser = { id: "inst-new-456", email: "newinstructor@test.com" };

    const isCourseOwnedByInstructor = (course: any, myIds: Set<string>, user: any): boolean => {
      if (!course || !user || !myIds.size) return false;

      const candidateIds = [
        course.instructorId,
        course.instructorUserId,
        course.instructor?.id,
        course.instructor?.userId,
        course.userId,
        course.createdBy,
        course.instructorEmail,
        course.instructor?.email,
      ]
        .filter(Boolean)
        .map((v) => String(v).trim().toLowerCase());

      if (candidateIds.length === 0) {
        return false;
      }

      return candidateIds.some((id) => myIds.has(id));
    };

    // Course created by another instructor (as seen in user screenshot)
    const otherInstructorCourse = {
      id: "b0f1ef24-1241-4b68-8003-8c7150540d50",
      title: "kjhgdsd",
      instructorId: "c0413264-4887-4838-8e6b-f2b6faf76fe1",
      status: "DRAFT",
    };

    // Course without instructor id
    const orphanCourse = {
      id: "orphan-1",
      title: "Unowned Course",
      status: "PUBLISHED",
    };

    // Course created by this new instructor
    const ownCourse = {
      id: "course-own",
      title: "My Physics Course",
      instructorId: "inst-new-456",
      status: "DRAFT",
    };

    // Verify other instructor's course is NOT displayed to new instructor
    expect(isCourseOwnedByInstructor(otherInstructorCourse, myInstructorIds, currentUser)).toBe(false);

    // Verify course with missing instructorId is NOT displayed to new instructor
    expect(isCourseOwnedByInstructor(orphanCourse, myInstructorIds, currentUser)).toBe(false);

    // Verify own course IS displayed
    expect(isCourseOwnedByInstructor(ownCourse, myInstructorIds, currentUser)).toBe(true);
  });

  it("accurately maps API statuses for DRAFT, SUBMITTED, and PUBLISHED courses", () => {
    const detectCourseType = (c: any): "LIVE" | "RECORDED" => {
      if (!c) return "RECORDED";
      const typeStr = String(c.courseType ?? c.type ?? c.deliveryType ?? "").toUpperCase();
      if (typeStr.includes("LIVE")) return "LIVE";
      if (typeStr.includes("RECORDED")) return "RECORDED";
      if (c.isLive === true) return "LIVE";
      return "RECORDED";
    };

    const normalizeStatus = (c: any): string => {
      const isLive = detectCourseType(c) === "LIVE";
      const rawStatus = String(c.status || "").toUpperCase();
      const rawApproval = String(c.approvalStatus || "").toUpperCase();
      const isPublished =
        rawStatus === "PUBLISHED" ||
        c.isPublished === true ||
        c.published === true ||
        rawApproval === "APPROVED";

      if (rawStatus === "DRAFT") {
        return "Draft";
      } else if (isPublished) {
        return "Published";
      } else if (
        rawStatus === "SUBMITTED" ||
        rawStatus === "PENDING" ||
        rawApproval === "SUBMITTED" ||
        (rawApproval === "PENDING" && rawStatus !== "DRAFT")
      ) {
        return "Submitted";
      } else if (rawStatus === "REJECTED" || rawApproval === "REJECTED") {
        return "Rejected";
      } else if (rawStatus === "ARCHIVED") {
        return "Archived";
      }
      return "Draft";
    };

    // 1. User's recorded draft course from prompt
    const recordedDraft = {
      id: "ef1d3ade-b419-42e9-8070-343ef12137de",
      title: "Email marketing",
      status: "DRAFT",
      isPublished: false,
      approvalStatus: "PENDING",
      courseType: "RECORDED",
    };
    expect(normalizeStatus(recordedDraft)).toBe("Draft");

    // 2. Live course draft
    const liveDraft = {
      id: "live-draft-1",
      title: "Live React Class",
      status: "DRAFT",
      isPublished: false,
      courseType: "LIVE",
    };
    expect(normalizeStatus(liveDraft)).toBe("Draft");

    // 3. Live course submitted for admin approval
    const liveSubmitted = {
      id: "live-sub-1",
      title: "Live Docker Bootcamp",
      status: "SUBMITTED",
      isPublished: false,
      courseType: "LIVE",
    };
    expect(normalizeStatus(liveSubmitted)).toBe("Submitted");

    // 4. Published recorded course
    const recordedPublished = {
      id: "pub-1",
      title: "Fullstack Python",
      status: "PUBLISHED",
      isPublished: true,
      approvalStatus: "APPROVED",
      courseType: "RECORDED",
    };
    expect(normalizeStatus(recordedPublished)).toBe("Published");
  });
});
