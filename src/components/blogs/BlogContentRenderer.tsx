import React, { useMemo } from "react";
import type { BlogContent } from "@/types/blogs.types";
import { sanitizeBlogHtml, cleanHeadingTitle } from "./blog-utils";

interface BlogContentRendererProps {
  content?: BlogContent | string;
  className?: string;
}

/**
 * Enhances sanitized raw HTML from WordPress to match the approved EDVANZ Figma design:
 * - Numbered section headings in Edvanz Royal Blue (01, 02, etc.)
 * - Subtle divider lines between major sections
 * - Exact heading IDs matching table of contents anchors
 */
function enhanceHtmlWithFigmaStyling(rawHtml: string): string {
  if (!rawHtml) return "";
  const sanitized = sanitizeBlogHtml(rawHtml);

  let headingCount = 0;
  // Match <h2> and <h3> tags
  const headingRegex = /<(h[23])(\s+[^>]*)?>(.*?)<\/\1>/gis;

  return sanitized.replace(headingRegex, (match, tag, attrs = "", innerContent) => {
    const plainText = innerContent.replace(/<[^>]+>/g, " ").trim();
    if (!plainText) return match;

    headingCount++;
    const sectionNumber = String(headingCount).padStart(2, "0");
    const cleanTitle = cleanHeadingTitle(plainText);

    // Extract existing id if present in attrs
    const idMatch = attrs.match(/id=["']([^"']+)["']/i);
    const existingId = idMatch ? idMatch[1] : `section-${headingCount}`;

    const isFirst = headingCount === 1;
    const dividerHtml = !isFirst
      ? '<div class="w-full border-t border-slate-200/80 my-10 sm:my-14"></div>'
      : "";

    return `${dividerHtml}<div id="${existingId}" class="flex items-start sm:items-baseline gap-3.5 sm:gap-5 mt-8 sm:mt-12 mb-5 scroll-mt-28 text-left group"><span class="text-[32px] sm:text-[38px] lg:text-[44px] font-extrabold text-[#2563EB] leading-none shrink-0 tracking-tight">${sectionNumber}</span><${tag} class="text-[22px] sm:text-[26px] lg:text-[28px] font-bold text-[#0F172A] leading-[1.25] tracking-tight">${cleanTitle}</${tag}></div>`;
  });
}

export const BlogContentRenderer: React.FC<BlogContentRendererProps> = ({
  content,
  className = "",
}) => {
  const processedHtml = useMemo(() => {
    if (!content) return "";
    const raw = typeof content === "string" ? content : content.html || "";
    return enhanceHtmlWithFigmaStyling(raw);
  }, [content]);

  if (!processedHtml) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm italic">
        Article content will be published shortly.
      </div>
    );
  }

  return (
    <div
      className={`blog-content-prose prose prose-slate lg:prose-lg max-w-none 
        prose-p:text-[#334155] prose-p:text-[16px] sm:prose-p:text-[17px] prose-p:leading-[1.75] prose-p:mb-6
        prose-a:text-[#2563EB] prose-a:font-semibold prose-a:underline hover:prose-a:text-[#1D4ED8]
        prose-strong:text-[#0F172A] prose-strong:font-bold
        prose-ul:my-6 prose-ol:my-6 prose-li:my-2 prose-li:text-[#334155] prose-li:text-[16px]
        prose-img:rounded-2xl prose-img:shadow-md prose-img:my-8 prose-img:w-full
        prose-figure:my-8 prose-figcaption:text-center prose-figcaption:text-xs prose-figcaption:text-slate-500
        prose-blockquote:border-l-4 prose-blockquote:border-[#2563EB] prose-blockquote:bg-[#F0F5FF] prose-blockquote:py-5 prose-blockquote:px-6 prose-blockquote:rounded-r-xl prose-blockquote:text-[#0F172A] prose-blockquote:font-medium prose-blockquote:not-italic
        ${className}`}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
    />
  );
};

export default BlogContentRenderer;
