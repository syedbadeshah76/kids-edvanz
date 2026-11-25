import React from "react";
import type { BlogSummary } from "@/types/blogs.types";
import { FeaturedBlogCard } from "./FeaturedBlogCard";
import { BlogInsightHorizontalCard } from "./BlogInsightHorizontalCard";

interface BlogFeaturedSectionProps {
  featured: BlogSummary;
  secondary?: BlogSummary[];
  className?: string;
}

/**
 * BlogFeaturedSection for EDVANZ.
 * Renders the top editorial asymmetric section from the Figma design:
 * - Left: 1 large FeaturedBlogCard (01 / FEATURED STORY)
 * - Right: 2 stacked horizontal split cards (02 / INSIGHT, 03 / INSIGHT)
 */
export const BlogFeaturedSection: React.FC<BlogFeaturedSectionProps> = ({
  featured,
  secondary = [],
  className = "",
}) => {
  if (!featured) return null;

  const hasSecondary = Array.isArray(secondary) && secondary.length > 0;

  return (
    <section className={`mb-12 sm:mb-16 ${className}`} aria-label="Featured Articles">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
        {/* Left Featured Card (Item 01) */}
        <div className={hasSecondary ? "lg:col-span-7" : "lg:col-span-12"}>
          <FeaturedBlogCard
            blog={featured}
            label="FEATURED STORY / 01"
            className="h-full"
          />
        </div>

        {/* Right Secondary Stack (Items 02 & 03) */}
        {hasSecondary && (
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            {secondary.slice(0, 2).map((item, index) => {
              const label = `${String(index + 2).padStart(2, "0")} / INSIGHT`;
              return (
                <BlogInsightHorizontalCard
                  key={item.id || item.slug || index}
                  blog={item}
                  label={label}
                  gradientIndex={index}
                  className="h-full"
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogFeaturedSection;
