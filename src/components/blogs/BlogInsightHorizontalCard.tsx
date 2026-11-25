import React from "react";
import { Link } from "react-router-dom";
import type { BlogSummary } from "@/types/blogs.types";
import { formatBlogDate, resolvePublicAuthorName } from "./blog-utils";

interface BlogInsightHorizontalCardProps {
  blog: BlogSummary;
  label: string;
  className?: string;
  gradientIndex?: number;
}

const HORIZONTAL_GRADIENTS = [
  "from-[#2A1608] via-[#853C07] to-[#D97706]", // Warm amber / orange (Card 02 in Figma)
  "from-[#1C1A0E] via-[#5C5320] to-[#997F29]", // Olive / gold-brown (Card 03 in Figma)
];

const FALLBACK_THEME_HEADLINES = [
  "THE POWER OF DATA VISUALS",
  "WHAT'S REPLACING TRADITIONAL CLASSROOM LEARNING?",
];

/**
 * BlogInsightHorizontalCard for EDVANZ.
 * Secondary horizontal split card for items 02 and 03.
 * Matches the approved EDVANZ Figma layout and hierarchy:
 * 1. Eyebrow: 02 / INSIGHT or 03 / INSIGHT
 * 2. Full actual blog title from WordPress API
 * 3. Author and publication date directly below title: By HSB Infotech • {formattedDate}
 * 4. READ MORE ↗ action positioned towards the bottom
 */
export const BlogInsightHorizontalCard: React.FC<BlogInsightHorizontalCardProps> = ({
  blog,
  label,
  className = "",
  gradientIndex = 0,
}) => {
  if (!blog) return null;

  const formattedDate = formatBlogDate(blog.date);
  const authorName = resolvePublicAuthorName(blog.author?.name, blog.author?.slug);
  const postUrl = `/blogs/${blog.slug}`;
  const imageUrl = blog.featuredImage?.url;

  const gradientClass =
    HORIZONTAL_GRADIENTS[gradientIndex % HORIZONTAL_GRADIENTS.length];
  const visualFallbackHeadline =
    FALLBACK_THEME_HEADLINES[gradientIndex % FALLBACK_THEME_HEADLINES.length];

  return (
    <article
      className={`group relative w-full rounded-[20px] sm:rounded-[24px] border border-slate-200/90 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)] transition-all duration-300 flex flex-col sm:flex-row min-h-[250px] sm:min-h-[270px] overflow-hidden ${className}`}
    >
      {/* Left Visual Block (42% width on desktop) */}
      <div className="w-full sm:w-[42%] h-[180px] sm:h-auto min-h-[160px] sm:min-h-full relative overflow-hidden bg-slate-900 flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            srcSet={blog.featuredImage?.srcset || undefined}
            sizes={
              blog.featuredImage?.srcset
                ? blog.featuredImage.sizes || "(min-width: 1024px) 18vw, (min-width: 640px) 42vw, 100vw"
                : undefined
            }
            width={blog.featuredImage?.width || undefined}
            height={blog.featuredImage?.height || undefined}
            loading="lazy"
            decoding="async"
            alt={blog.featuredImage?.alt || blog.title}
            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradientClass} flex items-center justify-center p-6 text-center`}
          >
            <span className="text-white text-[16px] sm:text-[18px] font-extrabold uppercase tracking-tight leading-[1.25] line-clamp-4 select-none">
              {visualFallbackHeadline}
            </span>
          </div>
        )}
      </div>

      {/* Right Content Block (58% width on desktop) */}
      <div className="w-full sm:w-[58%] p-6 sm:p-7 lg:p-8 flex flex-col justify-between">
        <div className="flex flex-col items-start text-left">
          {/* 1. Eyebrow Label in Figma Blue */}
          <span className="text-[11px] sm:text-[11.5px] font-bold tracking-[1.5px] uppercase text-[#2563EB] block">
            {label}
          </span>

          {/* 2. Full Actual Post Title from WordPress API */}
          <h3 className="mt-2.5 text-[17px] sm:text-[19px] lg:text-[20px] font-bold text-[#0F172A] leading-[1.3] group-hover:text-[#2563EB] transition-colors duration-200">
            <Link
              to={postUrl}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded hover:underline"
            >
              {blog.title}
            </Link>
          </h3>

          {/* 3. Author and publication date directly below title */}
          <p className="mt-3 text-[12.5px] sm:text-[13px] text-slate-500 font-normal">
            <span>By {authorName}</span>
            {formattedDate && (
              <>
                <span className="mx-1.5 text-slate-400">•</span>
                <span>{formattedDate}</span>
              </>
            )}
          </p>
        </div>

        {/* 4. READ MORE ↗ action positioned towards the bottom */}
        <div className="mt-6 pt-2 text-left">
          <Link
            to={postUrl}
            aria-label={`Read article: ${blog.title}`}
            className="text-[12px] sm:text-[12.5px] font-bold tracking-[1px] uppercase text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1.5 transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB] rounded"
          >
            <span aria-hidden="true">READ MORE</span>
            <span className="sr-only">Read article: {blog.title}</span>
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M4.5 11.5L11.5 4.5M11.5 4.5H5.5M11.5 4.5V10.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
};

export default BlogInsightHorizontalCard;
