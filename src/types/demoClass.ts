// src/types/demoClass.ts

export type DemoClassProvider = "ZOOM";

/** Payload for POST /api/demo-classes */
export interface CreateDemoClassReq {
  liveCourseId: string;
  title: string;
  description: string;
  scheduledAt: string; // ISO string e.g. "2026-08-30T16:50:00"
  duration: number; // e.g. 90
  provider: DemoClassProvider | string;
}

/** Response from backend for Demo Class item */
export interface DemoClassItem {
  id: string;
  liveCourseId: string;
  hostInstructorId?: string;
  title: string;
  description?: string;
  learningSector?: "IT" | "KIDS" | string;
  meetingId?: string;
  joinUrl?: string;
  startUrl?: string;
  meetingPassword?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  durationMinutes?: number;
  status: string; // "SCHEDULED", etc.
  provider: DemoClassProvider | string;
  booked?: boolean;
  courseTitle?: string;
  courseThumbnail?: string;
  instructorName?: string;
  scheduledAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Response for POST /api/demo-classes/{id}/book */
export interface BookDemoClassResponse {
  demoClassId: string;
  booked: boolean;
  message?: string;
}

/** Response for POST /api/demo-classes/{id}/start */
export interface StartDemoClassResponse {
  startUrl?: string;
  joinUrl?: string;
  message?: string;
}

/** Admin Demo Class Booking item from GET /api/demo-classes/admin/demo-class-bookings */
export interface AdminDemoClassBooking {
  bookingId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string | null;
  demoClassId: string;
  demoClassTitle: string;
  courseId: string;
  courseTitle: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  bookedAt: string;
}

export interface DemoClassPaginationParams {
  page?: number;
  size?: number;
}

export interface PaginatedDemoClassResult<T> {
  items: T[];
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

