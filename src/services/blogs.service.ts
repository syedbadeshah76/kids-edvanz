// ============= WordPress CMS Blogs Service =============
// Dedicated API client for headless WordPress CMS integration (/wp-json/edvanz/v1).
// Completely independent of the Spring Boot API client to prevent
// tenant, sector, and authorization header pollution.

import axios, { AxiosInstance } from "axios";
import type {
  BlogAuthor,
  BlogCategory,
  BlogDetail,
  BlogListResponse,
  BlogQueryParams,
  BlogSummary,
} from "@/types/blogs.types";
import { cleanBlogTitle, decodeHtmlEntities, resolvePublicAuthorName } from "@/components/blogs/blog-utils";

/**
 * Normalizes author data to ensure public-facing display names are used
 * rather than internal administrator login usernames.
 */
function normalizeAuthor(author?: BlogAuthor | null): BlogAuthor {
  if (!author) {
    return {
      id: 0,
      name: "HSB Infotech",
      slug: "hsb-infotech",
    };
  }

  return {
    ...author,
    name: resolvePublicAuthorName(author.name, author.slug),
  };
}

/**
 * Resolves the WordPress REST API base URL.
 * Supports environment variable configuration for local and production deployment.
 */
function getWordPressBaseUrl(): string {
  const envUrl = import.meta.env.VITE_WORDPRESS_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && import.meta.env.DEV) {
    return "/wp-json/edvanz/v1";
  }
  return "http://edvanz-cms.local/wp-json/edvanz/v1";
}

// Create dedicated WordPress Axios instance without application auth or tenant interceptors
const wpClient: AxiosInstance = axios.create({
  baseURL: getWordPressBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

/**
 * Extracts HTTP status code from Axios or custom error objects.
 */
function getHttpStatus(error: unknown): number | undefined {
  if (axios.isAxiosError(error)) {
    return error.response?.status;
  }
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { status?: unknown } }).response;
    if (typeof response?.status === "number") {
      return response.status;
    }
  }
  return undefined;
}

/**
 * Extracts response payload data from Axios or custom error objects.
 */
function getErrorResponseData(error: unknown): unknown {
  if (axios.isAxiosError(error)) {
    return error.response?.data;
  }
  if (typeof error === "object" && error !== null && "response" in error) {
    return (error as { response?: { data?: unknown } }).response?.data;
  }
  return undefined;
}

/**
 * Returns true only when /featured-blog returns HTTP 404 specifically
 * because no featured blog is configured in WordPress CMS.
 */
function isNoFeaturedBlogError(error: unknown): boolean {
  if (getHttpStatus(error) !== 404) {
    return false;
  }

  const data = getErrorResponseData(error);
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const code = "code" in data ? (data as { code?: unknown }).code : undefined;
  if (code === "edvanz_featured_blog_not_found") {
    return true;
  }
  if (typeof code === "string" && code.length > 0) {
    return false;
  }

  const message = "message" in data ? (data as { message?: unknown }).message : undefined;
  return (
    typeof message === "string" &&
    message.toLowerCase().includes("no featured blog")
  );
}

/**
 * Defensive guard ensuring non-published posts (e.g. draft, pending, private)
 * are never exposed in public blog listings or details.
 */
function isPublishedBlog(post: unknown): post is BlogSummary {
  if (!post || typeof post !== "object" || Array.isArray(post)) {
    return false;
  }
  const status = (post as { status?: unknown }).status;
  if (typeof status === "string" && status.trim().toLowerCase() !== "publish") {
    return false;
  }
  return true;
}

/**
 * Normalizes blog item data to decode HTML entities and trim strings.
 */
function normalizeSummary(blog: BlogSummary): BlogSummary {
  if (!blog) return blog;
  return {
    ...blog,
    title: cleanBlogTitle(blog.title),
    excerpt: decodeHtmlEntities(blog.excerpt || ""),
    author: normalizeAuthor(blog.author),
    categories: (blog.categories || []).map((cat) => ({
      ...cat,
      name: decodeHtmlEntities(cat.name),
    })),
  };
}

/**
 * Normalizes full blog detail data.
 */
