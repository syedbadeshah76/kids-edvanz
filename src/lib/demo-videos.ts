/**
 * Demo IT video catalog.
 *
 * TEMPORARY: Used until the backend serves real lesson media.
 * Each entry maps an IT category (case-insensitive) to a freely hosted
 * sample video + poster + captions track. `getDemoVideo()` falls back to
 * a generic IT clip when no category-specific asset exists.
 *
 * `getLessonMedia()` is the single source of truth used by BOTH the
 * Course Player and the My Courses preview dialog so the lesson screen
 * looks consistent across the app for any given IT field.
 *
 * When the backend is ready, replace calls to `getLessonMedia()` with the
 * real `videoUrl` / `previewVideo` / `posterUrl` / `captionsUrl` returned
 * by the API and delete this file.
 */

export interface DemoVideo {
  videoUrl: string;
  poster: string;
  /** WebVTT captions URL for this IT field. Falls back to generic English captions. */
  captionsSrc: string;
}

const GENERIC_CAPTIONS = "/captions/en.vtt";

const EDVANZ_DEMO_VIDEO_REACT =
  "https://dev-edvanz-content.s3.ap-south-1.amazonaws.com/tenant-00000000-0000-0000-0000-000000000001/instructors/vaishali-vuppu_a6c25e04-71b9-49ed-a900-899b2c6dff48/live-courses/react-js-live-course-msq09bpd_6619d84c-6868-45d7-a07b-9751ca4aa07f/promo-video/react-in-100-seconds-fireship-720p-h264.mp4";

const EDVANZ_DEMO_VIDEO_PYTHON =
  "https://dev-edvanz-content.s3.ap-south-1.amazonaws.com/tenant-00000000-0000-0000-0000-000000000001/instructors/vaishali-vuppu_a6c25e04-71b9-49ed-a900-899b2c6dff48/live-courses/youtube-online-learning-course-mumakxu2_b148a889-5a84-487b-b732-9c4e4305e2e4/promo-video/what-is-python-python-explained-in-2-minutes-for-beginners-zero-to-mastery-240p-h264.mp4";

const GENERIC: DemoVideo = {
  videoUrl: EDVANZ_DEMO_VIDEO_REACT,
  poster:
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1280&q=80",
  captionsSrc: GENERIC_CAPTIONS,
};

const CATALOG: Record<string, DemoVideo> = {
  "web development": {
    videoUrl: EDVANZ_DEMO_VIDEO_REACT,
    poster:
      "https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "app development": {
    videoUrl: EDVANZ_DEMO_VIDEO_REACT,
    poster:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "ui/ux design": {
    videoUrl: EDVANZ_DEMO_VIDEO_REACT,
    poster:
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "data science": {
    videoUrl: EDVANZ_DEMO_VIDEO_PYTHON,
    poster:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  ai: {
    videoUrl: EDVANZ_DEMO_VIDEO_PYTHON,
    poster:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "cyber security": {
    videoUrl: EDVANZ_DEMO_VIDEO_REACT,
    poster:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "cloud computing": {
    videoUrl: EDVANZ_DEMO_VIDEO_REACT,
    poster:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  programming: {
    videoUrl: EDVANZ_DEMO_VIDEO_PYTHON,
    poster:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
  "data analytics": {
    videoUrl: EDVANZ_DEMO_VIDEO_PYTHON,
    poster:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1280&q=80",
    captionsSrc: GENERIC_CAPTIONS,
  },
};

/** Get an IT-category-specific demo video, or the generic fallback. */
export const getDemoVideo = (category?: string | null): DemoVideo => {
  if (!category) return GENERIC;
  const key = category.trim().toLowerCase();
  if (CATALOG[key]) return CATALOG[key];
  for (const catKey of Object.keys(CATALOG)) {
    if (key.includes(catKey) || catKey.includes(key)) {
      return CATALOG[catKey];
    }
  }
  return GENERIC;
};

export const DEFAULT_DEMO_VIDEO = GENERIC;

/**
 * Resolve the media (video URL, poster, captions) to render for a lesson
 * or preview, given the course's IT category and any real backend-provided
 * URLs. Used by both CoursePlayer and MyCourses to keep the lesson screen
 * visually consistent for each IT field.
 *
 * Rules:
 * - videoUrl: real lesson/preview URL if present (and not the legacy
 *   "example.com" placeholder), else the IT-field demo clip.
 * - poster: ALWAYS the IT-field demo poster while we're on demo content,
 *   so the lesson screen reflects the field rather than mixing arbitrary
 *   thumbnails. If the lesson ships a real videoUrl, prefer the course
 *   thumbnail (real content), then fall back to the field poster.
 * - captionsSrc: per-field captions track, falling back to generic English.
 */
export interface LessonMediaInput {
  category?: string | null;
  /** Real lesson video URL from the backend (preferred). */
  videoUrl?: string | null;
  /** Course thumbnail; only used when a real video URL is present. */
  thumbnail?: string | null;
}

const PLACEHOLDER_URLS = new Set(["https://example.com/video.mp4", ""]);

export const getLessonMedia = ({
  category,
  videoUrl,
  thumbnail,
}: LessonMediaInput): DemoVideo => {
  const demo = getDemoVideo(category);
  const hasRealVideo = !!videoUrl && !PLACEHOLDER_URLS.has(videoUrl);

  return {
    videoUrl: hasRealVideo ? (videoUrl as string) : demo.videoUrl,
    // When using demo content, always show the field poster for consistency.
    // When the backend ships a real video, prefer the course thumbnail.
    poster: hasRealVideo ? thumbnail || demo.poster : demo.poster,
    captionsSrc: demo.captionsSrc,
  };
};
