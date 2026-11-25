import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { blogsService } from "@/services/blogs.service";
import type { BlogDetail as IBlogDetail } from "@/types/blogs.types";
import { BlogTableOfContents } from "@/components/blogs/BlogTableOfContents";
import { BlogContentRenderer } from "@/components/blogs/BlogContentRenderer";
import { BlogShareButtons } from "@/components/blogs/BlogShareButtons";
import { BlogRelatedSection } from "@/components/blogs/BlogRelatedSection";
import { BlogCTASection } from "@/components/blogs/BlogCTASection";
import {
  formatBlogDate,
  calculateReadingTime,
  splitHeroTitle,
  resolvePublicAuthorName,
} from "@/components/blogs/blog-utils";
import { usePageMeta } from "@/lib/use-page-meta";

export const BlogDetail: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();

  const [blog, setBlog] = useState<IBlogDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    blogsService
      .getBlogBySlug(slug)
      .then((data) => {
        if (isMounted) {
          setBlog(data);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error("Error loading blog details:", err);
          setError(err?.message || "Blog article could not be found.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const seoTitle = blog?.seo?.title || (blog?.title ? `${blog.title} | Edvanz` : "Edvanz Blog");
  const seoDesc = blog?.seo?.description || blog?.excerpt || "";

  usePageMeta({
    title: seoTitle,
    description: seoDesc,
    path: `/blogs/${slug}`,
    keywords: blog?.seo?.focusKeyword,
    schema: blog
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: blog.title,
          description: seoDesc,
          image: blog.featuredImage?.url ? [blog.featuredImage.url] : [],
          datePublished: blog.date,
          dateModified: blog.modified || blog.date,
          author: {
            "@type": "Person",
            name: blog.author?.name?.trim()
              ? resolvePublicAuthorName(blog.author.name, blog.author.slug)
              : "Edvanz Team",
          },
          publisher: {
            "@type": "Organization",
            name: "Edvanz",
            url: "https://edvanz.co",
          },
        }
      : undefined,
  });

  const dateFormatted = formatBlogDate(blog?.date);
  const readingTime = blog ? calculateReadingTime(blog.content?.html || blog.excerpt) : 1;
  const authorName = blog?.author?.name?.trim()
    ? resolvePublicAuthorName(blog.author.name, blog.author.slug)
    : "Edvanz Editorial";
  const { primary: titlePrimary, highlight: titleHighlight } = splitHeroTitle(blog?.title || "");
  const primaryCategory = blog?.categories?.[0]?.name || "DIGITAL LEARNING";

  return (
    <MainLayout>
      <div className="w-full bg-[#F8FAFC] min-h-screen text-[#0F172A]">
        {/* Loading Skeleton */}
        {isLoading && (
          <div className="w-full bg-[#060C18] text-white pt-12 pb-24">
            <div className="max-w-[1140px] mx-auto px-5 sm:px-8 animate-pulse space-y-6">
              <div className="h-4 w-32 rounded bg-slate-800" />
              <div className="h-16 w-3/4 rounded-2xl bg-slate-800" />
              <div className="h-6 w-1/3 rounded bg-slate-800" />
            </div>
          </div>
        )}

        {/* Error / Not Found State */}
        {!isLoading && (error || !blog) && (
          <div className="max-w-xl mx-auto px-4 py-24 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
              Article Not Found
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {error || "The requested blog post does not exist or may have been unpublished."}
            </p>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1D4ED8] transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to All Articles
            </Link>
          </div>
        )}

        {/* Blog Detail View */}
        {!isLoading && blog && (
          <>
            {/* 1. Dark Hero Section - Matches Approved EDVANZ Figma Hero */}
            <header className="relative w-full bg-[#060C18] text-white pt-10 sm:pt-14 pb-24 sm:pb-32 px-5 sm:px-8 md:px-12 box-border overflow-hidden">
              <div className="relative z-10 w-full max-w-[1140px] mx-auto">
                {/* Breadcrumb Navigation: Home / Blogs */}
                <nav
                  aria-label="Breadcrumb"
                  className="flex items-center gap-2 text-[12px] font-semibold tracking-[1px] text-slate-400"
                >
                  <Link
                    to="/"
                    className="hover:text-white transition-colors duration-200"
                  >
                    Home
                  </Link>
                  <span className="text-slate-600 font-normal">/</span>
                  <Link
                    to="/blogs"
                    className="text-slate-300 hover:text-white transition-colors duration-200"
                  >
                    Blogs
                  </Link>
                </nav>

                {/* Main 2-Column Hero Layout: Left (Title + Badge), Right (Vertical Metadata) */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end justify-between">
                  {/* Left Column: Eyebrow, Giant Title, Badge */}
                  <div className="lg:col-span-8 xl:col-span-9 flex flex-col items-start text-left">
                    {/* Eyebrow: FEATURED INSIGHT • CATEGORY */}
                    <div className="text-[11px] sm:text-[11.5px] font-bold tracking-[2px] uppercase text-slate-400">
                      FEATURED INSIGHT &bull; {primaryCategory}
                    </div>

                    {/* Giant Headline with Two-tone Highlight: Primary (White) + Highlight (Blue) */}
                    <h1 className="mt-4 text-[34px] sm:text-[48px] md:text-[60px] lg:text-[68px] leading-[1.08] tracking-[-0.03em] font-extrabold text-white max-w-[840px] text-left break-words">
                      {titlePrimary ? (
                        <>
                          <span>{titlePrimary}</span>{" "}
                          <span className="text-[#3B82F6]">{titleHighlight}</span>
                        </>
                      ) : (
                        <span className="text-[#3B82F6]">{titleHighlight || blog.title}</span>
                      )}
                    </h1>

                    {/* Sub-badge: • LEARNING WITHOUT LIMITS. */}
                    <div className="mt-8">
                      <span className="inline-flex items-center gap-2 border border-blue-500/35 bg-blue-950/40 text-blue-300 text-[11px] sm:text-[11.5px] font-bold tracking-[2px] uppercase px-3.5 py-1.5 rounded">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        LEARNING WITHOUT LIMITS.
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Vertical Stacked Metadata with Horizontal Line (Figma Spec) */}
                  <div className="lg:col-span-4 xl:col-span-3 flex flex-col items-start text-left w-full max-w-[280px]">
                    {/* Thin Horizontal Separator Line */}
                    <div className="w-48 sm:w-56 lg:w-full border-t border-[#3B82F6]/50 mb-5 sm:mb-6" />

                    {/* Vertically Stacked Metadata */}
                    <div className="flex flex-col items-start gap-3.5 sm:gap-4 text-left text-[14px] sm:text-[15px] font-normal text-slate-300">
                      {/* Author Name */}
                      <span className="text-white font-medium">{authorName}</span>

                      {/* Blue Slash Separator */}
                      <span className="text-[#3B82F6] font-semibold text-base select-none leading-none">/</span>

                      {/* Publication Date */}
                      {dateFormatted && (
                        <>
                          <span>{dateFormatted}</span>
                          <span className="text-[#3B82F6] font-semibold text-base select-none leading-none">/</span>
                        </>
                      )}

                      {/* Reading Time */}
                      <span>{readingTime} min read</span>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* 2. Elevated Main Article Card - Overlaps Dark Hero (Exact Figma Spec) */}
            <main className="w-full px-4 sm:px-6 md:px-8 pb-16 box-border">
              <div className="max-w-[1140px] mx-auto bg-white rounded-2xl sm:rounded-3xl shadow-xl -mt-16 sm:-mt-20 z-20 relative p-6 sm:p-10 md:p-14 border border-slate-100">
                {/* Card Top Bar: IN THIS STORY on left, SHARE THIS INSIGHT on right */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-200">
                  {/* "IN THIS STORY" Navigation */}
                  {blog.tableOfContents && blog.tableOfContents.length > 0 ? (
                    <BlogTableOfContents items={blog.tableOfContents} horizontal />
                  ) : (
                    <div />
                  )}

                  {/* "SHARE THIS INSIGHT" Controls */}
                  <div className="flex-shrink-0">
                    <BlogShareButtons title={blog.title} url={blog.url} />
                  </div>
                </div>

                {/* Featured Image Visual (if available) */}
                {blog.featuredImage?.url && (
                  <div className="my-8 rounded-2xl overflow-hidden border border-slate-100 shadow-sm max-h-[500px]">
                    <img
                      src={blog.featuredImage.url}
                      srcSet={blog.featuredImage.srcset || undefined}
                      sizes={
                        blog.featuredImage.srcset
                          ? blog.featuredImage.sizes || "(min-width: 1140px) 1028px, 100vw"
                          : undefined
                      }
                      width={blog.featuredImage.width || undefined}
                      height={blog.featuredImage.height || undefined}
                      loading="eager"
                      decoding="async"
                      {...({ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>)}
                      alt={blog.featuredImage.alt || blog.title}
                      className="w-full h-full max-h-[500px] object-cover object-center"
                    />
                  </div>
                )}

                {/* Lead Quote Callout Box (Figma Spec) */}
                {blog.excerpt && (
                  <div className="my-8 border-l-4 border-[#2563EB] bg-[#F0F5FF] p-6 sm:p-8 rounded-r-xl">
                    <p className="text-[17px] sm:text-[19px] leading-[1.6] font-semibold text-[#0F172A]">
                      {blog.excerpt}
                    </p>
                  </div>
                )}

                {/* Article Content with Numbered Headings (01, 02...) */}
                <article className="mt-8">
                  <BlogContentRenderer content={blog.content} />
                </article>

                {/* Card Footer: Back to all insights on left, EDVANZ / INSIGHTS on right */}
                <div className="mt-12 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-[1px]">
                  <Link
                    to="/blogs"
                    className="inline-flex items-center gap-1.5 text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                  >
                    <span>BACK TO ALL INSIGHTS</span>
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M4.5 11.5L11.5 4.5M11.5 4.5H6.5M11.5 4.5V9.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>

                  <span className="text-slate-400">EDVANZ / INSIGHTS</span>
                </div>

                {/* Blue Discovery Banner inside/below Article Card (Exact Figma Spec) */}
                <div className="mt-12">
                  <BlogCTASection variant="blue" />
                </div>
              </div>
            </main>

            {/* 3. Related Insights & Stories ("Keep Exploring") */}
            {blog.relatedBlogs && blog.relatedBlogs.length > 0 && (
              <BlogRelatedSection relatedBlogs={blog.relatedBlogs} />
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default BlogDetail;
