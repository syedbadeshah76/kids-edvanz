// src/services/liveCourses.service.ts
import { apiClient, getLearningSector } from "@/lib/api-client";
import { coursesService } from "@/services/courses.service";
import { profileService } from "@/services/profile.service";
import type { ApiResponse } from "@/types/api.types";
import type {
  CreateLiveCourseApiReq,
  CreateLiveCourseDto,
  LiveCourse,
  TimezoneOption,
  UpdateLiveCourseBasicInfoApiReq,
  UpdateLiveCourseStatusApiReq,
  UpsertLiveCoursePricingApiReq,
  UpsertLiveCourseScheduleApiReq,
  WeekDay,
} from "@/types/LiveCourse.types";

const BASE = "/live-courses";

let catalogLiveCoursesCache: {
  key: string;
  timestamp: number;
  promise: Promise<any>;
} | null = null;

/** Fallback list used until GET /live-courses/timezones exists. */
const FALLBACK_TIMEZONES: TimezoneOption[] = [
  { id: "UTC", label: "UTC (Coordinated Universal Time)", country: "Global", offset: "+00:00" },
];

const WEEKDAY_MAP: Record<WeekDay, string> = {
  MON: "MONDAY",
  TUE: "TUESDAY",
  WED: "WEDNESDAY",
  THU: "THURSDAY",
  FRI: "FRIDAY",
  SAT: "SATURDAY",
  SUN: "SUNDAY",
};

/** Helper to extract un-wrapped data or raw payload */
function unwrap<T>(res: any): T {
  if (res && typeof res === "object" && "data" in res && res.data !== undefined) {
    return res.data as T;
  }
  return res as T;
}

