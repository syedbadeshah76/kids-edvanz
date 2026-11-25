import React from "react";
import { Link } from "react-router-dom";
import type { BlogSummary } from "@/types/blogs.types";
import { formatBlogDate, resolvePublicAuthorName } from "./blog-utils";

interface BlogInsightGridCardProps {
  blog: BlogSummary;
  label?: string;
  className?: string;
  gradientIndex?: number;
}

const GRID_GRADIENTS = [
  "from-[#072430] via-[#0E3B43] to-[#0284C7]", // Teal-slate / blue gradient (Card 04 in Figma)
  "from-[#1F0D33] via-[#3B1261] to-[#7C3AED]", // Royal purple gradient (Card 05 in Figma)
  "from-[#2B0A0A] via-[#5C1414] to-[#DC2626]", // Crimson / red gradient (Card 06 in Figma)
  "from-[#0F172A] via-[#1E293B] to-[#334155]", // Slate fallback
];

/**
 * BlogInsightGridCard for EDVANZ.
 * 3-column vertical grid card matching the approved EDVANZ Figma design:
 * - Rich thematic gradients with uppercase visual headlines
 * - Blue eyebrows (04 / INSIGHT, etc.)
 * - Blue READ MORE ↗ link
 */
export const BlogInsightGridCard: React.FC<BlogInsightGridCardProps> = ({
  blog,
  label = "INSIGHT",
  className = "",
  gradientIndex = 0,
}) => {
  if (!blog) return null;

  const formattedDate = formatBlogDate(blog.date);
  const authorName = resolvePublicAuthorName(blog.author?.name, blog.author?.slug);
  const postUrl = `/blogs/${blog.slug}`;
  const imageUrl = blog.featuredImage?.url;

  const gradientClass =
    GRID_GRADIENTS[gradientIndex % GRID_GRADIENTS.length];
  const visualHeadline = blog.title
    ? blog.title.toUpperCase().replace(/\s+/g, " ").trim()
    : "EDVANZ INSIGHT";

  return (
    <article
      className={`group relative w-full rounded-[20px] sm:rounded-[24px] border border-slate-200/90 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)] transition-all duration-300 flex flex-col overflow-hidden h-full ${className}`}
    >
      {/* Top Visual Block (Image from WordPress CMS or Figma Themed Gradient) */}
      <div className="w-full h-[180px] sm:h-[200px] relative overflow-hidden bg-slate-900 flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            srcSet={blog.featuredImage?.srcset || undefined}
            sizes={
              blog.featuredImage?.srcset
                ? blog.featuredImage.sizes || "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
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
            <span className="text-white text-[15px] sm:text-[17px] font-extrabold uppercase tracking-tight leading-[1.25] line-clamp-3 select-none">
              {visualHeadline}
            </span>
          </div>
        )}
      </div>

      {/* Bottom Content Block */}
      <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
        <div>
          {/* Eyebrow Label in Figma Blue */}
          <span className="text-[11px] sm:text-[11.5px] font-bold tracking-[1.5px] uppercase text-[#2563EB] block">
            {label}
          </span>

          {/* Post Title */}
          <h3 className="mt-2 text-[17px] sm:text-[18px] font-bold text-[#0F172A] leading-[1.35] line-clamp-2 group-hover:text-[#2563EB] transition-colors duration-200">
            <Link
              to={postUrl}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
            >
              {blog.title}
            </Link>
          </h3>
        </div>

        {/* Metadata & Read More Link in Blue */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <p className="text-[12px] text-slate-500 font-normal">
            <span>By {authorName}</span>
            {formattedDate && (
              <>
                <span className="mx-1 text-slate-400">•</span>
                <span>{formattedDate}</span>
              </>
            )}
          </p>

          <Link
            to={postUrl}
            aria-label={`Read article: ${blog.title}`}
            className="text-[12px] sm:text-[12.5px] font-bold tracking-[1px] uppercase text-[#2563EB] hover:text-[#1D4ED8] inline-flex items-center gap-1 transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#2563EB] rounded"
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

export default BlogInsightGridCard;
