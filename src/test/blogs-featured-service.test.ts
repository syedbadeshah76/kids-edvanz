import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  selectLatestPublishedBlog,
  sortBlogsByDateDesc,
} from "@/components/blogs/blog-utils";
import type { BlogSummary } from "@/types/blogs.types";

const mockGet = vi.hoisted(() => vi.fn());

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(() => ({
        get: mockGet,
      })),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

import { blogsService } from "@/services/blogs.service";

const makeBlog = (overrides: Partial<BlogSummary> = {}): BlogSummary => ({
  id: 1,
  title: "Sample Post",
  slug: "sample-post",
  excerpt: "Sample excerpt",
  date: "2026-11-01T00:00:00+00:00",
  author: { id: 1, name: "Edvanz Editorial", slug: "edvanz", avatar: "" },
  categories: [{ id: 1, name: "Tech", slug: "tech" }],
  featuredImage: null,
  isFeatured: false,
  ...overrides,
});

describe("blogsService.getFeaturedBlog error & 404 handling", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns normalized featured blog on 200 OK", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: {
          ...makeBlog({ id: 42, title: "Explicit &amp; Featured", isFeatured: true }),
          content: { html: "<p>Body</p>" },
        },
      },
    });

    const result = await blogsService.getFeaturedBlog();
    expect(mockGet).toHaveBeenCalledWith("/featured-blog");
    expect(result).not.toBeNull();
    expect(result?.id).toBe(42);
    expect(result?.title).toBe("Explicit & Featured");
  });

  it("returns null without console.error when /featured-blog responds with expected no-featured 404", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err404 = new axios.AxiosError("Not Found", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: {} as any,
      data: { code: "edvanz_featured_blog_not_found", message: "No featured blog has been selected." },
    });
    mockGet.mockRejectedValueOnce(err404);

    const result = await blogsService.getFeaturedBlog();
    expect(result).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("rethrows unexpected 404 errors such as rest_no_route instead of treating them as missing featured blog", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const routeNotFound404 = new axios.AxiosError("Not Found", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: {} as any,
      data: { code: "rest_no_route", message: "No route was found matching the URL and request method." },
    });
    mockGet.mockRejectedValueOnce(routeNotFound404);

    await expect(blogsService.getFeaturedBlog()).rejects.toThrow("Not Found");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it("rethrows HTTP 500 errors instead of silently returning null", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err500 = new axios.AxiosError(
      "Internal Server Error",
      "ERR_BAD_RESPONSE",
      undefined,
      undefined,
      {
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: {} as any,
        data: { message: "Database failure" },
      }
    );
    mockGet.mockRejectedValueOnce(err500);

    await expect(blogsService.getFeaturedBlog()).rejects.toThrow("Internal Server Error");
    consoleErrorSpy.mockRestore();
  });

  it("rethrows network failures instead of silently returning null", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const networkErr = new axios.AxiosError("Network Error", "ERR_NETWORK");
    mockGet.mockRejectedValueOnce(networkErr);

    await expect(blogsService.getFeaturedBlog()).rejects.toThrow("Network Error");
    consoleErrorSpy.mockRestore();
  });

  it("rethrows on unexpected response formats from /featured-blog and /blogs", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockGet.mockResolvedValueOnce({ data: "<html>unexpected</html>" });
    await expect(blogsService.getFeaturedBlog()).rejects.toThrow(
      "Unexpected response format from featured-blog endpoint."
    );

    mockGet.mockResolvedValueOnce({ data: { data: { invalid: true } } });
    await expect(blogsService.getFeaturedBlog()).rejects.toThrow(
      "Unexpected response format from featured-blog endpoint."
    );

    mockGet.mockResolvedValueOnce({ data: { unexpected: [] } });
    await expect(blogsService.getBlogs({ page: 1, per_page: 9 })).rejects.toThrow(
      "Unexpected response format from blogs endpoint."
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("blogsService draft exclusion & category filtering", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("excludes draft/non-published posts from listing, detail, and featured responses", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockGet.mockResolvedValueOnce({
      data: {
        data: [
          makeBlog({ id: 1, title: "Published Story", slug: "published-story" }),
          { ...makeBlog({ id: 2, title: "Draft Secret Story", slug: "draft-secret" }), status: "draft" },
        ],
        pagination: {
          currentPage: 1,
          perPage: 9,
          totalItems: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    });

    const list = await blogsService.getBlogs({ page: 1, per_page: 9 });
    expect(list.data).toHaveLength(1);
    expect(list.data[0].slug).toBe("published-story");

    mockGet.mockResolvedValueOnce({
      data: {
        data: { ...makeBlog({ id: 2, title: "Draft Secret Story", slug: "draft-secret" }), status: "draft", content: { html: "<p>Draft</p>" } },
      },
    });
    await expect(blogsService.getBlogBySlug("draft-secret")).rejects.toThrow(
      'Blog post with slug "draft-secret" not found.'
    );

    mockGet.mockResolvedValueOnce({
      data: {
        data: { ...makeBlog({ id: 3, title: "Draft Featured", slug: "draft-featured" }), status: "draft", content: { html: "<p>Draft</p>" } },
      },
    });
    expect(await blogsService.getFeaturedBlog()).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("passes category filter parameters to /blogs and decodes /categories", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: [makeBlog({ id: 10, title: "Cloud &amp; DevOps", categories: [{ id: 2, name: "Cloud &amp; Infra", slug: "cloud" }] })],
        pagination: {
          currentPage: 1,
          perPage: 9,
          totalItems: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    });

    const filtered = await blogsService.getBlogs({ page: 1, per_page: 9, category: "cloud" });
    expect(mockGet).toHaveBeenCalledWith("/blogs", { params: { page: 1, per_page: 9, category: "cloud" } });
    expect(filtered.data[0].title).toBe("Cloud & DevOps");
    expect(filtered.data[0].categories[0].name).toBe("Cloud & Infra");

    mockGet.mockResolvedValueOnce({
      data: {
        data: [{ id: 2, name: "Cloud &amp; Infra", slug: "cloud", count: 3 }],
      },
    });
    const categories = await blogsService.getCategories();
    expect(mockGet).toHaveBeenCalledWith("/categories");
    expect(categories[0].name).toBe("Cloud & Infra");
  });
});

describe("Latest blog sorting & selection helpers", () => {
  it("selects the latest blog by publication date DESC regardless of array order", () => {
    const oldest = makeBlog({ id: 1, slug: "oldest", date: "2026-10-01T08:00:00+00:00" });
    const newest = makeBlog({ id: 3, slug: "newest", date: "2026-11-10T09:00:00+00:00" });
    const middle = makeBlog({ id: 2, slug: "middle", date: "2026-11-05T12:00:00+00:00" });

    const original = [oldest, newest, middle];
    const snapshot = [...original];

    const sorted = sortBlogsByDateDesc(original);
    const latest = selectLatestPublishedBlog(original);

    expect(original).toEqual(snapshot); // original array not mutated
    expect(sorted.map((b) => b.id)).toEqual([3, 2, 1]);
    expect(latest?.id).toBe(3);
  });

  it("places valid dated posts ahead of missing/invalid dates", () => {
    const invalidDate = makeBlog({ id: 10, date: "invalid-date" });
    const missingDate = makeBlog({ id: 11, date: "" });
    const validPost = makeBlog({ id: 12, date: "2026-01-15T10:00:00+00:00" });

    const original = [invalidDate, missingDate, validPost];
    const latest = selectLatestPublishedBlog(original);

    expect(latest?.id).toBe(12);
  });

  it("returns null for empty array", () => {
    expect(selectLatestPublishedBlog([])).toBeNull();
  });
});

