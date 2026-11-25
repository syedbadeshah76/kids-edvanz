// src/services/demoClass.service.ts
import { apiClient, getLearningSector } from "@/lib/api-client";
import { liveCoursesService } from "@/services/liveCourses.service";
import { instructorsService } from "@/services/instructors.service";
import { profileService } from "@/services/profile.service";
import { meetingService } from "@/services/meeting.service";
import type {
  CreateDemoClassReq,
  DemoClassItem,
  BookDemoClassResponse,
  StartDemoClassResponse,
  AdminDemoClassBooking,
} from "@/types/demoClass";

const BASE = "/demo-classes";

/** Helper to extract data unwrapped from ApiResponse or raw response */
const unwrap = <T>(res: any): T => {
  if (res && typeof res === "object" && "data" in res && res.data !== undefined) {
    return res.data as T;
  }
  return res as T;
};

async function resolveMyInstructorIds(user: any): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!user) return ids;

  if (user.id) ids.add(String(user.id).toLowerCase());
  if (user.email) ids.add(String(user.email).toLowerCase());

  try {
    const meRes: any = await instructorsService.getMyProfile().catch(() => null);
    const data = meRes?.data ?? meRes;
    if (data?.id) ids.add(String(data.id).toLowerCase());
    if (data?.userId) ids.add(String(data.userId).toLowerCase());
  } catch {
    /* non-fatal */
  }

  try {
    const profRes: any = await profileService.getProfile().catch(() => null);
    const data = profRes?.data ?? profRes;
    if (data?.id) ids.add(String(data.id).toLowerCase());
  } catch {
    /* non-fatal */
  }

  try {
    const list = await instructorsService.list().catch(() => []);
    const matched = list.filter(
      (i: any) =>
        (user.id &&
          (String(i.userId).toLowerCase() === String(user.id).toLowerCase() ||
            String(i.id).toLowerCase() === String(user.id).toLowerCase())) ||
        (user.email &&
          i.email &&
          String(i.email).toLowerCase() === String(user.email).toLowerCase())
    );
    matched.forEach((m: any) => {
      if (m.id) ids.add(String(m.id).toLowerCase());
      if (m.userId) ids.add(String(m.userId).toLowerCase());
    });
  } catch {
    /* non-fatal */
  }

  return ids;
}

export function parseDemoDate(dateVal: any): number | null {
  if (!dateVal) return null;
  if (typeof dateVal === "number") {
    return dateVal < 10000000000 ? dateVal * 1000 : dateVal;
  }
  if (Array.isArray(dateVal)) {
    const [y, m, d, h = 0, min = 0, s = 0] = dateVal;
    const localD = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    return !isNaN(localD.getTime()) ? localD.getTime() : null;
  }
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (!trimmed) return null;

    // Numeric epoch timestamp string
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = Number(trimmed);
      return num < 10000000000 ? num * 1000 : num;
    }

    // Explicit timezone offset (+05:30, -04:00, Z)
    const hasExplicitTz = /[zZ]|([+-]\d{2}:?\d{2})$/.test(trimmed);
    if (hasExplicitTz) {
      const parsed = new Date(trimmed).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // Local ISO format: YYYY-MM-DD[T or space]HH:mm(:ss)?
    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (match) {
      const [, y, m, d, h = "0", min = "0", s = "0"] = match;
      const localDate = new Date(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(h),
        Number(min),
        Number(s)
      );
      if (!isNaN(localDate.getTime())) {
        return localDate.getTime();
      }
    }

    const fallback = new Date(trimmed).getTime();
    if (!isNaN(fallback)) return fallback;
  }
  return null;
}

