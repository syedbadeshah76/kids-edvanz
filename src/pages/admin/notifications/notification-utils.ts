// src/pages/admin/notifications/notification-utils.ts
import type { BackendNotificationType, TargetAudience } from "@/types/admin-notification.types";

export const AUDIENCE_LABELS: Record<TargetAudience, string> = {
  student: "Students",
  instructor: "Instructors",
  kids: "Kids",
};

export const AUDIENCE_BADGE_CLASSES: Record<TargetAudience, string> = {
  student: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  instructor: "bg-purple-100 text-purple-700 hover:bg-purple-100",
  kids: "bg-amber-100 text-amber-700 hover:bg-amber-100",
};

export const NOTIFICATION_TYPE_OPTIONS: { value: BackendNotificationType; label: string }[] = [
  { value: "WELCOME", label: "Welcome" },
  { value: "PROMOTION", label: "Promotion" },
  { value: "ENROLLMENT", label: "Enrollment" },
  { value: "INSTRUCTOR_REPLY", label: "Instructor Reply" },
  { value: "PAYMENT_SUCCESS", label: "Payment Success" },
  { value: "PASSWORD_RESET", label: "Password Reset" },
  { value: "LIVE_CLASS_REMINDER", label: "Live Class Reminder" },
  { value: "COURSE_UPDATE", label: "Course Update" },
  { value: "CERTIFICATE_ISSUED", label: "Certificate Issued" },
  { value: "PAYMENT_FAILED", label: "Payment Failed" },
  { value: "LESSON_REMINDER", label: "Lesson Reminder" },
  { value: "LIVE_CLASS_STARTING", label: "Live Class Starting" },
  { value: "REVIEW_REQUEST", label: "Review Request" },
  { value: "SYSTEM_ALERT", label: "System Alert" },
];

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  WELCOME: "Welcome",
  PROMOTION: "Promotion",
  ENROLLMENT: "Enrollment",
  INSTRUCTOR_REPLY: "Instructor Reply",
  PAYMENT_SUCCESS: "Payment Success",
  PASSWORD_RESET: "Password Reset",
  LIVE_CLASS_REMINDER: "Live Class Reminder",
  COURSE_UPDATE: "Course Update",
  CERTIFICATE_ISSUED: "Certificate Issued",
  PAYMENT_FAILED: "Payment Failed",
  LESSON_REMINDER: "Lesson Reminder",
  LIVE_CLASS_STARTING: "Live Class Starting",
  REVIEW_REQUEST: "Review Request",
  SYSTEM_ALERT: "System Alert",
  GENERAL: "General",
};

export const NOTIFICATION_TYPE_BADGE_CLASSES: Record<string, string> = {
  WELCOME: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200",
  PROMOTION: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200",
  ENROLLMENT: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200",
  INSTRUCTOR_REPLY: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200",
  PAYMENT_SUCCESS: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200",
  PASSWORD_RESET: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200",
  LIVE_CLASS_REMINDER: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200",
  COURSE_UPDATE: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200",
  CERTIFICATE_ISSUED: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border-teal-200",
  PAYMENT_FAILED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200",
  LESSON_REMINDER: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border-cyan-200",
  LIVE_CLASS_STARTING: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200",
  REVIEW_REQUEST: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300 border-violet-200",
  SYSTEM_ALERT: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200",
  GENERAL: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200",
};

export function getNotificationTypeLabel(type?: string | null): string {
  if (!type) return "General";
  const upper = String(type).toUpperCase();
  if (NOTIFICATION_TYPE_LABELS[upper]) return NOTIFICATION_TYPE_LABELS[upper];
  return upper.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getNotificationTypeBadgeClass(type?: string | null): string {
  if (!type) return NOTIFICATION_TYPE_BADGE_CLASSES.GENERAL;
  const upper = String(type).toUpperCase();
  return NOTIFICATION_TYPE_BADGE_CLASSES[upper] ?? NOTIFICATION_TYPE_BADGE_CLASSES.GENERAL;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