export const liveCoursesService = {
  /** GET /live-courses/timezones */
  async listTimezones(): Promise<TimezoneOption[]> {
    try {
      const res = await apiClient.get<ApiResponse<TimezoneOption[]>>(`${BASE}/timezones`);
      const data = unwrap<TimezoneOption[]>(res);
      const filtered = Array.isArray(data) ? data.filter((tz) => tz.id === "UTC" || tz.label?.includes("UTC")) : [];
      return filtered.length ? filtered : FALLBACK_TIMEZONES;
    } catch {
      return FALLBACK_TIMEZONES;
    }
  },

  /** Helper to strip null/undefined/empty string fields from JSON payloads */
  cleanPayload<T extends Record<string, any>>(obj: T): T {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj || {})) {
      if (value !== null && value !== undefined && value !== "") {
        cleaned[key] = value;
      }
    }
    return cleaned;
  },

  /** POST /live-courses - Create Live Course */
  async create(req: CreateLiveCourseApiReq | CreateLiveCourseDto): Promise<any> {
    const payload = this.cleanPayload(req as any);
    const isUuid = (v?: string) =>
      !!v && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);

    if (!isUuid(payload.instructorId)) {
      try {
        const storedUser = localStorage.getItem("Edvanz_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (isUuid(parsed?.id)) {
            payload.instructorId = parsed.id;
          }
        }
      } catch {
        /* ignore */
      }
      if (!isUuid(payload.instructorId)) {
        try {
          const profileRes = await profileService.getProfile();
          if (isUuid(profileRes?.data?.id)) {
            payload.instructorId = profileRes.data.id;
          }
        } catch {
          /* ignore */
        }
      }
    }

    const sector = payload.learningSector || getLearningSector();
    const headers: Record<string, string> = {};
    if (sector) {
      headers["X-User-Learning-Sector"] = sector;
    }

    const res = await apiClient.post<any>(BASE, payload, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return unwrap<any>(res);
  },

  /** PATCH /live-courses/{id} - Update Live Course */
  async update(id: string, req: Partial<any>): Promise<any> {
    const payload = this.cleanPayload(req as any);
    const sector = payload.learningSector || getLearningSector();
    const headers: Record<string, string> = {};
    if (sector) {
      headers["X-User-Learning-Sector"] = sector;
    }
    const res = await apiClient.patch<any>(`${BASE}/${id}`, payload, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return unwrap<any>(res);
  },

  /** PATCH /live-courses/{id}/basic-info - Update Live Course Basic Info */
  async updateBasicInfo(id: string, req: UpdateLiveCourseBasicInfoApiReq): Promise<any> {
    const payload = this.cleanPayload(req as any);
    if (!payload.pdfUrl && Array.isArray((req as any).resourceUrls) && (req as any).resourceUrls.length > 0) {
      payload.pdfUrl = (req as any).resourceUrls[0];
    }
    delete payload.resourceUrls;
    delete payload.slug;
    const sector = payload.learningSector || getLearningSector();
    const headers: Record<string, string> = {};
    if (sector) {
      headers["X-User-Learning-Sector"] = sector;
    }
    const res = await apiClient.patch<any>(`${BASE}/${id}/basic-info`, payload, {
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
    return unwrap<any>(res);
  },

  /** PATCH /live-courses/{id}/schedule - Upsert Live Course Schedule */
  async upsertSchedule(id: string, req: UpsertLiveCourseScheduleApiReq): Promise<any> {
    const res = await apiClient.patch<any>(`${BASE}/${id}/schedule`, req);
    return unwrap<any>(res);
  },

  /** PATCH /live-courses/{id}/pricing - Upsert Live Course Pricing */
  async upsertPricing(id: string, req: UpsertLiveCoursePricingApiReq): Promise<any> {
    const res = await apiClient.patch<any>(`${BASE}/${id}/pricing`, req);
    return unwrap<any>(res);
  },

  /** POST /live-courses/{id}/status - Update Live Course Status */
  async updateStatus(id: string, req: UpdateLiveCourseStatusApiReq): Promise<any> {
    const res = await apiClient.post<any>(`${BASE}/${id}/status`, req);
    return unwrap<any>(res);
  },

  /** GET /live-courses - List Live Courses */
  async list(params?: Record<string, any>): Promise<any> {
    const activeSector = (params?.learningSector || getLearningSector()).toUpperCase();
    const res = await apiClient.get<any>(BASE, {
      params: { ...params, learningSector: activeSector },
    });
    return unwrap<any>(res);
  },

  /** GET /catalog/live-courses?status=PUBLISHED - Get Catalog Live Courses */
  async getCatalogLiveCourses(params?: Record<string, any>): Promise<any> {
    const activeSector = (params?.learningSector || getLearningSector()).toUpperCase();
    const cacheKey = JSON.stringify({ activeSector, ...(params || {}) });
    if (
      catalogLiveCoursesCache &&
      catalogLiveCoursesCache.key === cacheKey &&
      Date.now() - catalogLiveCoursesCache.timestamp < 30000
    ) {
      return catalogLiveCoursesCache.promise;
    }

    const fetchPromise = (async () => {
      try {
        const res = await apiClient.get<any>("/catalog/live-courses", {
          params: { status: "PUBLISHED", ...params, learningSector: activeSector },
        });
        const unwrapRes = unwrap<any>(res);
        const list = Array.isArray(unwrapRes)
          ? unwrapRes
          : Array.isArray(unwrapRes?.content)
          ? unwrapRes.content
          : Array.isArray(unwrapRes?.data)
          ? unwrapRes.data
          : [];

        // Sector filter: KIDS sees KIDS, IT sees IT
        return list.filter((item: any) => {
          const sector = (item.learningSector || (activeSector === "KIDS" ? "" : "IT")).toUpperCase();
          return activeSector === "KIDS" ? sector === "KIDS" : sector !== "KIDS";
        });
      } catch (err) {
        catalogLiveCoursesCache = null;
        console.error("Failed to fetch catalog live courses:", err);
        return [];
      }
    })();

    catalogLiveCoursesCache = {
      key: cacheKey,
      timestamp: Date.now(),
      promise: fetchPromise,
    };

    return fetchPromise;
  },

  /** GET /student/live-courses?filter=ALL|UPCOMING|ONGOING|COMPLETED&search=&page=&size= */
  async getStudentLiveCourses(
    params: { filter?: "ALL" | "UPCOMING" | "ONGOING" | "COMPLETED"; search?: string; page?: number; size?: number } = {},
  ): Promise<any> {
    const { filter = "ALL", search, page = 0, size = 10 } = params;
    const queryParams: Record<string, any> = { filter, page, size };
    if (search) queryParams.search = search;
    const res = await apiClient.get<any>("/student/live-courses", { params: queryParams });
    return unwrap<any>(res);
  },

  /** GET /live-courses/{id} - Get Live Course */
  async getById(id: string): Promise<any> {
    console.log("🔥 LIVE COURSE DETAIL ID:", id);
    const res = await apiClient.get<any>(`${BASE}/${id}`);
      console.log("🔥 LIVE COURSE DETAIL RESPONSE:", res);
    return unwrap<any>(res);
  },

  async get(id: string): Promise<any> {
    return this.getById(id);
  },

  /** GET /live-courses/{id}/enrolled-count */
  async getEnrolledCount(id: string): Promise<any> {
    const res = await apiClient.get<any>(`${BASE}/${id}/enrolled-count`);
    return unwrap<any>(res);
  },

  /** DELETE /live-courses/{id} - Delete Live Course */
  async delete(id: string): Promise<any> {
    const res = await apiClient.delete<any>(`${BASE}/${id}`);
    return unwrap<any>(res);
  },

  /** GET /live-courses/admin - List Live Courses (Admin) */
  async listAdmin(params?: Record<string, any>): Promise<any> {
    const res = await apiClient.get<any>(`${BASE}/admin`, { params });
    return unwrap<any>(res);
  },

  /** POST /live-courses/{id}/submit - Submit Live Course for Admin Approval */
  async submit(id: string): Promise<any> {
    const res = await apiClient.post<any>(`${BASE}/${id}/submit`, {});
    return unwrap<any>(res);
  },

  /** POST /live-courses/{id}/move-to-draft - Move Live Course back to draft */
  async moveToDraft(id: string): Promise<any> {
    const res = await apiClient.post<any>(`${BASE}/${id}/move-to-draft`, {});
    return unwrap<any>(res);
  },

  /** POST /live-courses/{id}/publish - Publish Approved Live Course */
  async publish(id: string): Promise<any> {
    const res = await apiClient.post<any>(`${BASE}/${id}/publish`, {});
    return unwrap<any>(res);
  },

  /** GET /admin/live-courses - Get Admin Submitted Live Courses list */
  async getAdminSubmittedList(params: Record<string, any> = { status: "SUBMITTED", page: 0, size: 20 }): Promise<any> {
    const res = await apiClient.get<any>("/admin/live-courses", { params });
    return unwrap<any>(res);
  },

  /** GET /admin/live-courses/{id} - Get Admin Live Course Detail */
  async getAdminDetail(id: string): Promise<any> {
    const res = await apiClient.get<any>(`/admin/live-courses/${id}`);
    return unwrap<any>(res);
  },

  /** POST /admin/live-courses/{id}/approve - Approve Live Course */
  async approve(id: string): Promise<any> {
    const res = await apiClient.post<any>(`/admin/live-courses/${id}/approve`, {});
    return unwrap<any>(res);
  },

  /** POST /admin/live-courses/{id}/reject - Reject Live Course with Rejection Reason */
  async reject(id: string, rejectionReason: string): Promise<any> {
    const res = await apiClient.post<any>(`/admin/live-courses/${id}/reject`, { rejectionReason });
    return unwrap<any>(res);
  },

  /** Upload media using AWS S3 Pre-Signed URL flow (LIVE_COURSE_THUMBNAIL, LIVE_PROMO_VIDEO, LIVE_COURSE_PDF) */
  async uploadMedia(
    file: File,
    kind: "thumbnail" | "promo" | "resource",
    resourceId: string = "live-course",
    onProgress?: (pct: number) => void,
  ): Promise<any> {
    const uploadType =
      kind === "thumbnail"
        ? "LIVE_COURSE_THUMBNAIL"
        : kind === "promo"
        ? "LIVE_PROMO_VIDEO"
        : "LIVE_COURSE_PDF";

    try {
      const res = await coursesService.uploadFileToS3(file, uploadType, resourceId, { onProgress });
      return { success: true, data: { url: res.url, key: res.key } };
    } catch {
      // Fallback to multipart if presigned S3 upload is not configured
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      const res = await apiClient.post<any>(`${BASE}/media`, form, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(pct);
          }
        },
      });
      return unwrap<any>(res);
    }
  },

  /**
   * Unified Orchestrator: Creates a live course using the exact required sequence:
   * 1. POST /api/live-courses (Create Live Course -> returns live_course_id)
   * 2. Presigned URL uploads (thumbnail, promo video, resources)
   * 3. PATCH /api/live-courses/{id}/schedule (Upsert Schedule - MUST succeed first)
   * 4. PATCH /api/live-courses/{id}/basic-info (Update Basic Info with media URLs)
   * 5. PATCH /api/live-courses/{id}/pricing (Upsert Pricing)
   * 6. POST /api/live-courses/{id}/status (Publish Live Course)
   */
  async createFullLiveCourse(dto: CreateLiveCourseDto): Promise<any> {
    const slug = dto.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Step 1: Create Live Course API
    const basicReq: CreateLiveCourseApiReq = {
      title: dto.title,
      slug: slug || `live-course-${Date.now()}`,
      description: dto.description,
      categoryId: dto.categoryId,
      subcategoryId: dto.subcategoryId || dto.subcategory || "",
      language: dto.language || "English",
      level: (dto.level || "INTERMEDIATE").toUpperCase(),
      learningSector: dto.learningSector || "IT",
    };

    const createdRes = await this.create(basicReq);
    const courseId = String(createdRes?.id ?? createdRes?.data?.id ?? createdRes?.courseId ?? "");

    if (!courseId) {
      throw new Error("Failed to create live course.");
    }

    // Step 2: Schedule API (Must succeed before Basic Info)
    const sessionDaysStr = (dto.sessionDays || ["MON", "WED", "FRI"])
      .map((d) => WEEKDAY_MAP[d as WeekDay] || d)
      .join(",");

    const startTimeFormatted = dto.startTime
      ? dto.startTime.split(":").length === 2
        ? `${dto.startTime}:00`
        : dto.startTime
      : "10:00:00";
    const endTimeFormatted = dto.endTime
      ? dto.endTime.split(":").length === 2
        ? `${dto.endTime}:00`
        : dto.endTime
      : "11:30:00";

    const deadlineFormatted = dto.enrollmentDeadline
      ? dto.enrollmentDeadline.includes("T")
        ? dto.enrollmentDeadline
        : `${dto.enrollmentDeadline}T23:59:59`
      : `${dto.startDate || "2026-09-01"}T23:59:59`;

    const scheduleReq: UpsertLiveCourseScheduleApiReq = {
      meetingPlatform: dto.meetingPlatform || "ZOOM",
      customMeetingLink: dto.customMeetingLink,
      timezone: dto.timezone || "UTC",
      startDate: dto.startDate,
      endDate: dto.endDate,
      sessionDays: sessionDaysStr,
      sessionStartTime: startTimeFormatted,
      sessionEndTime: endTimeFormatted,
      maxSeats: dto.maximumSeats ?? 50,
      enrollmentDeadline: deadlineFormatted,
      enableWaitingList: !!dto.enableWaitingList,
      autoRecordSessions: !!dto.recordSessions,
      attendanceRequired: !!dto.attendanceRequired,
      enableLiveChat: !!dto.enableLiveChat,
    };

    await this.upsertSchedule(courseId, scheduleReq);

    // Step 3: Basic Info API (Called only AFTER Schedule API succeeds)
    const updateBasicReq: UpdateLiveCourseBasicInfoApiReq = {
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      subcategoryId: dto.subcategoryId || dto.subcategory || undefined,
      language: dto.language || "English",
      level: (dto.level || "INTERMEDIATE").toUpperCase(),
      learningSector: dto.learningSector || "IT",
      thumbnailUrl: dto.thumbnailUrl,
      promoVideoUrl: dto.promoVideoUrl,
      pdfUrl: dto.resourceUrls?.[0],
    };

    await this.updateBasicInfo(courseId, updateBasicReq);

    // Step 4: Pricing API
    const origPrice = Number(dto.originalPrice ?? dto.basePrice ?? 0);
    const discPrice = dto.discountedPrice != null ? Number(dto.discountedPrice) : undefined;
    const pricingReq: UpsertLiveCoursePricingApiReq = {
      accessType: dto.accessType || "PAID",
      originalPrice: origPrice,
      discountedPrice: discPrice,
      basePrice: origPrice,
      visibility: dto.visibility || "PUBLIC",
    };

    await this.upsertPricing(courseId, pricingReq);

    // Step 5: Submit API for Admin Approval (moves status from DRAFT -> SUBMITTED)
    await this.submit(courseId);

    return { id: courseId, success: true };
  },
};
