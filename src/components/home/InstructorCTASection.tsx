import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  { value: "100+", label: "active mentors" },
  { value: "10+", label: "learning formats" },
  { value: "4.9", label: "mentor rating" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const InstructorCTASection = ({
  onNavigate,
}: { onNavigate?: (page: string) => void } = {}) => {
  const navigate = useNavigate();

  const handleInstructorClick = () => {
    if (onNavigate) {
      onNavigate("become-instructor");
    } else {
      navigate("/become-instructor");
    }
  };

  return (
    <section className="py-6 sm:py-8 bg-[#f8faff] dark:bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 lg:p-14 text-white shadow-xl"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            {/* Left Content */}
            <div className="max-w-xl">
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-white/70 uppercase">
                For Experts
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                Know something worth sharing? <br className="hidden sm:inline" />
                Come teach it.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/80 leading-relaxed max-w-lg">
                Turn your experience into a learning journey that helps someone take their next big step.
              </p>
              <div className="mt-8">
                <button
                  onClick={handleInstructorClick}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-blue-600 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer"
                >
                  <span>Start teaching</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Right Stats */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-8 sm:gap-12 lg:gap-14 pt-4 lg:pt-0">
              {stats.map((s) => (
                <div key={s.label} className="text-left">
                  <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    {s.value}
                  </div>
                  <div className="mt-1 text-xs sm:text-sm text-white/80 font-normal">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
