// ============================================================
// Instructors Service
// Backend: GET /api/users/instructors
// Response: [{ id, userId, firstName, lastName }]
//   - `id`         => instructor profile id (used by the admin dropdown)
//   - `userId`     => auth user id (the value /api/courses expects)
// ============================================================
import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/lib/api-client";

export interface InstructorDTO {
  id: string;          // instructor profile id
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string;
  avatar?: string;
  name?: string;
  fullName?: string;
  displayName?: string;
}

export interface InstructorOption {
  id: string;          // instructor profile id
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
}

let cachedInstructors: InstructorOption[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

const unwrap = <T,>(res: any): T => (res && typeof res === "object" && "data" in res ? res.data : res) as T;

export const instructorsService = {
  async list(): Promise<InstructorOption[]> {
    if (cachedInstructors && Date.now() - lastCacheTime < CACHE_TTL_MS) {
      return cachedInstructors;
    }

    try {
      const res = await apiClient.get<ApiResponse<InstructorDTO[]> | InstructorDTO[]>(
        "/users/instructors",
        { params: { page: 0, size: 100 } }
      );
      const raw: any[] = Array.isArray(res)
        ? res
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : Array.isArray((res as any)?.content)
        ? (res as any).content
        : Array.isArray((res as any)?.instructors)
        ? (res as any).instructors
        : Array.isArray((res as any)?.users)
        ? (res as any).users
        : Array.isArray((res as any)?.result)
        ? (res as any).result
        : [];

      const mapped = raw.map((i: any) => {
        const nameFromFirstLast = `${(i.firstName || "").trim()} ${(i.lastName || "").trim()}`.trim();
        const parsedName =
          nameFromFirstLast ||
          i.name ||
          i.fullName ||
          i.displayName ||
          i.username;

        return {
          id: String(i.id ?? i.instructorId ?? i.instructorProfileId ?? ""),
          userId: String(i.userId ?? i.id ?? ""),
          name: parsedName && parsedName.toLowerCase() !== "instructor" ? parsedName : "Instructor",
          email: i.email,
          avatar: i.avatarUrl || i.avatar || i.profileImageUrl || i.imageUrl,
        };
      });

      if (mapped.length > 0) {
        cachedInstructors = mapped;
        lastCacheTime = Date.now();
      }

      return mapped;
    } catch (err) {
      console.error("Failed to load instructors list:", err);
      return cachedInstructors || [];
    }
  },

  /**
   * Helper to extract instructor name/slug/id from an AWS S3 course media URL
   * e.g. /instructors/syed-badeshah_5d8b9348-3919-4884-991b-5ba7ab1af2aa/courses/...
   */
  extractInstructorFromMediaUrl(mediaUrl?: string): { id?: string; name?: string; slug?: string } | null {
    if (!mediaUrl || typeof mediaUrl !== "string") return null;

    // Pattern 1: /instructors/{slug}_{uuid}/
    const matchWithId = mediaUrl.match(/\/instructors\/([^\/_]+)_([0-9a-fA-F-]{36})\//i);
    if (matchWithId) {
      const slug = matchWithId[1];
      const id = matchWithId[2];
      const name = slug
        .split(/[-_]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
      return { id, slug, name };
    }

    // Pattern 2: /instructors/{slug}/
    const matchSlug = mediaUrl.match(/\/instructors\/([^\/]+)\//i);
    if (matchSlug) {
      const rawSlug = matchSlug[1];
      if (!rawSlug.includes(".")) {
        const name = rawSlug
          .split(/[-_]+/)
          .filter(Boolean)
          .filter((part) => !/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(part))
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");
        return { slug: rawSlug, name: name || undefined };
      }
    }

    return null;
  },

  /**
   * Resolve an instructor's details for a given course using /users/instructors data
   */
  async resolveInstructorForCourse(course: any): Promise<InstructorOption | null> {
    if (!course) return null;
    const c: any = course;

    const targetId = String(
      c.instructorUserId ??
      c.instructorId ??
      c.instructor_id ??
      (typeof c.instructor === "object" ? c.instructor?.userId ?? c.instructor?.id : undefined) ??
      ""
    ).trim();

    const mediaUrl = String(
      c.thumbnailUrl ?? c.thumbnail ?? c.coverImage ?? c.promoVideoUrl ?? c.pdfUrl ?? ""
    );
    const mediaExtracted = this.extractInstructorFromMediaUrl(mediaUrl);
    const candidateId = targetId || mediaExtracted?.id || "";

    const instructors = await this.list();

    // 1. Try matching by candidate ID in instructors list
    if (candidateId && instructors.length > 0) {
      const matched = instructors.find(
        (i) =>
          (i.userId && String(i.userId).toLowerCase() === candidateId.toLowerCase()) ||
          (i.id && String(i.id).toLowerCase() === candidateId.toLowerCase())
      );
      if (matched && matched.name && matched.name.toLowerCase() !== "instructor") {
        return matched;
      }
    }

    // 2. Try direct API lookup for candidate ID if not matched in list
    if (candidateId) {
      try {
        const directRes = await apiClient.get<any>(`/users/instructors/${candidateId}`);
        const d = unwrap<any>(directRes) ?? directRes;
        if (d && (d.firstName || d.name || d.displayName)) {
          const parsedName =
            `${(d.firstName || "").trim()} ${(d.lastName || "").trim()}`.trim() ||
            d.name ||
            d.fullName ||
            d.displayName;
          if (parsedName && parsedName.toLowerCase() !== "instructor") {
            return {
              id: String(d.id ?? candidateId),
              userId: String(d.userId ?? candidateId),
              name: parsedName,
              email: d.email,
              avatar: d.avatarUrl || d.avatar || d.profileImageUrl,
            };
          }
        }
      } catch {
        /* ignore */
      }
    }

    // 3. Try matching by slug from media URL against instructor names
    const candidateSlug = (mediaExtracted?.slug || "").toLowerCase();
    if (candidateSlug && instructors.length > 0) {
      const matchedBySlug = instructors.find((i) => {
        const iSlug = i.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return iSlug === candidateSlug || iSlug.includes(candidateSlug) || candidateSlug.includes(iSlug);
      });
      if (matchedBySlug && matchedBySlug.name && matchedBySlug.name.toLowerCase() !== "instructor") {
        return matchedBySlug;
      }
    }

    // 4. Check direct course instructor name
    const directName = typeof c.instructor === "object"
      ? c.instructor?.name
      : (c.instructorName ?? (typeof c.instructor === "string" ? c.instructor : ""));

    if (directName && typeof directName === "string" && directName.trim().toLowerCase() !== "instructor" && !directName.includes("-")) {
      const matchedByName = instructors.find((i) => i.name.toLowerCase() === directName.trim().toLowerCase());
      if (matchedByName) return matchedByName;
      return {
        id: candidateId,
        userId: candidateId,
        name: directName.trim(),
      };
    }

    // 5. Fallback to name extracted from media URL
    if (mediaExtracted?.name) {
      return {
        id: candidateId || mediaExtracted.id || "",
        userId: candidateId || mediaExtracted.id || "",
        name: mediaExtracted.name,
      };
    }

    return null;
  },

  async getById(idOrUserId: string): Promise<InstructorOption | null> {
    if (!idOrUserId) return null;
    const target = idOrUserId.trim().toLowerCase();
    const instructors = await this.list();
    const found = instructors.find(
      (i) =>
        String(i.userId).toLowerCase() === target ||
        String(i.id).toLowerCase() === target
    );
    if (found) return found;

    try {
      const directRes = await apiClient.get<any>(`/users/instructors/${target}`);
      const d = unwrap<any>(directRes) ?? directRes;
      if (d && (d.firstName || d.name || d.displayName)) {
        const parsedName =
          `${(d.firstName || "").trim()} ${(d.lastName || "").trim()}`.trim() ||
          d.name ||
          d.fullName ||
          d.displayName;
        return {
          id: String(d.id ?? target),
          userId: String(d.userId ?? target),
          name: parsedName || "Instructor",
          email: d.email,
          avatar: d.avatarUrl || d.avatar || d.profileImageUrl,
        };
      }
    } catch {
      /* ignore */
    }

    return null;
  },
};
