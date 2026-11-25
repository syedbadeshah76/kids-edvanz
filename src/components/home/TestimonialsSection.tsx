import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Edvanz helped me move from watching tutorials to actually building things I'm proud to show.",
    name: "Aarav Patel",
    role: "Full Stack learner",
    initials: "AP",
  },
  {
    quote: "The live classes feel personal, practical, and easy to fit around my workday.",
    name: "Mia Desai",
    role: "Design learner",
    initials: "MD",
  },
  {
    quote: "I found a clear path instead of a hundred open tabs. That changed how I learn.",
    name: "Rohan Kumar",
    role: "Data learner",
    initials: "RK",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
};

export const TestimonialsSection = () => {
  return (
    <section className="py-16 sm:py-24 bg-[#f8faff] dark:bg-background overflow-hidden">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div {...fadeUp} className="text-center max-w-2xl mx-auto">
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-blue-600 uppercase">
            Learner Stories
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-foreground tracking-tight">
            Loved by <span className="text-blue-600">curious minds</span>
          </h2>
        </motion.div>

        <div className="mt-12 sm:mt-16 grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="bg-white dark:bg-card border border-blue-100/70 dark:border-border/60 rounded-3xl p-8 sm:p-9 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between text-left"
            >
              <div>
                <Quote className="h-6 w-6 text-indigo-500 fill-indigo-500/20" />
                <p className="mt-5 text-slate-700 dark:text-foreground/90 text-sm sm:text-base leading-relaxed">
                  {t.quote}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center justify-center shrink-0">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-foreground">
                    {t.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-muted-foreground">
                    {t.role}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
