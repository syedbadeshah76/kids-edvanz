import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Blobs from "./Blobs";
import LiveDemoBanner from "./LiveDemoBanner";
import heroLearning from "@/assets/hero-learning.png";
import { usePageMeta } from "@/lib/use-page-meta";

const homeSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://edvanz.co/#website",
      "url": "https://edvanz.co/",
      "name": "Edvanz",
      "publisher": {
        "@id": "https://edvanz.co/#organization"
      }
    },
    {
      "@type": "Organization",
      "@id": "https://edvanz.co/#organization",
      "name": "Edvanz",
      "url": "https://edvanz.co/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://edvanz.co/assets/edvanz%20logo-B63BYItQ.png"
      }
    },
    {
      "@type": "WebPage",
      "@id": "https://edvanz.co/#webpage",
      "url": "https://edvanz.co/",
      "name": "Edvanz | Online IT, Software & Programming Courses",
      "isPartOf": {
        "@id": "https://edvanz.co/#website"
      },
      "about": {
        "@id": "https://edvanz.co/#organization"
      }
    }
  ]
};

export const HeroSection = ({
  onNavigate,
}: { onNavigate?: (page: string) => void } = {}) => {
  usePageMeta({
    title: "Edvanz.co | Online IT, Software & Programming Courses",
    description:
      "Learn in-demand IT, software & programming skills with Edvanz. Explore online courses designed to help learners build practical knowledge & advance their careers. Sign up Now!",
    keywords:
      "Edvanz.co, Online IT Courses, Online Software Courses, Online Programming Courses",
    url: "https://edvanz.co/",
    path: "/",
    schema: homeSchema,
  });

  const navigate = useNavigate();

  const handleExploreClick = () => {
    if (onNavigate) {
      onNavigate("courses");
    } else {
      navigate("/courses");
    }
  };

  const handleJoinClick = () => {
    navigate("/?auth=signup");
  };

  return (
    <section className="relative overflow-hidden pt-4 sm:pt-6 lg:pt-8 pb-16 sm:pb-20 lg:pb-24">
      <Blobs />
      <div className="absolute inset-0 grid-pattern opacity-60" aria-hidden />

      {/* Top Banner for Live Demo Class */}
      <LiveDemoBanner />

      <div className="relative max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-10 lg:gap-14 items-center">
          {/* LEFT — Copy & CTA */}
          <div className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-indigo-600 mb-4"
            >
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              LEARN WITHOUT LIMITS
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
            >
              Edvanz — Your <br />
              Way for <span className="text-indigo-600">Modern</span> <br />
              <span className="text-indigo-600">Learning.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-6 text-slate-600 text-base sm:text-lg leading-relaxed max-w-lg"
            >
              Learn from anywhere, in a way that fits your life. Explore expert-led online courses, live training, and practical learning experiences built around your goals.
            </motion.p>

            <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-6">
              <button
                onClick={handleExploreClick}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 sm:px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                Explore Courses
                <ArrowUpRight className="h-4 w-4 text-white" />
              </button>

              <button
                onClick={handleJoinClick}
                className="inline-flex items-center gap-2 text-base font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Join Edvanz
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Social Proof Avatars */}
            <div className="mt-10 flex items-center gap-3">
              <div className="flex -space-x-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 border-2 border-white">
                  SK
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-700 border-2 border-white">
                  RS
                </span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 border-2 border-white">
                  AM
                </span>
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-700">
                <span className="font-extrabold text-slate-900">10k+</span> curious minds are learning with us
              </span>
            </div>
          </div>

          {/* RIGHT — Existing Hero Learning Image */}
          <motion.div
            initial={{ opacity: 0, x: 30, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="relative min-w-0 w-full flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[640px]">
              <img
                src={heroLearning}
                alt="Edvanz online learning platform"
                className="w-full h-auto object-contain drop-shadow-[0_25px_50px_rgba(79,70,229,0.2)]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