function normalizeDetail(blog: BlogDetail): BlogDetail {
  if (!blog) return blog;
  return {
    ...blog,
    title: cleanBlogTitle(blog.title),
    excerpt: decodeHtmlEntities(blog.excerpt || ""),
    author: normalizeAuthor(blog.author),
    categories: (blog.categories || []).map((cat) => ({
      ...cat,
      name: decodeHtmlEntities(cat.name),
    })),
    relatedBlogs: (blog.relatedBlogs || []).map(normalizeSummary),
  };
}

export const blogsService = {
  /**
   * Fetches published blog posts with pagination and optional filtering.
   */
  async getBlogs(params: BlogQueryParams = {}): Promise<BlogListResponse> {
    try {
      const response = await wpClient.get<{
        data: BlogSummary[];
        pagination: BlogListResponse["pagination"];
      }>("/blogs", { params });

      const payload = response.data;
      if (!payload || typeof payload !== "object" || Array.isArray(payload) || !Array.isArray(payload.data)) {
        throw new Error("Unexpected response format from blogs endpoint.");
      }

      const rawList = payload.data.filter(isPublishedBlog);
      const normalizedList = rawList.map(normalizeSummary);

      return {
        data: normalizedList,
        pagination: payload.pagination || {
          currentPage: params.page || 1,
          perPage: params.per_page || 9,
          totalItems: normalizedList.length,
          totalPages: normalizedList.length > 0 ? 1 : 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    } catch (error) {
      console.error("[blogsService.getBlogs] Error fetching blogs:", error);
      throw error;
    }
  },

  /**
   * Fetches a single blog post by its unique URL slug.
   */
  async getBlogBySlug(slug: string): Promise<BlogDetail> {
    if (!slug) {
      throw new Error("Blog slug is required.");
    }

    try {
      const response = await wpClient.get<{ data: BlogDetail }>(
        `/blogs/${encodeURIComponent(slug)}`
      );

      const payload = response.data;
      if (!payload || typeof payload !== "object" || Array.isArray(payload) || !("data" in payload)) {
        throw new Error("Unexpected response format from blog detail endpoint.");
      }

      const post = payload.data;
      if (!post || !isPublishedBlog(post)) {
        throw new Error(`Blog post with slug "${slug}" not found.`);
      }

      return normalizeDetail(post);
    } catch (error) {
      console.error(`[blogsService.getBlogBySlug] Error fetching slug "${slug}":`, error);
      throw error;
    }
  },

  /**
   * Fetches the current featured blog post.
   * Returns null when the CMS responds with 404 specifically because no featured
   * post is configured (`edvanz_featured_blog_not_found`), and rethrows all
   * genuine HTTP errors, malformed payloads, or network failures.
   */
  async getFeaturedBlog(): Promise<BlogDetail | null> {
    try {
      const response = await wpClient.get<{ data: BlogDetail }>("/featured-blog");
      const payload = response.data;
      if (!payload || typeof payload !== "object" || Array.isArray(payload) || !("data" in payload)) {
        throw new Error("Unexpected response format from featured-blog endpoint.");
      }

      const post = payload.data;
      if (post === null || post === undefined) {
        return null;
      }

      if (
        typeof post !== "object" ||
        Array.isArray(post) ||
        typeof post.id !== "number" ||
        typeof post.slug !== "string" ||
        !post.slug.trim()
      ) {
        throw new Error("Unexpected response format from featured-blog endpoint.");
      }

      if (!isPublishedBlog(post)) {
        return null;
      }

      return normalizeDetail(post);
    } catch (error) {
      if (isNoFeaturedBlogError(error)) {
        return null;
      }
      console.error("[blogsService.getFeaturedBlog] Error fetching featured blog:", error);
      throw error;
    }
  },

  /**
   * Fetches all published blog categories with counts.
   */
  async getCategories(): Promise<BlogCategory[]> {
    try {
      const response = await wpClient.get<{ data: BlogCategory[] }>("/categories");
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      return list.map((cat) => ({
        ...cat,
        name: decodeHtmlEntities(cat.name),
      }));
    } catch (error) {
      console.error("[blogsService.getCategories] Error fetching categories:", error);
      return [];
    }
  },

  /**
   * Fetches all published blog authors.
   */
  async getAuthors(): Promise<BlogAuthor[]> {
    try {
      const response = await wpClient.get<{ data: BlogAuthor[] }>("/authors");
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      return list.map(normalizeAuthor);
    } catch (error) {
      console.error("[blogsService.getAuthors] Error fetching authors:", error);
      return [];
    }
  },
};

export default blogsService;

