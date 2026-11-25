import React from "react";
import { Link } from "react-router-dom";

interface BlogCTASectionProps {
  eyebrow?: string;
  headingPrefix?: string;
  headingHighlight?: string;
  buttonLabel?: string;
  buttonHref?: string;
  className?: string;
  variant?: "light" | "blue";
}

/**
 * BlogCTASection for EDVANZ.
 * Recreates the approved EDVANZ Figma CTA:
 * - variant="light" (Listing Page): Pale blue container, blue heading highlight, blue pill button
 * - variant="blue" (Detail Page): Solid royal blue container, white text, white pill button
 */
export const BlogCTASection: React.FC<BlogCTASectionProps> = ({
  eyebrow = "KEEP EXPLORING",
  headingPrefix = "There's always ",
  headingHighlight = "more to discover.",
  buttonLabel = "Explore All Insights",
  buttonHref = "/blogs",
  className = "",
  variant = "light",
}) => {
  if (variant === "blue") {
    return (
      <section
        aria-label="Keep Exploring"
        className={`w-full   box-border overflow-hidden ${className}`}
      >
        <div className="w-full max-w-[1140px] mx-auto bg-[#2452F5] rounded-[20px] sm:rounded-[24px] px-6 sm:px-10 md:px-12 py-8 sm:py-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md text-white">
          <div className="flex flex-col items-start text-left max-w-[720px]">
            <span className="text-[11px] sm:text-[11.5px] font-extrabold tracking-[2px] uppercase text-blue-200 block">
              {eyebrow}
            </span>
            <h2 className="mt-2 text-[24px] sm:text-[30px] md:text-[34px] leading-[1.2] font-bold text-white tracking-[-0.015em]">
              <span>{headingPrefix}</span>
              <span>{headingHighlight}</span>
            </h2>
          </div>

          <div className="flex-shrink-0">
            <Link
              to={buttonHref}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] sm:text-[14px] font-semibold text-[#2452F5] shadow-sm transition-all duration-200 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#2452F5]"
            >
              <span>{buttonLabel}</span>
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
      </section>
    );
  }

  return (
    <section
      aria-label="Keep Exploring"
      className={`w-full bg-white pb-16 sm:pb-20 lg:pb-24 px-5 sm:px-8 md:px-12 lg:px-14 min-[1440px]:px-[60px] box-border overflow-hidden ${className}`}
    >
      <div className="w-full max-w-[1440px] mx-auto bg-[#F5F8FF] rounded-[20px] sm:rounded-[24px] px-6 sm:px-10 md:px-12 lg:px-14 py-8 sm:py-10 md:py-12 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8 border border-blue-100/90 shadow-xs">
        {/* Left Side: Eyebrow + Heading */}
        <div className="flex flex-col items-start text-left max-w-[720px]">
          <span className="text-[11px] sm:text-[11.5px] font-extrabold tracking-[2.5px] uppercase text-slate-600">
            {eyebrow}
          </span>

          <h2 className="mt-2 sm:mt-2.5 text-[24px] sm:text-[30px] md:text-[34px] lg:text-[36px] leading-[1.2] font-bold text-[#0F172A] tracking-[-0.015em]">
            <span>{headingPrefix}</span>
            <span className="text-[#2563EB]">{headingHighlight}</span>
          </h2>
        </div>

        {/* Right Side: Blue Pill Action Button */}
        <div className="flex-shrink-0">
          <Link
            to={buttonHref}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-6 py-3 text-[13.5px] sm:text-[14px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#1D4ED8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
          >
            <span>{buttonLabel}</span>
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
    </section>
  );
};

export default BlogCTASection;
