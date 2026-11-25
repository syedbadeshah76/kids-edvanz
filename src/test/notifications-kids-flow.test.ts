import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminNotificationsService } from "@/services/admin-notifications.service";
import { notificationsService as kidzNotificationsService } from "@/services/kidz/notifications.service";
import { apiClient as adminApiClient } from "@/lib/api-client";
import { apiClient as kidzApiClient } from "@/lib/kidz/kidz-api-client";
import {
  AUDIENCE_LABELS,
  AUDIENCE_BADGE_CLASSES,
} from "@/pages/admin/notifications/notification-utils";

vi.mock("@/lib/api-client", () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: mockClient,
    default: mockClient,
  };
});

vi.mock("@/lib/kidz/kidz-api-client", () => {
  const mockClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    apiClient: mockClient,
    unwrapData: vi.fn((res) => {
      if (res && typeof res === "object" && "data" in res) {
        return (res as any).data;
      }
      return res;
    }),
    unwrapArray: vi.fn((res) => {
      const data = res && typeof res === "object" && "data" in res ? (res as any).data : res;
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object") {
        if (Array.isArray((data as any).content)) return (data as any).content;
        if (Array.isArray((data as any).items)) return (data as any).items;
      }
      return [];
    }),
  };
});

describe("Admin Notifications - KIDS Audience Support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem("userId", "353cf165-6301-4562-9806-f689a7334de4");
  });

  it("exposes KIDS audience labels and badge styles", () => {
    expect(AUDIENCE_LABELS.kids).toBe("Kids");
    expect(AUDIENCE_BADGE_CLASSES.kids).toContain("amber");
  });

  it("creates notification with audience: 'KIDS' when targeting kids", async () => {
    vi.mocked(adminApiClient.post).mockResolvedValueOnce({
      id: "dcf605e9-dee6-4c4e-aed2-322eb255a846",
      title: "New Course Available",
      message: "Check out our new Advanced React course, now live!",
      audience: "KIDS",
      type: "COURSE_UPDATE",
    });

    await adminNotificationsService.createNotification({
      title: "New Course Available",
      message: "Check out our new Advanced React course, now live!",
      targetAudience: "kids",
      type: "COURSE_UPDATE",
      priority: "MEDIUM",
    });

    expect(adminApiClient.post).toHaveBeenCalledWith(
      "/admin/notifications",
      expect.objectContaining({
        title: "New Course Available",
        message: "Check out our new Advanced React course, now live!",
        audience: "KIDS",
        type: "COURSE_UPDATE",
        priority: "MEDIUM",
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-User-Id": "353cf165-6301-4562-9806-f689a7334de4",
        }),
      }),
    );
  });

  it("maps backend audience: 'KIDS' to UI targetAudience: 'kids'", async () => {
    vi.mocked(adminApiClient.get).mockResolvedValueOnce([
      {
        id: "dcf605e9-dee6-4c4e-aed2-322eb255a846",
        title: "New Course Available",
        message: "Check out our new Advanced React course, now live!",
        audience: "KIDS",
        type: "COURSE_UPDATE",
        createdAt: "2026-10-22T13:40:10.155465579",
      },
      {
        id: "abc-1",
        title: "Student Alert",
        message: "Welcome to class",
        audience: "STUDENT",
        type: "WELCOME",
        createdAt: "2026-10-22T12:00:00Z",
      },
      {
        id: "def-2",
        title: "Instructor Update",
        message: "New review available",
        audience: "INSTRUCTOR",
        type: "REVIEW_REQUEST",
        createdAt: "2026-10-22T11:00:00Z",
      },
    ]);

    const notifications = await adminNotificationsService.getNotifications();

    expect(notifications).toHaveLength(3);
    expect(notifications[0].targetAudience).toBe("kids");
    expect(notifications[1].targetAudience).toBe("student");
    expect(notifications[2].targetAudience).toBe("instructor");

    const stats = await adminNotificationsService.getStats(notifications);
    expect(stats.totalSent).toBe(3);
    expect(stats.kidsNotifications).toBe(1);
    expect(stats.studentNotifications).toBe(1);
    expect(stats.instructorNotifications).toBe(1);
  });
});

describe("Kidz Notifications Service (GET /api/notifications)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches notifications and correctly maps backend contract response", async () => {
    const mockBackendResponse = [
      {
        id: "44ec81e1-6c8e-476f-8830-6bf24e770d00",
        title: "New Course Available",
        message: "Check out our new Advanced React course, now live!",
        type: "course_update",
        read: false,
        createdAt: "2026-10-22T13:40:10.251345",
      },
      {
        id: "old-1",
        title: "Welcome Kidz!",
        message: "Start your learning journey today.",
        type: "WELCOME",
        read: true,
        createdAt: "2026-10-21T10:00:00.000Z",
      },
    ];

    vi.mocked(kidzApiClient.get).mockResolvedValueOnce(mockBackendResponse);

    const items = await kidzNotificationsService.getNotifications();

    expect(kidzApiClient.get).toHaveBeenCalledWith("/notifications");
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      id: "44ec81e1-6c8e-476f-8830-6bf24e770d00",
      title: "New Course Available",
      message: "Check out our new Advanced React course, now live!",
      type: "course_update",
      read: false,
      actionUrl: undefined,
      createdAt: expect.any(String),
    });
    expect(items[0].read).toBe(false);
    expect(items[1].read).toBe(true);
  });

  it("marks individual notification as read via PUT /notifications/{id}/read", async () => {
    vi.mocked(kidzApiClient.put).mockResolvedValueOnce({});

    await kidzNotificationsService.markAsRead("44ec81e1-6c8e-476f-8830-6bf24e770d00");

    expect(kidzApiClient.put).toHaveBeenCalledWith(
      "/notifications/44ec81e1-6c8e-476f-8830-6bf24e770d00/read",
    );
  });

  it("marks all notifications as read via PUT /notifications/read-all", async () => {
    vi.mocked(kidzApiClient.put).mockResolvedValueOnce({});

    await kidzNotificationsService.markAllAsRead();

    expect(kidzApiClient.put).toHaveBeenCalledWith("/notifications/read-all");
  });

  it("fetches unread count from /notifications/count or falls back gracefully", async () => {
    vi.mocked(kidzApiClient.get).mockResolvedValueOnce({ count: 4 });

    const count = await kidzNotificationsService.getUnreadCount();
    expect(count).toBe(4);
    expect(kidzApiClient.get).toHaveBeenCalledWith("/notifications/count");
  });
});
