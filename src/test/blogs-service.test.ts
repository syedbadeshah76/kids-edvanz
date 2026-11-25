import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  decodeHtmlEntities,
  cleanBlogTitle,
  formatBlogDate,
  calculateReadingTime,
  sanitizeBlogHtml,
  resolvePublicAuthorName,
} from "@/components/blogs/blog-utils";

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

const makeApiPost = (overrides: Record<string, any> = {}) => ({
  id: 1,
  title: "Understanding &amp; Mastering TypeScript",
  slug: "understanding-mastering-typescript",
  excerpt: "Learn practical &amp; scalable patterns.",
  date: "2026-11-04T09:59:18+00:00",
  author: { id: 1, name: "edVanzadmin", slug: "edvanzadmin", avatar: "" },
  categories: [{ id: 10, name: "Engineering &amp; Tech", slug: "engineering-tech" }],
  featuredImage: null,
  isFeatured: false,
  ...overrides,
});

describe("Blog Utilities", () => {
  it("decodes HTML entities properly", () => {
    expect(decodeHtmlEntities("IT &amp; Technology.")).toBe("IT & Technology.");
    expect(decodeHtmlEntities("Tom &amp; Jerry &lt;3")).toBe("Tom & Jerry <3");
  });

  it("cleans and trims titles", () => {
    expect(cleanBlogTitle("  Best Online IT Courses  ")).toBe("Best Online IT Courses");
  });

  it("formats dates consistently", () => {
    const formatted = formatBlogDate("2026-11-04T09:59:18+00:00");
    expect(formatted).toBe("Nov 4, 2026");
  });

  it("calculates reading time properly", () => {
    expect(calculateReadingTime("")).toBe(1);
    const shortText = "Word ".repeat(300);
    expect(calculateReadingTime(shortText)).toBe(2);
  });

  it("sanitizes HTML while preserving heading IDs and typography", () => {
    const raw = `
      <h2 id="why-learn-it-skills" class="wp-block-heading">Why Learn IT Skills?</h2>
      <p class="wp-block-paragraph">Learning IT is <script>alert('xss')</script>great.</p>
      <a href="https://edvanz.co" onclick="steal()">Click here</a>
      <img src="test.jpg" onerror="hack()" alt="test" />
    `;
    const clean = sanitizeBlogHtml(raw);
    expect(clean).toContain('id="why-learn-it-skills"');
    expect(clean).toContain("Why Learn IT Skills?");
    expect(clean).not.toContain("<script>");
    expect(clean).not.toContain("alert('xss')");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("onerror");
  });

  it("maps edVanzadmin (case-insensitive, trimmed) to Edvanz and preserves all other author names", () => {
    expect(resolvePublicAuthorName("edVanzadmin")).toBe("Edvanz");
    expect(resolvePublicAuthorName("EdVanzAdmin")).toBe("Edvanz");
    expect(resolvePublicAuthorName("EDVANZADMIN")).toBe("Edvanz");
    expect(resolvePublicAuthorName(" edVanzadmin ")).toBe("Edvanz");

    expect(resolvePublicAuthorName("John Smith")).toBe("John Smith");
    expect(resolvePublicAuthorName("  John Smith  ")).toBe("John Smith");
    expect(resolvePublicAuthorName("Edvanz Editorial")).toBe("Edvanz Editorial");
    expect(resolvePublicAuthorName("Admin")).toBe("Admin");
    expect(resolvePublicAuthorName("edvanz-admin")).toBe("edvanz-admin");
    expect(resolvePublicAuthorName("John Smith", "edvanzadmin")).toBe("John Smith");

    expect(resolvePublicAuthorName(null)).toBe("HSB Infotech");
    expect(resolvePublicAuthorName(undefined)).toBe("HSB Infotech");
    expect(resolvePublicAuthorName("")).toBe("HSB Infotech");
    expect(resolvePublicAuthorName("   ")).toBe("HSB Infotech");
  });
});

