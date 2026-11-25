import { motion } from "framer-motion";
import { Check } from "lucide-react";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const HowItWorksSection = () => {
  return (
    <section className="py-10 sm:py-14 bg-[#f8faff] dark:bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 sm:p-12 lg:p-16 text-white shadow-xl"
        >
          {/* Subtle decorative glow */}
          <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-12 gap-10 items-center">
            {/* Left Column */}
            <div className="lg:col-span-7">
              <span className="text-xs sm:text-sm font-semibold tracking-wider text-white/70 uppercase">
                Why Edvanz
              </span>
              <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
                An experience built for <br className="hidden sm:inline" />
                the future
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
                From your first lesson to your next opportunity, every detail is designed to make learning feel more human and more useful.
              </p>

              <ul className="mt-6 space-y-3">
                <li className="flex items-center gap-3 text-sm sm:text-base text-white font-medium">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                  <span>Learn from anywhere</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base text-white font-medium">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                  <span>Practice with purpose</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base text-white font-medium">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white shrink-0">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </span>
                  <span>Grow with a community</span>
                </li>
              </ul>
            </div>

            {/* Right Column - Orbital Interactive Visual */}
            <div className="lg:col-span-5 relative w-full h-72 sm:h-80 flex items-center justify-center">
              {/* Orbital Lines SVG */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 400 320"
                fill="none"
              >
                <ellipse
                  cx="210"
                  cy="160"
                  rx="160"
                  ry="115"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="240"
                  cy="145"
                  r="95"
                  stroke="rgba(255,255,255,0.25)"
                  strokeWidth="1.5"
                />
                <circle
                  cx="200"
                  cy="160"
                  r="135"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Top-Right Badge: Live classes */}
              <div className="absolute top-4 sm:top-6 right-4 sm:right-8 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-4 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm">
                Live classes
              </div>

              {/* Center Orbital Node: Learn ∞ your way */}
              <div className="relative z-10 flex flex-col items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-lg border border-white/35 shadow-xl text-center">
                <span className="text-xs text-white/80 font-medium">Learn</span>
                <span className="text-2xl sm:text-3xl font-bold text-white leading-none my-1">
                  ∞
                </span>
                <span className="text-xs text-white/80 font-medium">your way</span>
              </div>

              {/* Bottom-Left Badge: Real projects */}
              <div className="absolute bottom-6 sm:bottom-8 left-2 sm:left-6 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-4 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm">
                Real projects
              </div>

              {/* Bottom-Right Badge: Your future */}
              <div className="absolute bottom-10 sm:bottom-12 right-2 sm:right-6 rounded-full bg-white/15 backdrop-blur-md border border-white/25 px-4 py-1.5 text-xs sm:text-sm font-medium text-white shadow-sm">
                Your future
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
