import React from "react";
import { Link } from "react-router-dom";
import type { BlogSummary } from "@/types/blogs.types";
import { formatBlogDate, resolvePublicAuthorName } from "./blog-utils";

interface FeaturedBlogCardProps {
  blog: BlogSummary;
  label?: string;
  className?: string;
}

/**
 * FeaturedBlogCard for EDVANZ.
 * Matches the approved EDVANZ Figma design:
 * - Solid vibrant Edvanz Royal Blue background (#2452F5 / #2563EB)
 * - Large uppercase editorial headline
 * - Article title and metadata
 * - White rounded-full pill button "Read feature ↗"
 */
export const FeaturedBlogCard: React.FC<FeaturedBlogCardProps> = ({
  blog,
  label = "FEATURED STORY / 01",
  className = "",
}) => {
  if (!blog) return null;

  const formattedDate = formatBlogDate(blog.date);
  const authorName = resolvePublicAuthorName(blog.author?.name, blog.author?.slug);
  const postUrl = `/blogs/${blog.slug}`;
  const imageUrl = blog.featuredImage?.url;

  // Extract a clean bold punchy display title for the background visual
  const heroDisplayTitle = blog.title
    ? blog.title.toUpperCase().replace(/\s+/g, " ").trim()
    : "THE NEXT LEARNING REVOLUTION";

  return (
    <article
      className={`group relative w-full h-full min-h-[480px] sm:min-h-[540px] lg:min-h-[560px] rounded-[20px] sm:rounded-[24px] overflow-hidden bg-[#2452F5] text-white flex flex-col justify-between p-6 sm:p-8 lg:p-10 shadow-md transition-all duration-300 hover:shadow-2xl ${className}`}
    >
      {/* Background visual: either CMS image with dark blue overlay, or vibrant Edvanz Blue typography */}
      {imageUrl ? (
        <div className="absolute inset-0 z-0">
          <img
            src={imageUrl}
            srcSet={blog.featuredImage?.srcset || undefined}
            sizes={
              blog.featuredImage?.srcset
                ? blog.featuredImage.sizes || "(min-width: 1024px) 58vw, 100vw"
                : undefined
            }
            width={blog.featuredImage?.width || undefined}
            height={blog.featuredImage?.height || undefined}
            loading="eager"
            decoding="async"
            {...({ fetchpriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>)}
            alt={blog.featuredImage?.alt || blog.title}
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#1E3A8A]/80 to-[#2452F5]/60" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#2452F5] via-[#1D4ED8] to-[#1E40AF] p-8 sm:p-10 flex flex-col justify-start">
          <span className="text-[28px] sm:text-[36px] md:text-[42px] font-extrabold uppercase leading-[1.1] tracking-tight text-white/95 max-w-[480px] line-clamp-4 select-none">
            {heroDisplayTitle}
          </span>
        </div>
      )}

      {/* Top Area: Label */}
      <div className="relative z-10">
        <span className="inline-block text-[11px] sm:text-[11.5px] font-bold tracking-[1.5px] uppercase text-white/80">
          {label}
        </span>
      </div>

      {/* Bottom Area: Title, Metadata & White Pill CTA Button */}
      <div className="relative z-10 mt-auto pt-16 sm:pt-20">
        <h2 className="text-[20px] sm:text-[24px] lg:text-[26px] xl:text-[28px] font-bold text-white leading-[1.3] tracking-[-0.015em] transition-colors duration-200">
          <Link
            to={postUrl}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded hover:underline"
          >
            {blog.title}
          </Link>
        </h2>

        {/* Metadata */}
        <p className="mt-2.5 text-[12.5px] sm:text-[13px] text-white/85 font-normal">
          <span>By {authorName}</span>
          {formattedDate && (
            <>
              <span className="mx-2 text-white/60">•</span>
              <span>{formattedDate}</span>
            </>
          )}
        </p>

        {/* CTA Button: Exact Figma White Rounded-Full Pill */}
        <div className="mt-6">
          <Link
            to={postUrl}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-2.5 text-[13.5px] sm:text-[14px] font-semibold text-slate-900 shadow-md transition-all duration-200 hover:bg-slate-100 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
          >
            <span>Read feature</span>
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

export default FeaturedBlogCard;
