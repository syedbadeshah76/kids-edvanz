import React, { useState, useEffect } from "react";
import type { BlogTableOfContentsItem } from "@/types/blogs.types";

interface BlogTableOfContentsProps {
  items?: BlogTableOfContentsItem[];
  className?: string;
  horizontal?: boolean;
}

/**
 * BlogTableOfContents for EDVANZ.
 * Matches the approved EDVANZ Figma visual reference:
 * - Eyebrow: "IN THIS STORY"
 * - Clean numbered horizontal / vertical item list
 * - Active scroll tracking via IntersectionObserver
 * - Smooth anchor scrolling
 */
export const BlogTableOfContents: React.FC<BlogTableOfContentsProps> = ({
  items,
  className = "",
  horizontal = true,
}) => {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    if (!items || items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0% -60% 0%",
        threshold: 0,
      }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.anchor);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  if (!items || items.length === 0) {
    return null;
  }

  const handleScrollToAnchor = (
    e: React.MouseEvent<HTMLAnchorElement>,
    anchor: string
  ) => {
    e.preventDefault();
    const target = document.getElementById(anchor);
    if (target) {
      const yOffset = -90;
      const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
      setActiveId(anchor);
      window.history.pushState(null, "", `#${anchor}`);
    }
  };

  return (
    <nav aria-label="Table of contents" className={className}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-wrap">
        <span className="text-[11px] sm:text-[11.5px] font-bold tracking-[1.5px] uppercase text-slate-500 whitespace-nowrap">
          IN THIS STORY
        </span>

        <div
          className={`flex ${
            horizontal
              ? "flex-col sm:flex-row sm:items-center flex-wrap gap-2.5 sm:gap-5"
              : "flex-col space-y-3"
          }`}
        >
          {items.map((item, index) => {
            const isActive = activeId === item.anchor;
            const displayNum = item.number || String(index + 1).padStart(2, "0");

            return (
              <a
                key={item.anchor || index}
                href={`#${item.anchor}`}
                onClick={(e) => handleScrollToAnchor(e, item.anchor)}
                className={`text-[12.5px] sm:text-[13px] transition-colors duration-200 ${
                  isActive
                    ? "text-[#2563EB] font-bold"
                    : "text-slate-600 font-medium hover:text-[#2563EB]"
                }`}
              >
                <span className="text-slate-400 mr-1 font-normal">
                  {displayNum} /
                </span>
                <span>{item.title}</span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BlogTableOfContents;
