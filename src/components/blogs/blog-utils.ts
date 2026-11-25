/**
 * Utility helpers for WordPress blog rendering, formatting, and typography.
 */

/**
 * Decodes HTML entities commonly found in WordPress taxonomy strings,
 * such as &amp;, &lt;, &gt;, &quot;, &#039;, etc.
 */
export function decodeHtmlEntities(text?: string | null): string {
  if (!text) return "";
  if (!text.includes("&")) return text;

  if (typeof document !== "undefined") {
    const txt = document.createElement("textarea");
    txt.innerHTML = text;
    return txt.value;
  }

  // Fallback for non-browser environments
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…");
}

/**
 * Maps internal WordPress admin username `edVanzadmin` (case-insensitive)
 * to the public-facing display name `Edvanz`.
 */
export const EDITORIAL_AUTHOR_MAP: Record<string, string> = {
  edvanzadmin: "Edvanz",
};

export function resolvePublicAuthorName(
  rawName?: string | null,
  _rawSlug?: string | null
): string {
  if (!rawName) return "HSB Infotech";

  const trimmedName = cleanBlogTitle(rawName);
  if (!trimmedName) return "HSB Infotech";

  const mapped = EDITORIAL_AUTHOR_MAP[trimmedName.toLowerCase()];
  if (mapped) {
    return mapped;
  }

  return trimmedName;
}

/**
 * Clean and trim blog title, stripping leading/trailing whitespace
 * and residual invalid characters.
 */
export function cleanBlogTitle(title?: string | null): string {
  if (!title) return "";
  const decoded = decodeHtmlEntities(title);
  return decoded.replace(/[\uFFFD\u0000-\u001F\u007F]+$/g, "").trim();
}

/**
 * Formats an ISO 8601 date string into the EDVANZ presentation style (e.g. "Nov 4, 2026").
 */
export function formatBlogDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

/**
 * Parses a blog publication date string into a numeric timestamp for sorting.
 * Invalid or missing dates return -Infinity so dated posts always take precedence.
 */
function parseBlogDateTimestamp(dateStr?: string | null): number {
  if (!dateStr) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(dateStr);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

/**
 * Returns a new array of blogs sorted by publication `date` descending
 * without mutating the original array.
 */
export function sortBlogsByDateDesc<T extends { date?: string | null }>(blogs: readonly T[]): T[] {
  if (!Array.isArray(blogs) || blogs.length === 0) return [];
  return [...blogs].sort((a, b) => {
    const tsB = parseBlogDateTimestamp(b?.date);
    const tsA = parseBlogDateTimestamp(a?.date);
    if (tsB === tsA) return 0;
    return tsB > tsA ? 1 : -1;
  });
}

/**
 * Selects the latest published blog based on its `date` field from a non-mutated sorted copy.
 */
export function selectLatestPublishedBlog<T extends { date?: string | null }>(
  blogs: readonly T[]
): T | null {
  const sorted = sortBlogsByDateDesc(blogs);
  return sorted[0] ?? null;
}

/**
 * Calculates estimated reading time in minutes based on ~200 words/min.
 */
export function calculateReadingTime(contentOrHtml?: string | null): number {
  if (!contentOrHtml) return 1;
  const clean = contentOrHtml.replace(/<[^>]*>/g, " ");
  const words = clean.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * Strips HTML tags and leading numeric index from heading titles (e.g. "01. Introduction" -> "Introduction").
 */
export function cleanHeadingTitle(rawText = ""): string {
  if (!rawText || typeof rawText !== "string") return "";
  const stripped = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const cleaned = stripped.replace(/^(\d{1,2})[\.\-\)\s]+\s*/, "").trim();
  return cleaned || stripped;
}

/**
 * Generates a stable, URL-safe slug from a heading title.
 */
export function slugifyHeading(title = "", fallbackIndex = 1): string {
  const slugified = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slugified || `section-${fallbackIndex}`;
}

/**
 * Generates the canonical DOM element ID for anchor navigation:
 * story-section-${index}-${slug}
 */
export function getHeadingAnchorId(cleanTitle = "", index = 1): string {
  const slug = slugifyHeading(cleanTitle, index);
  return `story-section-${index}-${slug}`;
}

/**
 * Splits a dynamic article title into a primary portion and an emphasized teal highlight portion,
 * mirroring the two-tone editorial hero typography in Figma.
 */
export function splitHeroTitle(rawTitle = ""): { primary: string; highlight: string } {
  if (!rawTitle || typeof rawTitle !== "string") {
    return { primary: "", highlight: "" };
  }

  const decodedTitle = decodeHtmlEntities(rawTitle);
  const cleanTitle = decodedTitle.replace(/\s+/g, " ").trim();
  if (!cleanTitle) return { primary: "", highlight: "" };

  // 1. Check for natural punctuation separator (colon, em-dash, pipe, semicolon, hyphen with spaces)
  const separatorMatch = cleanTitle.match(/^(.+?)([:;—–|]|\s+-\s+)(.+)$/);
  if (separatorMatch) {
    const rawLeft = separatorMatch[1].trim();
    const sep = separatorMatch[2].trim();
    const highlightPart = separatorMatch[3].trim();
    const primaryPart =
      sep === ":" || sep === ";"
        ? `${rawLeft}${sep}`
        : `${rawLeft} ${sep}`;
    if (primaryPart && highlightPart) {
      return { primary: primaryPart, highlight: highlightPart };
    }
  }

  // 2. Word-based division for titles without punctuation
  const words = cleanTitle.split(" ");
  if (words.length <= 1) {
    return { primary: "", highlight: cleanTitle };
  }

  if (words.length === 2) {
    return { primary: words[0], highlight: words[1] };
  }

  if (words.length === 3) {
    return { primary: `${words[0]} ${words[1]}`, highlight: words[2] };
  }

  // For 4+ words, give ~55% to primary and concluding portion (up to 3 words) to highlight
  const highlightCount = Math.min(3, Math.ceil(words.length * 0.45));
  const splitIndex = Math.max(1, words.length - highlightCount);
  const primary = words.slice(0, splitIndex).join(" ");
  const highlight = words.slice(splitIndex).join(" ");

  return { primary, highlight };
}

/**
 * Sanitizes WordPress post HTML content in the browser,
 * strictly preserving heading IDs (required for Table of Contents anchors),
 * standard typography, images, links, etc.
 * Strips out script tags, iframes, object/embeds, and inline event handlers (on*).
 */
export function sanitizeBlogHtml(rawHtml?: string | null): string {
  if (!rawHtml) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return rawHtml;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    // Remove dangerous tags
    const dangerousTags = ["script", "iframe", "object", "embed", "applet", "meta", "base"];
    dangerousTags.forEach((tag) => {
      const elements = doc.querySelectorAll(tag);
      elements.forEach((el) => el.remove());
    });

    // Strip inline on* event handler attributes and javascript: urls from all elements
    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      const attrNames = Array.from(el.attributes).map((a) => a.name);
      attrNames.forEach((attr) => {
        if (attr.toLowerCase().startsWith("on")) {
          el.removeAttribute(attr);
        } else if (attr.toLowerCase() === "href" || attr.toLowerCase() === "src") {
          const val = el.getAttribute(attr) || "";
          if (val.trim().toLowerCase().startsWith("javascript:")) {
            el.removeAttribute(attr);
          }
        }
      });
    });

    return doc.body.innerHTML;
  } catch {
    return rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  }
}
