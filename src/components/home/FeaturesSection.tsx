import { motion } from "framer-motion";

const features = [
  {
    number: "01",
    title: "Flexible learning",
    text: "Learn live, learn on demand, or make a little progress between everything else.",
  },
  {
    number: "02",
    title: "Expert-led in one place",
    text: "Learn from practitioners who bring the context, feedback, and shortcuts textbooks miss.",
  },
  {
    number: "03",
    title: "Simplified experiences",
    text: "Clear lessons, useful projects, and a calm space to focus on what comes next.",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const FeaturesSection = () => {
  return (
    <section className="relative py-16 sm:py-24 bg-[#f8faff] dark:bg-background overflow-hidden">
      <div className="relative container mx-auto px-4 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-600 uppercase">
            Made for Real Life
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-foreground tracking-tight">
            Learning that actually <span className="text-blue-600">fits your life.</span>
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Your goals are personal, so your learning should be too. Choose the format, pace, and path that keeps you inspired.
          </p>
        </motion.div>

        <div className="mt-12 sm:mt-16 grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <motion.div
              key={feature.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white dark:bg-card border border-blue-100/70 dark:border-border/60 rounded-3xl p-8 sm:p-10 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-left flex flex-col justify-start"
            >
              <div className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold text-xs tracking-wide w-fit">
                {feature.number}
              </div>
              <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-foreground">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">
                {feature.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
