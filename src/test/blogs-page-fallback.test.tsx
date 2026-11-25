import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Blogs } from "@/pages/Blogs";
import { BlogDetail } from "@/pages/BlogDetail";
import { blogsService } from "@/services/blogs.service";
import type { BlogDetail, BlogSummary } from "@/types/blogs.types";

vi.mock("@/components/layout/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock("@/components/blogs/BlogCTASection", () => ({
  BlogCTASection: () => <div data-testid="blog-cta" />,
}));

vi.mock("@/lib/use-page-meta", () => ({
  usePageMeta: vi.fn(),
}));

const makeSummary = (overrides: Partial<BlogSummary> = {}): BlogSummary => ({
  id: 1,
  title: "Blog Title",
  slug: "blog-title",
  excerpt: "Blog excerpt",
  date: "2026-11-01T00:00:00+00:00",
  author: { id: 1, name: "Edvanz Editorial", slug: "edvanz", avatar: "" },
  categories: [{ id: 1, name: "Tech", slug: "tech" }],
  featuredImage: null,
  isFeatured: false,
  ...overrides,
});

const makeDetail = (overrides: Partial<BlogDetail> = {}): BlogDetail => ({
  ...makeSummary(overrides),
  content: { html: "<p>Full body</p>" },
  ...overrides,
});

