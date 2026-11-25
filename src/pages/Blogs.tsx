import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, RotateCcw, BookOpen, AlertCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { blogsService } from "@/services/blogs.service";
import type {
  BlogCategory,
  BlogDetail,
  BlogPagination,
  BlogSummary,
} from "@/types/blogs.types";
import { BlogFeaturedSection } from "@/components/blogs/BlogFeaturedSection";
import { BlogInsightGridCard } from "@/components/blogs/BlogInsightGridCard";
import { BlogCTASection } from "@/components/blogs/BlogCTASection";
import { selectLatestPublishedBlog } from "@/components/blogs/blog-utils";
import { usePageMeta } from "@/lib/use-page-meta";

export const Blogs: React.FC = () => {
  usePageMeta({
    title: "Edvanz Blogs & Articles | Latest Insights, Tech Trends & Career Advice",
    description:
      "Explore the latest articles, technology guides, and career insights from Edvanz educators and industry experts.",
    path: "/blogs",
    keywords: "tech blogs, software engineering guides, IT courses, edvanz blog",
  });

  // State
  const [featuredBlog, setFeaturedBlog] = useState<BlogDetail | null>(null);
  const [blogs, setBlogs] = useState<BlogSummary[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [pagination, setPagination] = useState<BlogPagination>({
    currentPage: 1,
    perPage: 9,
    totalItems: 0,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedInitialFeaturedRef = useRef<boolean>(false);
  const hasFetchedCategoriesRef = useRef<boolean>(false);
  const latestRequestIdRef = useRef<number>(0);

  // Fetch published blogs first; only request featured-blog and categories when blogs exist
  const loadBlogData = useCallback(async (page = 1, category = "all", search = "") => {
    const requestId = ++latestRequestIdRef.current;
    setIsLoading(true);
    setError(null);

    const trimmedSearch = search.trim();
    const isInitialListingView = page === 1 && category === "all" && !trimmedSearch;

    try {
      const listParams = {
        page,
        per_page: 9,
        category: category !== "all" ? category : undefined,
        search: trimmedSearch ? trimmedSearch : undefined,
      };

      const listRes = await blogsService.getBlogs(listParams);
      if (requestId !== latestRequestIdRef.current) return;

      const hasPublishedBlogs = listRes.data.length > 0;
      const shouldFetchFeatured =
        hasPublishedBlogs && isInitialListingView && !hasFetchedInitialFeaturedRef.current;
      const shouldFetchCategories =
        hasPublishedBlogs && !hasFetchedCategoriesRef.current;

      if (shouldFetchFeatured || shouldFetchCategories) {
        const [featuredRes, categoriesRes] = await Promise.allSettled([
          shouldFetchFeatured ? blogsService.getFeaturedBlog() : Promise.resolve(undefined),
          shouldFetchCategories ? blogsService.getCategories() : Promise.resolve(undefined),
        ]);

        if (requestId !== latestRequestIdRef.current) return;

        if (shouldFetchCategories) {
          hasFetchedCategoriesRef.current = true;
          if (categoriesRes.status === "fulfilled" && Array.isArray(categoriesRes.value)) {
            setCategories(categoriesRes.value);
          } else if (categoriesRes.status === "rejected") {
            console.error("Error loading categories:", categoriesRes.reason);
          }
        }

        if (shouldFetchFeatured) {
          if (featuredRes.status === "rejected") {
            setFeaturedBlog(null);
            throw featuredRes.reason || new Error("Failed to load featured blog.");
          }
          setFeaturedBlog(featuredRes.value ?? null);
          hasFetchedInitialFeaturedRef.current = true;
        }
      }

      setBlogs(listRes.data);
      setPagination(listRes.pagination);
    } catch (err: any) {
      if (requestId !== latestRequestIdRef.current) return;
      console.error("Error loading blogs:", err);
      setError(
        "We're having trouble loading our stories right now. Please try again in a moment."
      );
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadBlogData(pagination.currentPage, selectedCategory, searchQuery);
    return () => {
      latestRequestIdRef.current += 1;
    };
  }, [pagination.currentPage, selectedCategory, searchQuery, loadBlogData]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // Handle Category click
  const handleCategorySelect = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // Deduplication logic:
  // When on Page 1 without a search filter, show featured blog (01) + 2 secondary blogs (02, 03) at top.
  // When no explicit featured blog exists, fall back to the latest published blog sorted by date DESC.
  // The remaining grid should exclude any blog shown in the top featured section.
  const { featuredSectionData, gridBlogs, gridStartIndex } = useMemo(() => {
    const isFirstPageDefault = pagination.currentPage === 1 && !searchQuery.trim();

    if (!isFirstPageDefault || blogs.length === 0) {
      return {
        featuredSectionData: null,
        gridBlogs: blogs,
        gridStartIndex: (pagination.currentPage - 1) * pagination.perPage + 1,
      };
    }

    const featured = featuredBlog ?? selectLatestPublishedBlog(blogs);
    if (!featured) {
      return {
        featuredSectionData: null,
        gridBlogs: blogs,
        gridStartIndex: 1,
      };
    }

    // Secondary blogs: next 2 blogs not equal to featured
    const candidates = blogs.filter(
      (b) => b.id !== featured.id && b.slug !== featured.slug
    );
    const secondary = candidates.slice(0, 2);
    const secondaryIds = new Set(secondary.map((s) => s.id));

    // Grid blogs: remaining blogs excluding featured and secondary
    const remaining = candidates.filter((b) => !secondaryIds.has(b.id));

    return {
      featuredSectionData: {
        featured,
        secondary,
      },
      gridBlogs: remaining,
      gridStartIndex: 4, // 01 is featured, 02 and 03 are secondary
    };
  }, [featuredBlog, blogs, pagination.currentPage, pagination.perPage, searchQuery]);

  return (
    <MainLayout>
      <div className="w-full bg-white min-h-screen text-[#0F172A]">
        {/* Listing Header Section - Matches EDVANZ Figma Header */}
        <section className="w-full pt-10 sm:pt-14 pb-4 px-5 sm:px-8 md:px-12 lg:px-14 min-[1440px]:px-[60px] box-border">
          <div className="w-full max-w-[1440px] mx-auto">
            {/* Top Eyebrow in grey, matching Figma */}
            <span className="text-[11px] sm:text-[11.5px] font-bold tracking-[2.5px] uppercase text-slate-500 block">
              INSIGHTS &amp; IDEAS
            </span>

            {/* Main Title: Latest from Edvanz with Edvanz in Royal Blue */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mt-2">
              <div>
                <h1 className="text-[32px] sm:text-[40px] md:text-[46px] leading-[1.12] font-extrabold text-[#0F172A] tracking-[-0.015em]">
                  Latest from <span className="text-[#2563EB]">Edvanz</span>
                </h1>
              </div>

              {/* Search Form */}
              {/* <form
                onSubmit={handleSearchSubmit}
                className="relative w-full max-w-md shrink-0"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search articles, topics, skills..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-[#0F172A] shadow-xs transition-all focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </form> */}
            </div>

            {/* Horizontal Line right below heading spanning full width (Exact Figma Spec) */}
            <div className="mt-4 mb-6 border-b border-slate-200 w-full" />

            {/* Category Filter Pills (if categories exist) */}
            {/* {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => handleCategorySelect("all")}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 ${
                    selectedCategory === "all"
                      ? "bg-[#2563EB] text-white shadow-xs"
                      : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  All Topics
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.slug)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      selectedCategory === cat.slug
                        ? "bg-[#2563EB] text-white shadow-xs"
                        : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{cat.name}</span>
                    {cat.count !== undefined && (
                      <span className="text-[10px] opacity-75">({cat.count})</span>
                    )}
                  </button>
                ))}
              </div>
            )} */}
          </div>
        </section>

        {/* Main Content Area */}
        <section className="w-full px-5 sm:px-8 md:px-12 lg:px-14 min-[1440px]:px-[60px] pb-16 box-border">
          <div className="w-full max-w-[1440px] mx-auto">
            {/* Error State */}
            {!isLoading && error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 mb-8">
                <div className="inline-flex items-center gap-2 font-bold mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>Unable to load articles</span>
                </div>
                <p className="text-sm mb-4">{error}</p>
                <button
                  type="button"
                  onClick={() =>
                    loadBlogData(pagination.currentPage, selectedCategory, searchQuery)
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try Again
                </button>
              </div>
            )}

            {/* Loading Skeletons */}
            {isLoading && (
              <div className="space-y-8 animate-pulse">
                <div className="h-[480px] rounded-3xl bg-slate-100" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-80 rounded-2xl bg-slate-100" />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <>
                {/* Asymmetrical Featured Section on Page 1 */}
                {featuredSectionData && (
                  <BlogFeaturedSection
                    featured={featuredSectionData.featured}
                    secondary={featuredSectionData.secondary}
                  />
                )}

                {/* 3-Column Listing Grid (Items 04+) */}
                {gridBlogs.length > 0 ? (
                  <div>
                    {selectedCategory !== "all" && (
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
                          Articles in "{categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}"
                        </h2>
                        <span className="text-xs text-slate-500 font-medium">
                          Showing {gridBlogs.length} of {pagination.totalItems} articles
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                      {gridBlogs.map((blog, idx) => {
                        const itemNumber = gridStartIndex + idx;
                        const label = `${String(itemNumber).padStart(2, "0")} / INSIGHT`;
                        return (
                          <BlogInsightGridCard
                            key={blog.id}
                            blog={blog}
                            label={label}
                            gradientIndex={idx}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : !featuredSectionData ? (
                  /* Empty state when no blogs match search or filter */
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#2563EB] mb-4">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A] mb-1">
                      No articles found
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
                      {searchQuery
                        ? `No stories matched your search for "${searchQuery}".`
                        : "We're preparing fresh insights, updates and stories for you. Check back soon to explore what's new at Edvanz."}
                    </p>
                    {(searchQuery || selectedCategory !== "all") && (
                      <button
                        onClick={() => {
                          setSearchInput("");
                          setSearchQuery("");
                          setSelectedCategory("all");
                        }}
                        className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#1D4ED8] transition"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Pagination Controls */}
                {pagination.totalPages > 1 && (
                  <div className="mt-14 flex items-center justify-center gap-3">
                    <button
                      disabled={!pagination.hasPreviousPage}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          currentPage: Math.max(1, prev.currentPage - 1),
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-semibold text-slate-500 px-3">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      disabled={!pagination.hasNextPage}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          currentPage: Math.min(
                            prev.totalPages,
                            prev.currentPage + 1
                          ),
                        }))
                      }
                      className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* Bottom Discovery CTA Section ("There's always more to discover.") */}
        <BlogCTASection variant="light" />
      </div>
    </MainLayout>
  );
};

export default Blogs;
