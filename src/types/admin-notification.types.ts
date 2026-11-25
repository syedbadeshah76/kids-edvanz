// src/types/admin-notification.types.ts

export type TargetAudience = "student" | "instructor" | "kids";
export type BackendAudience = "STUDENT" | "INSTRUCTOR" | "KIDS";

export type BackendNotificationType =
  | "WELCOME"
  | "PROMOTION"
  | "ENROLLMENT"
  | "INSTRUCTOR_REPLY"
  | "PAYMENT_SUCCESS"
  | "PASSWORD_RESET"
  | "LIVE_CLASS_REMINDER"
  | "COURSE_UPDATE"
  | "CERTIFICATE_ISSUED"
  | "PAYMENT_FAILED"
  | "LESSON_REMINDER"
  | "LIVE_CLASS_STARTING"
  | "REVIEW_REQUEST"
  | "SYSTEM_ALERT";

/** Backend notification types */
export type NotificationType = BackendNotificationType | "GENERAL" | string;

/** Raw shape returned by GET /api/admin/notifications */
export interface AdminNotificationApiResponse {
  adminNotificationId?: string;
  id?: string;
  title: string;
  message?: string;
  description?: string;
  audience?: BackendAudience | string;
  userIds?: string[];
  type?: string | null;
  priority?: string;
  scheduledAt?: string | null;
  sentAt?: string;
  createdAt?: string;
  recipientCount?: number | null;
  status?: string;
  readRate?: number;
}

/** Body for POST /api/admin/notifications */
export interface CreateAdminNotificationRequest {
  title: string;
  message: string;
  audience: BackendAudience | string;
  userIds?: string[];
  type: NotificationType | string;
  priority?: string;
  scheduledAt?: string | null;
}

/** UI model */
export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  targetAudience: TargetAudience;
  type: NotificationType | string;
  sentAt: string;
  recipientCount?: number | null;
  status?: string;
  readRate?: number;
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  targetAudience?: TargetAudience;
  audience?: BackendAudience | string;
  type?: NotificationType | string;
  userIds?: string[];
  priority?: string;
  scheduledAt?: string | null;
}

export interface NotificationStats {
  totalSent: number;
  studentNotifications: number;
  instructorNotifications: number;
  kidsNotifications?: number;
  lastSentAt: string | null;
}

export interface NotificationFilters {
  search: string;
  audience: "all" | TargetAudience;
  type: "all" | BackendNotificationType | string;
}

/** User-facing notification (GET /api/notifications) */
export interface UserNotification {
  notificationId: string;
  id?: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  createdAt: string;
}