describe("Blogs page featured fallback & request optimization", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(blogsService, "getCategories").mockResolvedValue([]);
  });

  it("does not call featured-blog, categories, authors, or detail APIs when zero published blogs exist", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const getBlogsSpy = vi.spyOn(blogsService, "getBlogs").mockResolvedValue({
      data: [],
      pagination: {
        currentPage: 1,
        perPage: 9,
        totalItems: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
    const featuredSpy = vi.spyOn(blogsService, "getFeaturedBlog");
    const categoriesSpy = vi.spyOn(blogsService, "getCategories");
    const authorsSpy = vi.spyOn(blogsService, "getAuthors");
    const detailSpy = vi.spyOn(blogsService, "getBlogBySlug");

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    expect(await screen.findByText("No articles found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We're preparing fresh insights, updates and stories for you. Check back soon to explore what's new at Edvanz."
      )
    ).toBeInTheDocument();
    expect(getBlogsSpy).toHaveBeenCalledTimes(1);
    expect(featuredSpy).not.toHaveBeenCalled();
    expect(categoriesSpy).not.toHaveBeenCalled();
    expect(authorsSpy).not.toHaveBeenCalled();
    expect(detailSpy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Featured Articles")).not.toBeInTheDocument();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("displays explicitly selected featured blog when available and deduplicates secondary/grid", async () => {
    const explicitFeatured = makeDetail({
      id: 99,
      title: "Explicit Featured Story",
      slug: "explicit-featured-story",
      date: "2026-10-15T00:00:00+00:00",
      isFeatured: true,
    });
    const list = [
      makeSummary({ id: 101, title: "Latest Article", slug: "latest-article", date: "2026-11-10T09:00:00+00:00" }),
      explicitFeatured,
      makeSummary({ id: 102, title: "Second Insight", slug: "second-insight", date: "2026-11-08T09:00:00+00:00" }),
      makeSummary({ id: 103, title: "Grid Article Four", slug: "grid-article-four", date: "2026-11-05T09:00:00+00:00" }),
    ];

    const callOrder: string[] = [];
    vi.spyOn(blogsService, "getBlogs").mockImplementation(async () => {
      callOrder.push("blogs");
      return {
        data: list,
        pagination: {
          currentPage: 1,
          perPage: 9,
          totalItems: 4,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      };
    });
    vi.spyOn(blogsService, "getFeaturedBlog").mockImplementation(async () => {
      callOrder.push("featured");
      return explicitFeatured;
    });

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    const featuredSection = await screen.findByLabelText("Featured Articles");
    expect(callOrder).toEqual(["blogs", "featured"]);
    expect(screen.getAllByText("Explicit Featured Story")).toHaveLength(1);
    expect(within(featuredSection).getByText("Latest Article")).toBeInTheDocument();
    expect(within(featuredSection).getByText("Second Insight")).toBeInTheDocument();
    expect(screen.getByText("Grid Article Four")).toBeInTheDocument();
  });

  it("falls back to latest published blog by date DESC without console errors when featured is null (404)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const olderPost = makeSummary({
      id: 1,
      title: "Hello world!",
      slug: "hello-world",
      date: "2026-11-10T06:25:52+00:00",
    });
    const newestPost = makeSummary({
      id: 6,
      title: "Best Online IT Courses",
      slug: "best-online-it-courses",
      date: "2026-11-10T07:11:50+00:00",
    });
    const middlePost = makeSummary({
      id: 3,
      title: "Middle Post",
      slug: "middle-post",
      date: "2026-11-10T06:50:00+00:00",
    });
    const fourthPost = makeSummary({
      id: 4,
      title: "Fourth Grid Post",
      slug: "fourth-grid-post",
      date: "2026-11-09T12:00:00+00:00",
    });

    // Deliberately unsorted API payload (olderPost is at index 0)
    const unsortedApiList = [olderPost, newestPost, middlePost, fourthPost];

    vi.spyOn(blogsService, "getFeaturedBlog").mockResolvedValue(null);
    vi.spyOn(blogsService, "getBlogs").mockResolvedValue({
      data: unsortedApiList,
      pagination: {
        currentPage: 1,
        perPage: 9,
        totalItems: 4,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    const featuredSection = await screen.findByLabelText("Featured Articles");
    // Featured card must show newestPost even though olderPost was at index 0, with zero duplicates
    expect(screen.getAllByText("Best Online IT Courses")).toHaveLength(1);
    expect(within(featuredSection).getByText("FEATURED STORY / 01")).toBeInTheDocument();
    // Secondary cards should show remaining posts (excluding newestPost)
    expect(within(featuredSection).getByText("Hello world!")).toBeInTheDocument();
    expect(within(featuredSection).getByText("Middle Post")).toBeInTheDocument();
    // Grid should show the remaining post
    expect(screen.getByText("Fourth Grid Post")).toBeInTheDocument();
    // Original list must remain untouched
    expect(unsortedApiList[0].id).toBe(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("surfaces user-friendly error without exposing raw error details when getFeaturedBlog rejects with HTTP 500", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(blogsService, "getFeaturedBlog").mockRejectedValue(
      new Error("Request failed with status code 500 at https://cms.edvanz.co/wp-json/edvanz/v1/featured-blog")
    );
    vi.spyOn(blogsService, "getBlogs").mockResolvedValue({
      data: [makeSummary({ id: 1, title: "Hello world!" })],
      pagination: {
        currentPage: 1,
        perPage: 9,
        totalItems: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    expect(await screen.findByText("Unable to load articles")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We're having trouble loading our stories right now. Please try again in a moment."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
    expect(screen.queryByText(/500|wp-json|https:\/\/cms/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Featured Articles")).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("recovers cleanly via Try Again after a featured-blog 500 error and uses latest-blog fallback on 404", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const newest = makeSummary({
      id: 20,
      title: "Recovered Latest Blog",
      slug: "recovered-latest-blog",
      date: "2026-11-11T08:00:00+00:00",
    });

    vi.spyOn(blogsService, "getBlogs").mockResolvedValue({
      data: [newest],
      pagination: {
        currentPage: 1,
        perPage: 9,
        totalItems: 1,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
    const featuredSpy = vi
      .spyOn(blogsService, "getFeaturedBlog")
      .mockRejectedValueOnce(new Error("Temporary server error"))
      .mockResolvedValueOnce(null);

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    expect(await screen.findByText("Unable to load articles")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));

    const featuredSection = await screen.findByLabelText("Featured Articles");
    expect(within(featuredSection).getByText("Recovered Latest Blog")).toBeInTheDocument();
    expect(featuredSpy).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it("displays user-friendly error on listing API 500/network failure, retries cleanly to published or empty state, and keeps error on repeated failure", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const getBlogsSpy = vi
      .spyOn(blogsService, "getBlogs")
      .mockRejectedValueOnce({
        message: "Request failed with status code 500",
        response: {
          status: 500,
          data: { message: "WordPress PHP Fatal error in /wp-content/plugins/edvanz-cms-api" },
        },
      })
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce({
        data: [],
        pagination: {
          currentPage: 1,
          perPage: 9,
          totalItems: 0,
          totalPages: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    const featuredSpy = vi.spyOn(blogsService, "getFeaturedBlog");
    const categoriesSpy = vi.spyOn(blogsService, "getCategories");

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    expect(await screen.findByText("Unable to load articles")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We're having trouble loading our stories right now. Please try again in a moment."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/500|PHP Fatal error|wp-content/i)).not.toBeInTheDocument();
    expect(featuredSpy).not.toHaveBeenCalled();
    expect(categoriesSpy).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Featured Articles")).not.toBeInTheDocument();

    // Retry still fails (network error): keeps error state
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findByText("Unable to load articles")).toBeInTheDocument();
    expect(getBlogsSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Network Error/i)).not.toBeInTheDocument();

    // Retry succeeds with empty published-blog list: shows updated empty state without featured/categories calls
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findByText("No articles found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We're preparing fresh insights, updates and stories for you. Check back soon to explore what's new at Edvanz."
      )
    ).toBeInTheDocument();
    expect(getBlogsSpy).toHaveBeenCalledTimes(3);
    expect(featuredSpy).not.toHaveBeenCalled();
    expect(categoriesSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("keeps published blog listing visible and usable when categories API fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const categoriesSpy = vi
      .spyOn(blogsService, "getCategories")
      .mockRejectedValue(new Error("Categories endpoint failed"));
    const featuredSpy = vi.spyOn(blogsService, "getFeaturedBlog").mockResolvedValue(null);
    const getBlogsSpy = vi.spyOn(blogsService, "getBlogs").mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      return {
        data: [
          makeSummary({
            id: page,
            title: `Published Article ${page}`,
            slug: `published-article-${page}`,
            date: `2026-11-1${page}T08:00:00+00:00`,
          }),
        ],
        pagination: {
          currentPage: page,
          perPage: 9,
          totalItems: 2,
          totalPages: 2,
          hasPreviousPage: page > 1,
          hasNextPage: page < 2,
        },
      };
    });

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    const featuredSection = await screen.findByLabelText("Featured Articles");
    expect(within(featuredSection).getByText("Published Article 1")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load articles")).not.toBeInTheDocument();
    expect(categoriesSpy).toHaveBeenCalledTimes(1);
    expect(featuredSpy).toHaveBeenCalledTimes(1);

    // Pagination continues working without re-fetching failed categories
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Published Article 2")).toBeInTheDocument();
    expect(getBlogsSpy).toHaveBeenCalledTimes(2);
    expect(categoriesSpy).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it("fetches featured blog and categories once when blogs exist and not during pagination", async () => {
    const categoriesSpy = vi
      .spyOn(blogsService, "getCategories")
      .mockResolvedValue([{ id: 1, name: "Tech", slug: "tech", count: 18 }]);
    const featuredSpy = vi.spyOn(blogsService, "getFeaturedBlog").mockResolvedValue(null);
    const getBlogsSpy = vi.spyOn(blogsService, "getBlogs").mockImplementation(async (params) => {
      const page = params?.page ?? 1;
      return {
        data: [
          makeSummary({
            id: page * 10,
            title: `Post Page ${page}`,
            slug: `post-page-${page}`,
            date: `2026-11-0${10 - page}T00:00:00+00:00`,
          }),
        ],
        pagination: {
          currentPage: page,
          perPage: 9,
          totalItems: 18,
          totalPages: 2,
          hasPreviousPage: page > 1,
          hasNextPage: page < 2,
        },
      };
    });

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    await screen.findByText("Post Page 1");
    expect(featuredSpy).toHaveBeenCalledTimes(1);
    expect(categoriesSpy).toHaveBeenCalledTimes(1);
    expect(getBlogsSpy).toHaveBeenCalledTimes(1);

    // Navigate to Page 2
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await screen.findByText("Post Page 2");
    expect(getBlogsSpy).toHaveBeenCalledTimes(2);
    expect(getBlogsSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    );
    // Featured and categories endpoints must NOT be called again during pagination
    expect(featuredSpy).toHaveBeenCalledTimes(1);
    expect(categoriesSpy).toHaveBeenCalledTimes(1);

    // Navigate back to Page 1
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    await screen.findByText("Post Page 1");
    expect(getBlogsSpy).toHaveBeenCalledTimes(3);
    expect(featuredSpy).toHaveBeenCalledTimes(1);
    expect(categoriesSpy).toHaveBeenCalledTimes(1);
  });

  it("displays normalized author 'Edvanz' for edVanzadmin across featured, secondary, and grid cards while preserving other author names", async () => {
    const featured = makeDetail({
      id: 1,
      title: "Featured Edvanz Story",
      slug: "featured-edvanz-story",
      date: "2026-11-10T10:00:00+00:00",
      author: { id: 1, name: "edVanzadmin", slug: "edvanzadmin", avatar: "" },
    });
    const list = [
      featured,
      makeSummary({
        id: 2,
        title: "Secondary Edvanz Story",
        slug: "secondary-edvanz-story",
        date: "2026-11-09T10:00:00+00:00",
        author: { id: 1, name: "EDVANZADMIN", slug: "edvanzadmin", avatar: "" },
      }),
      makeSummary({
        id: 3,
        title: "Secondary John Story",
        slug: "secondary-john-story",
        date: "2026-11-08T10:00:00+00:00",
        author: { id: 2, name: "John Smith", slug: "john-smith", avatar: "" },
      }),
      makeSummary({
        id: 4,
        title: "Grid Edvanz Story",
        slug: "grid-edvanz-story",
        date: "2026-11-07T10:00:00+00:00",
        author: { id: 1, name: " edVanzadmin ", slug: "edvanzadmin", avatar: "" },
      }),
      makeSummary({
        id: 5,
        title: "Grid Admin Story",
        slug: "grid-admin-story",
        date: "2026-11-06T10:00:00+00:00",
        author: { id: 3, name: "Admin", slug: "admin", avatar: "" },
      }),
    ];

    vi.spyOn(blogsService, "getFeaturedBlog").mockResolvedValue(featured);
    vi.spyOn(blogsService, "getBlogs").mockResolvedValue({
      data: list,
      pagination: {
        currentPage: 1,
        perPage: 9,
        totalItems: 5,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });

    render(
      <MemoryRouter>
        <Blogs />
      </MemoryRouter>
    );

    await screen.findByText("Featured Edvanz Story");
    expect(screen.getAllByText("By Edvanz")).toHaveLength(3);
    expect(screen.getByText("By John Smith")).toBeInTheDocument();
    expect(screen.getByText("By Admin")).toBeInTheDocument();
  });

  it("displays normalized author 'Edvanz' on the BlogDetail page when API returns edVanzadmin", async () => {
    vi.spyOn(blogsService, "getBlogBySlug").mockResolvedValue(
      makeDetail({
        id: 10,
        title: "Detail Story Title",
        slug: "detail-story-title",
        author: { id: 1, name: "edVanzadmin", slug: "edvanzadmin", avatar: "" },
        relatedBlogs: [
          makeSummary({
            id: 11,
            title: "Related Story Title",
            slug: "related-story-title",
            author: { id: 1, name: "EdVanzAdmin", slug: "edvanzadmin", avatar: "" },
          }),
        ],
      })
    );

    render(
      <MemoryRouter initialEntries={["/blogs/detail-story-title"]}>
        <Routes>
          <Route path="/blogs/:slug" element={<BlogDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { level: 1 });
    expect(screen.getByText("Edvanz")).toBeInTheDocument();
    expect(screen.getByText("By Edvanz")).toBeInTheDocument();
    expect(screen.queryByText(/edVanzadmin/i)).not.toBeInTheDocument();
  });
});

