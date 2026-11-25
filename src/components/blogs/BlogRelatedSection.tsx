import React from "react";
import type { BlogSummary } from "@/types/blogs.types";
import { BlogInsightGridCard } from "./BlogInsightGridCard";

interface BlogRelatedSectionProps {
  relatedBlogs?: BlogSummary[];
  className?: string;
}

/**
 * BlogRelatedSection for EDVANZ.
 * Recreates the "Related Insights & Stories" section from the Figma design:
 * - Eyebrow: "CONTINUE READING"
 * - Heading: "Related Insights & Stories"
 * - Full-width border divider
 * - 3-column grid of BlogInsightGridCard components with Edvanz royal blue accents
 */
export const BlogRelatedSection: React.FC<BlogRelatedSectionProps> = ({
  relatedBlogs,
  className = "",
}) => {
  if (!relatedBlogs || relatedBlogs.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Related Insights"
      className={`w-full bg-[#F8FAFC] border-t border-slate-200/80 py-14 sm:py-16 lg:py-20 px-5 sm:px-8 md:px-12 lg:px-14 min-[1440px]:px-[60px] box-border ${className}`}
    >
      <div className="w-full max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="text-left mb-8 sm:mb-10">
          <span className="text-[11px] sm:text-[11.5px] font-extrabold tracking-[2.5px] uppercase text-[#2563EB] block">
            CONTINUE READING
          </span>
          <h2 className="mt-2 text-[26px] sm:text-[32px] md:text-[36px] font-bold text-[#0F172A] tracking-[-0.015em]">
            Related Insights &amp; Stories
          </h2>
          <div className="mt-4 border-b border-slate-200 w-full" />
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {relatedBlogs.slice(0, 3).map((article, idx) => (
            <BlogInsightGridCard
              key={article.id || article.slug || idx}
              blog={article}
              label={`RELATED / ${String(idx + 1).padStart(2, "0")}`}
              gradientIndex={idx}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogRelatedSection;
