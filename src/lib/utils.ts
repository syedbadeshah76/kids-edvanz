import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getDemoVideo } from "@/lib/demo-videos";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number, currency: string = "INR"): string {
  const code = (currency || "INR").toUpperCase();
  const symbol = code === "USD" ? "$" : code === "INR" ? "₹" : code;
  const locale = code === "USD" ? "en-US" : "en-IN";
  return `${symbol}${Number(amount || 0).toLocaleString(locale)}`;
}

export function extractThumbnailUrl(source: any): string | null {
  if (!source) return null;

  let raw: any = source;
  if (typeof source === "object") {
    raw =
      source.thumbnailUrl ||
      source.thumbnail_url ||
      source.thumbnail ||
      source.imageUrl ||
      source.image_url ||
      source.image ||
      source.courseThumbnail;
  }

  if (typeof raw !== "string" || !raw.trim()) return null;

  let cleaned = raw.trim();

  // Decode URI encoding if present e.g. %22 -> "
  try {
    cleaned = decodeURIComponent(cleaned);
  } catch {}

  // 1. Handle markdown link syntax e.g. [text](https://...)
  const mdMatch = cleaned.match(/\]\(([^)]+)\)/);
  if (mdMatch && mdMatch[1]) {
    cleaned = mdMatch[1].trim();
  }

  // 2. Extract http(s) URL if surrounded by extra text or quotes
  const httpMatch = cleaned.match(/(https?:\/\/[^\s"'\)`]+)/i);
  if (httpMatch && httpMatch[1]) {
    cleaned = httpMatch[1].trim();
  }

  // 3. Strip trailing/leading quotes, brackets, or invalid chars
  cleaned = cleaned.replace(/^["'\(\[\s]+|["'\)\]\s]+$/g, "").trim();

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("/")) {
    return cleaned;
  }

  return null;
}

export function extractVideoUrl(source: any, curriculum: any[] = []): string | null {
  if (!source && (!curriculum || !curriculum.length)) return null;

  const candidateKeys = [
    "promoVideoUrl",
    "promo_video_url",
    "promoVideo",
    "promo_video",
    "previewVideoUrl",
    "preview_video_url",
    "previewVideo",
    "preview_video",
    "demoVideoUrl",
    "demo_video_url",
    "demoVideo",
    "demo_video",
    "introVideoUrl",
    "intro_video_url",
    "introVideo",
    "intro_video",
    "trailerUrl",
    "trailer_url",
    "trailer",
    "videoUrl",
    "video_url",
    "video",
    "sampleVideoUrl",
    "sample_video_url",
    "url",
  ];

  let rawUrl: string | null = null;

  if (source && typeof source === "object") {
    for (const key of candidateKeys) {
      const val = source[key];
      if (typeof val === "string" && val.trim().length > 0) {
        rawUrl = val.trim();
        break;
      }
    }
  }

  // Check curriculum modules / lessons (passed in or attached to source)
  const modulesToCheck = (Array.isArray(curriculum) && curriculum.length > 0)
    ? curriculum
    : (Array.isArray(source?.modules) && source.modules.length > 0)
    ? source.modules
    : (Array.isArray(source?.sections) && source.sections.length > 0)
    ? source.sections
    : (Array.isArray(source?.curriculum) && source.curriculum.length > 0)
    ? source.curriculum
    : [];

  if (!rawUrl && modulesToCheck.length > 0) {
    // 1. Look for free preview lesson with videoUrl
    for (const mod of modulesToCheck) {
      const lessons = mod.lessons || mod.items || [];
      if (Array.isArray(lessons)) {
        for (const l of lessons) {
          const vUrl = l.videoUrl || l.video_url || l.mediaUrl || l.media_url || l.streamUrl || l.url || l.contentUrl || l.fileUrl;
          if (vUrl && typeof vUrl === "string" && vUrl.trim().length > 0 && (l.isFreePreview || l.previewEnabled || l.isPreview || l.allowPreview)) {
            rawUrl = vUrl.trim();
            break;
          }
        }
      }
      if (rawUrl) break;
    }

    // 2. If no free preview marked, check any lesson in curriculum with a valid videoUrl
    if (!rawUrl) {
      for (const mod of modulesToCheck) {
        const lessons = mod.lessons || mod.items || [];
        if (Array.isArray(lessons)) {
          for (const l of lessons) {
            const vUrl = l.videoUrl || l.video_url || l.mediaUrl || l.media_url || l.streamUrl || l.url || l.contentUrl || l.fileUrl;
            if (vUrl && typeof vUrl === "string" && vUrl.trim().length > 0) {
              rawUrl = vUrl.trim();
              break;
            }
          }
        }
        if (rawUrl) break;
      }
    }
  }

  // Check direct lessons array on course
  if (!rawUrl && Array.isArray(source?.lessons) && source.lessons.length > 0) {
    for (const l of source.lessons) {
      const vUrl = l.videoUrl || l.video_url || l.mediaUrl || l.media_url || l.streamUrl || l.url || l.contentUrl || l.fileUrl;
      if (vUrl && typeof vUrl === "string" && vUrl.trim().length > 0) {
        rawUrl = vUrl.trim();
        break;
      }
    }
  }

  // Check locally cached preview video for this course ID (e.g. from local instructor/admin uploads)
  const courseId = source?.id || source?.courseId || source?.productId;
  if (!rawUrl && courseId && typeof window !== "undefined" && window.localStorage) {
    try {
      const cached = localStorage.getItem(`edvanz_course_preview_${courseId}`);
      if (cached && typeof cached === "string" && cached.trim()) {
        rawUrl = cached.trim();
      }
    } catch {}
  }

  // If a real raw URL was found, clean and validate it
  if (rawUrl) {
    let cleaned = rawUrl.trim();
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {}

    const mdMatch = cleaned.match(/\]\(([^)]+)\)/);
    if (mdMatch && mdMatch[1]) {
      cleaned = mdMatch[1].trim();
    }

    const httpMatch = cleaned.match(/(https?:\/\/[^\s"'\)`]+)/i);
    if (httpMatch && httpMatch[1]) {
      cleaned = httpMatch[1].trim();
    }

    cleaned = cleaned.replace(/^["'\(\[\s]+|["'\)\]\s]+$/g, "").trim();

    if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("/")) {
      return cleaned;
    }
  }

  // Fallback: If no custom video URL exists on the course, resolve category-specific demo preview clip
  if (source) {
    const categoryName =
      source.categoryName ||
      (typeof source.category === "object" ? source.category?.name : undefined) ||
      source.categoryTitle ||
      (typeof source.category === "string" && !source.category.includes("-") ? source.category : undefined) ||
      source.title ||
      "";
    const demo = getDemoVideo(categoryName);
    if (demo?.videoUrl) {
      return demo.videoUrl;
    }
  }

  return null;
}

export function formatEmbedVideoUrl(url: string | null): { embedUrl: string | null; isDirectVideo: boolean } {
  if (!url) return { embedUrl: null, isDirectVideo: false };

  const cleaned = url.trim();

  // YouTube match
  const ytMatch = cleaned.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
      isDirectVideo: false,
    };
  }

  // Vimeo match
  const vimeoMatch = cleaned.match(/(?:vimeo\.com\/)(?:.*\/)?(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      isDirectVideo: false,
    };
  }

  // Direct video files (.mp4, .webm, .ogg, etc.)
  const isDirect = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(cleaned);

  return {
    embedUrl: cleaned,
    isDirectVideo: isDirect,
  };
}

export function hasUserAccount(): boolean {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    const hasAccount = localStorage.getItem("edvanz_has_account") === "true";
    const rememberedEmail = !!localStorage.getItem("rememberedEmail");
    const registered = localStorage.getItem("edvanz_registered") === "true";
    const edvanzUser = !!localStorage.getItem("Edvanz_user");
    const lastUser = !!localStorage.getItem("edvanz_last_user");
    const token = !!localStorage.getItem("accessToken") || !!localStorage.getItem("refreshToken");
    return hasAccount || rememberedEmail || registered || edvanzUser || lastUser || token;
  } catch {
    return false;
  }
}

export function getAuthRedirectPath(): "/login" | "/register" {
  return hasUserAccount() ? "/login" : "/register";
}



/**
 * Backend Phone Number Validation Rules:
 * - Optional field: phoneNumber does not have @NotBlank, so it can be omitted or sent as null.
 * - Can optionally start with +.
 * - Must contain only digits after the optional +.
 * - Total number of digits must be 7 to 15.
 * - No spaces, hyphens, brackets, or other special characters.
 */
export const PHONE_NUMBER_REGEX = /^\+?[0-9]{7,15}$/;

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
}

export function validatePhoneNumber(phone?: string | null): PhoneValidationResult {
  if (phone === null || phone === undefined || phone.trim() === "") {
    return { isValid: true };
  }

  const raw = phone.trim();

  // Check for spaces
  if (/\s/.test(raw)) {
    return { isValid: false, error: "Phone number cannot contain spaces." };
  }

  // Check for hyphens
  if (/-/.test(raw)) {
    return { isValid: false, error: "Phone number cannot contain hyphens." };
  }

  // Check for brackets or parentheses
  if (/[()[\]{}]/.test(raw)) {
    return { isValid: false, error: "Phone number cannot contain brackets or parentheses." };
  }

  // Check for letters or other special characters
  if (!/^\+?[0-9]+$/.test(raw)) {
    return { isValid: false, error: "Phone number can only contain digits and an optional leading '+'." };
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) {
    return { isValid: false, error: "Phone number must contain at least 7 digits." };
  }

  if (digits.length > 15) {
    return { isValid: false, error: "Phone number cannot exceed 15 digits." };
  }

  return { isValid: true };
}

/**
 * Normalizes phone number according to backend rules:
 * - Returns null if omitted, empty, or whitespace.
 * - Removes any spaces, hyphens, brackets, or invalid characters.
 * - Preserves optional leading '+' followed by 7 to 15 digits.
 */
export function sanitizePhoneNumber(phone?: string | null): string | null {
  if (phone === null || phone === undefined || phone.trim() === "") {
    return null;
  }
  const trimmed = phone.trim();
  const startsWithPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  return startsWithPlus ? `+${digits}` : digits;
}
