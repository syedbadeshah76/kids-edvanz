import React from "react";
import type { BlogSummary } from "@/types/blogs.types";
import { BlogInsightGridCard } from "./BlogInsightGridCard";
import { BlogInsightHorizontalCard } from "./BlogInsightHorizontalCard";

export interface BlogCardProps {
  blog: BlogSummary;
  className?: string;
  compact?: boolean;
  label?: string;
}

/**
 * Universal BlogCard component for EDVANZ.
 * Automatically delegates to BlogInsightHorizontalCard or BlogInsightGridCard
 * to preserve backwards compatibility while delivering exact Figma styling.
 */
export const BlogCard: React.FC<BlogCardProps> = ({
  blog,
  className = "",
  compact = false,
  label,
}) => {
  if (compact) {
    return (
      <BlogInsightHorizontalCard
        blog={blog}
        label={label || "INSIGHT"}
        className={className}
      />
    );
  }

  return (
    <BlogInsightGridCard
      blog={blog}
      label={label || "INSIGHT"}
      className={className}
    />
  );
};

export default BlogCard;