describe("WordPress Blogs Service Unit Tests (Mocked API)", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("fetches and normalizes published blogs listing with pagination", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: [makeApiPost()],
        pagination: {
          currentPage: 1,
          perPage: 5,
          totalItems: 1,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    });

    const res = await blogsService.getBlogs({ page: 1, per_page: 5 });

    expect(mockGet).toHaveBeenCalledWith("/blogs", { params: { page: 1, per_page: 5 } });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].title).toBe("Understanding & Mastering TypeScript");
    expect(res.data[0].excerpt).toBe("Learn practical & scalable patterns.");
    expect(res.data[0].author.name).toBe("Edvanz");
    expect(res.data[0].categories[0].name).toBe("Engineering & Tech");
    expect(res.pagination.currentPage).toBe(1);
    expect(res.pagination.totalItems).toBe(1);
  });

  it("handles empty published blogs listing response cleanly", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: [],
        pagination: {
          currentPage: 1,
          perPage: 9,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      },
    });

    const res = await blogsService.getBlogs({ page: 1, per_page: 9 });

    expect(res.data).toEqual([]);
    expect(res.pagination.totalItems).toBe(0);
    expect(res.pagination.totalPages).toBe(0);
  });

  it("excludes draft and non-published posts from listing, detail, and featured endpoints", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockGet.mockResolvedValueOnce({
      data: {
        data: [
          makeApiPost({ id: 1, slug: "published-post" }),
          makeApiPost({ id: 2, slug: "draft-post", status: "draft" }),
          makeApiPost({ id: 3, slug: "private-post", status: "private" }),
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

    const listRes = await blogsService.getBlogs({ page: 1, per_page: 9 });
    expect(listRes.data.map((p) => p.slug)).toEqual(["published-post"]);

    mockGet.mockResolvedValueOnce({
      data: {
        data: { ...makeApiPost({ id: 2, slug: "draft-post", status: "draft" }), content: { html: "<p>Draft</p>" } },
      },
    });
    await expect(blogsService.getBlogBySlug("draft-post")).rejects.toThrow(
      'Blog post with slug "draft-post" not found.'
    );

    mockGet.mockResolvedValueOnce({
      data: {
        data: { ...makeApiPost({ id: 4, slug: "draft-featured", status: "draft" }), content: { html: "<p>Draft</p>" } },
      },
    });
    expect(await blogsService.getFeaturedBlog()).toBeNull();

    consoleErrorSpy.mockRestore();
  });

  it("handles featured blog 200 OK and expected edvanz_featured_blog_not_found 404 without console.error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockGet.mockResolvedValueOnce({
      data: {
        data: {
          ...makeApiPost({ id: 42, slug: "featured-post", isFeatured: true }),
          content: { html: "<p>Featured body</p>" },
        },
      },
    });
    const featured = await blogsService.getFeaturedBlog();
    expect(featured).not.toBeNull();
    expect(featured?.id).toBe(42);
    expect(featured?.isFeatured).toBe(true);

    const err404 = new axios.AxiosError("Not Found", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      statusText: "Not Found",
      headers: {},
      config: {} as any,
      data: { code: "edvanz_featured_blog_not_found", message: "No featured blog has been selected." },
    });
    mockGet.mockRejectedValueOnce(err404);

    const absentFeatured = await blogsService.getFeaturedBlog();
    expect(absentFeatured).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("rethrows genuine HTTP 500 and network errors for getBlogs and getFeaturedBlog", async () => {
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
        data: { message: "Server error" },
      }
    );
    mockGet.mockRejectedValueOnce(err500);
    await expect(blogsService.getBlogs({ page: 1, per_page: 9 })).rejects.toThrow(
      "Internal Server Error"
    );

    const networkErr = new axios.AxiosError("Network Error", "ERR_NETWORK");
    mockGet.mockRejectedValueOnce(networkErr);
    await expect(blogsService.getFeaturedBlog()).rejects.toThrow("Network Error");

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it("fetches blog detail by slug including related blogs normalization", async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        data: {
          ...makeApiPost({ id: 7, slug: "cloud-architecture" }),
          content: { html: "<p>Full article body</p>" },
          relatedBlogs: [makeApiPost({ id: 8, title: "Related &amp; Post", slug: "related-post" })],
        },
      },
    });

    const detail = await blogsService.getBlogBySlug("cloud-architecture");
    expect(mockGet).toHaveBeenCalledWith("/blogs/cloud-architecture");
    expect(detail.slug).toBe("cloud-architecture");
    expect(detail.content.html).toBe("<p>Full article body</p>");
    expect(detail.relatedBlogs?.[0].title).toBe("Related & Post");
  });

  it("fetches categories and authors with normalization and safe fallback on error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockGet.mockResolvedValueOnce({
      data: {
        data: [{ id: 1, name: "Cloud &amp; DevOps", slug: "cloud-devops", count: 4 }],
      },
    });
    const categories = await blogsService.getCategories();
    expect(mockGet).toHaveBeenCalledWith("/categories");
    expect(categories[0].name).toBe("Cloud & DevOps");

    mockGet.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, name: "edVanzadmin", slug: "edvanzadmin", avatar: "" },
          { id: 2, name: "John Smith", slug: "john-smith", avatar: "" },
        ],
      },
    });
    const authors = await blogsService.getAuthors();
    expect(mockGet).toHaveBeenCalledWith("/authors");
    expect(authors.map((a) => a.name)).toEqual(["Edvanz", "John Smith"]);

    mockGet.mockRejectedValueOnce(new Error("Categories failed"));
    expect(await blogsService.getCategories()).toEqual([]);

    mockGet.mockRejectedValueOnce(new Error("Authors failed"));
    expect(await blogsService.getAuthors()).toEqual([]);

    consoleErrorSpy.mockRestore();
  });
});
