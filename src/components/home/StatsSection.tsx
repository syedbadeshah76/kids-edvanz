import { motion } from "framer-motion";

const stats = [
  { value: "10k+", label: "curious learners" },
  { value: "120+", label: "expert courses" },
  { value: "48", label: "learning paths" },
  { value: "4.9/5", label: "average rating" },
];

export const StatsSection = () => {
  return (
    <section className="py-12 sm:py-16 bg-[#f8faff] dark:bg-background">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-blue-600 tracking-tight">
                {s.value}
              </div>
              <div className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-muted-foreground font-normal">
                {s.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