export const demoClassService = {
  /**
   * Instructor: Create Demo Live Class
   * POST /api/demo-classes
   */
  async createDemoClass(data: CreateDemoClassReq): Promise<DemoClassItem> {
    const res = await apiClient.post<any>(BASE, data);
    return unwrap<DemoClassItem>(res);
  },

  /**
   * Student: Book Demo Live Class
   * POST /api/demo-classes/{demoClassId}/book
   */
  async bookDemoClass(demoClassId: string): Promise<BookDemoClassResponse> {
    const res = await apiClient.post<any>(`${BASE}/${demoClassId}/book`, {});
    return unwrap<BookDemoClassResponse>(res);
  },

  /**
   * Student: Join Demo Live Class
   * GET /api/demo-classes/{demoClassId}/join
   */
  async joinDemoClass(demoClassId: string): Promise<any> {
    try {
      const res = await apiClient.get<any>(`${BASE}/${demoClassId}/join`);
      return unwrap<any>(res);
    } catch (err: any) {
      throw err;
    }
  },

  /**
   * Student: Get all booked & scheduled Live Demo Classes for the student dashboard
   */
  async getStudentBookedDemoClasses(_user?: any): Promise<DemoClassItem[]> {
    const bookedMap = new Map<string, DemoClassItem>();

    // 1. Read previously cached demo classes from localStorage
    try {
      const rawCached = localStorage.getItem("edvanz_cached_demo_classes");
      if (rawCached) {
        const parsed = JSON.parse(rawCached);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item?.id) bookedMap.set(String(item.id), item);
          });
        }
      }
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("demo_classes_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (item?.id) bookedMap.set(String(item.id), item);
              });
            }
          }
        }
      }
    } catch {}

    const now = Date.now();
    const resultList = Array.from(bookedMap.values()).filter((d) => {
      const start = parseDemoDate(d.scheduledStartAt || (d as any).scheduledAt);
      if (!start) return true;
      const duration = (d.durationMinutes || 90) * 60 * 1000;
      const end = parseDemoDate(d.scheduledEndAt) || (start + duration);
      // Keep if session ends in future or ended within last 3 hours
      return end >= (now - 3 * 60 * 60 * 1000);
    });

    // Sort chronologically ascending
    resultList.sort((a, b) => {
      const tA = parseDemoDate(a.scheduledStartAt || (a as any).scheduledAt) || 0;
      const tB = parseDemoDate(b.scheduledStartAt || (b as any).scheduledAt) || 0;
      return tA - tB;
    });

    return resultList;
  },

  /**
   * Instructor / Admin: Delete Demo Live Class
   * DELETE /api/demo-classes/{demoClassId}
   */
  async deleteDemoClass(demoClassId: string): Promise<any> {
    const res = await apiClient.delete<any>(`${BASE}/${demoClassId}`);
    return unwrap<any>(res);
  },

  /**
   * Instructor: Start Demo Live Class
   * POST /api/demo-classes/{demoClassId}/start
   */
  async startDemoClass(demoClassId: string): Promise<StartDemoClassResponse> {
    const res = await apiClient.post<any>(`${BASE}/${demoClassId}/start`, {});
    return unwrap<StartDemoClassResponse>(res);
  },

  /**
   * Get Demo Live Class by ID
   * GET /api/demo-classes/{demoClassId}
   */
  async getDemoClass(demoClassId: string): Promise<DemoClassItem> {
    const res = await apiClient.get<any>(`${BASE}/${demoClassId}`);
    return unwrap<DemoClassItem>(res);
  },

  /**
   * Public: Get catalog demo classes for Home Page
   * GET /api/catalog/demo-classes?page=0&size=2
   */
  async getCatalogDemoClasses(page: number = 0, size: number = 2): Promise<DemoClassItem[] & {
    items: DemoClassItem[];
    content: DemoClassItem[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
  }> {
    try {
      const res = await apiClient.get<any>("/catalog/demo-classes", {
        params: { page, size },
      });
      const data = unwrap<any>(res);
      const items: DemoClassItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const totalElements = typeof data?.totalElements === "number" ? data.totalElements : items.length;
      const totalPages = typeof data?.totalPages === "number" ? data.totalPages : 1;
      const currentPage = typeof data?.number === "number" ? data.number : page;
      const pageSize = typeof data?.size === "number" ? data.size : size;

      const result: any = [...items];
      result.items = items;
      result.content = items;
      result.totalElements = totalElements;
      result.totalPages = totalPages;
      result.page = currentPage;
      result.size = pageSize;
      return result;
    } catch (err) {
      console.error("Failed to fetch catalog demo classes:", err);
      const empty: any = [];
      empty.items = [];
      empty.content = [];
      empty.totalElements = 0;
      empty.totalPages = 0;
      empty.page = page;
      empty.size = size;
      return empty;
    }
  },

  /**
   * Get Demo Live Classes for a specific live course
   * GET /api/demo-classes/course/{liveCourseId}
   */
  async getDemoClassesByCourse(liveCourseId: string): Promise<DemoClassItem[]> {
    try {
      const res = await apiClient.get<any>(`${BASE}/course/${liveCourseId}`);
      const list = unwrap<any>(res);
      let items: DemoClassItem[] = [];
      if (Array.isArray(list)) items = list;
      else if (Array.isArray(list?.content)) items = list.content;
      else if (Array.isArray(list?.data)) items = list.data;

      if (items.length > 0) {
        return items.map((item: any) => ({
          ...item,
          courseId: item.liveCourseId || item.courseId || liveCourseId,
          liveCourseId: item.liveCourseId || item.courseId || liveCourseId,
        }));
      }
    } catch {
      /* Fall back to public catalog demo classes endpoint */
    }

    try {
      const catalogDemos = await this.getCatalogDemoClasses();
      if (Array.isArray(catalogDemos) && catalogDemos.length > 0) {
        const filtered = catalogDemos.filter(
          (d: any) =>
            String(d.courseId || d.course_id) === String(liveCourseId) ||
            String(d.demoClassId || d.id) === String(liveCourseId)
        );
        return filtered;
      }
    } catch {
      /* ignore */
    }

    return [];
  },

  /**
   * Get all Demo Live Classes for the instructor across all their Live Courses
   */
  async getInstructorDemoClasses(user: any): Promise<(DemoClassItem & { courseTitle?: string })[]> {
    try {
      const instructorCourses = await this.getInstructorLiveCourses(user);
      if (!instructorCourses || instructorCourses.length === 0) {
        return [];
      }

      const results = await Promise.allSettled(
        instructorCourses.map(async (c) => {
          const list = await this.getDemoClassesByCourse(c.id);
          return list.map((item) => ({
            ...item,
            courseTitle: c.title,
          }));
        })
      );

      const allDemoClasses: (DemoClassItem & { courseTitle?: string })[] = [];
      results.forEach((res) => {
        if (res.status === "fulfilled" && Array.isArray(res.value)) {
          allDemoClasses.push(...res.value);
        }
      });

      return allDemoClasses;
    } catch (err) {
      console.error("Failed to load instructor demo classes:", err);
      return [];
    }
  },

  /**
   * Get the instructor's own Live Courses for dropdown selection and fetching demo classes
   */
  async getInstructorLiveCourses(user: any): Promise<{ id: string; title: string }[]> {
    try {
      const myInstructorIds = await resolveMyInstructorIds(user);
      const liveRes: any = await liveCoursesService.list().catch(() => []);
      const rawList = Array.isArray(liveRes)
        ? liveRes
        : Array.isArray(liveRes?.content)
        ? liveRes.content
        : Array.isArray(liveRes?.data)
        ? liveRes.data
        : Array.isArray(liveRes?.liveCourses?.content)
        ? liveRes.liveCourses.content
        : [];

      // Determine active learning sector to enforce sector isolation
      const activeSector = (user?.learningSector || getLearningSector() || "").toUpperCase();

      const filtered = rawList.filter((course: any) => {
        if (!course || (!course.id && !course.liveCourseId)) return false;

        // Sector isolation: IT instructors see IT courses; KIDS instructors see KIDS courses
        if (activeSector && course.learningSector) {
          const courseSector = String(course.learningSector).toUpperCase();
          if (activeSector === "KIDS" && courseSector !== "KIDS") return false;
          if (activeSector === "IT" && courseSector === "KIDS") return false;
        }

        // Check instructor ownership if candidate IDs and resolved IDs are available
        const candidateIds = [
          course.instructorId,
          course.instructorUserId,
          course.instructor?.id,
          course.instructor?.userId,
          course.userId,
          course.createdBy,
        ]
          .filter(Boolean)
          .map((v) => String(v).trim().toLowerCase());

        if (candidateIds.length > 0 && myInstructorIds.size > 0) {
          const hasMatch = candidateIds.some((id) => myInstructorIds.has(id));
          if (hasMatch) return true;
        }

        if (user?.id && candidateIds.length > 0) {
          const hasUserMatch = candidateIds.includes(String(user.id).trim().toLowerCase());
          if (hasUserMatch) return true;
        }

        // Endpoint /api/live-courses is already scoped to the authenticated instructor by backend
        return true;
      });

      return filtered
        .map((c: any) => ({
          id: String(c.id || c.liveCourseId || ""),
          title: c.title || "Live Course",
        }))
        .filter((c: any) => !!c.id);
    } catch (e) {
      console.error("Failed to list live courses for instructor:", e);
      return [];
    }
  },

  /**
   * Admin: Get all demo class bookings across the platform
   * GET /api/demo-classes/admin/demo-class-bookings?page=0&size=5
   */
  async getAdminDemoClassBookings(
    page: number = 0,
    size: number = 5,
    search?: string,
    status?: string,
    courseTitle?: string
  ): Promise<AdminDemoClassBooking[] & {
    items: AdminDemoClassBooking[];
    content: AdminDemoClassBooking[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
  }> {
    try {
      const params: Record<string, any> = { page, size };
      if (search?.trim()) params.search = search.trim();
      if (status && status !== "ALL") params.status = status;
      if (courseTitle && courseTitle !== "ALL") params.courseTitle = courseTitle;

      const res = await apiClient.get<any>(`${BASE}/admin/demo-class-bookings`, { params });
      const data = unwrap<any>(res);
      const items: AdminDemoClassBooking[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.content)
        ? data.content
        : Array.isArray(data?.data)
        ? data.data
        : [];

      const totalElements = typeof data?.totalElements === "number" ? data.totalElements : items.length;
      const totalPages = typeof data?.totalPages === "number" ? data.totalPages : 1;
      const currentPage = typeof data?.number === "number" ? data.number : page;
      const pageSize = typeof data?.size === "number" ? data.size : size;

      const result: any = [...items];
      result.items = items;
      result.content = items;
      result.totalElements = totalElements;
      result.totalPages = totalPages;
      result.page = currentPage;
      result.size = pageSize;
      return result;
    } catch (err) {
      console.error("Failed to fetch admin demo class bookings:", err);
      const empty: any = [];
      empty.items = [];
      empty.content = [];
      empty.totalElements = 0;
      empty.totalPages = 0;
      empty.page = page;
      empty.size = size;
      return empty;
    }
  },
};
