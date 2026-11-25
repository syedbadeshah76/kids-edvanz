import { motion } from "framer-motion";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const CTASection = ({
  onNavigate,
}: { onNavigate?: (page: string) => void } = {}) => {
  const navigate = useNavigate();

  const handleExploreCourses = () => {
    if (onNavigate) {
      onNavigate("courses");
    } else {
      navigate("/courses");
    }
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-10 sm:py-16 bg-[#f8faff] dark:bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 lg:p-14 text-white shadow-xl"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Left Content */}
            <div className="max-w-xl">
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-white/70 uppercase">
                Your Next Chapter
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Start your learning journey <br className="hidden sm:inline" />
                with Edvanz.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed max-w-lg">
                Choose a course, join a demo, and make room for the future you want to build.
              </p>
            </div>

            {/* Right Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4">
              <button
                onClick={handleExploreCourses}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-blue-600 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer"
              >
                <span>Explore Courses</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleBackToTop}
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/25 px-6 py-3.5 text-sm font-medium text-white transition-all shadow-sm cursor-pointer"
              >
                <span>Back to top</span>
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
