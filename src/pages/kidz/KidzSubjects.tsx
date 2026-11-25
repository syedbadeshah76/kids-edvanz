import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { categoriesService } from "@/services/kidz/categories.service";
import type { KidzCategoryDTO } from "@/types/kidz/api.types";

const cardThemes = [
  {
    bgColor: "bg-[#e0f2fe]/90 border-2 border-dashed border-cyan-400 shadow-sm",
    textColor: "text-blue-900",
  },
  {
    bgColor: "bg-[#dbeafe]/90 border border-blue-100",
    textColor: "text-blue-900",
  },
  {
    bgColor: "bg-[#cffaff]/90 border border-cyan-100",
    textColor: "text-cyan-900",
  },
  {
    bgColor: "bg-[#fef9c3]/90 border border-amber-100",
    textColor: "text-amber-900",
  },
  {
    bgColor: "bg-[#f3e8ff]/90 border border-purple-100",
    textColor: "text-purple-900",
  },
  {
    bgColor: "bg-[#ffedd5]/90 border border-orange-100",
    textColor: "text-orange-900",
  },
  {
    bgColor: "bg-[#ffe4e6]/90 border border-rose-100",
    textColor: "text-rose-900",
  },
  {
    bgColor: "bg-[#dbeafe]/90 border border-indigo-100",
    textColor: "text-indigo-900",
  },
  {
    bgColor: "bg-[#dcfce7]/90 border border-emerald-100",
    textColor: "text-emerald-900",
  },
];

function getCategoryEmoji(cat: { name?: string; slug?: string }): string {
  const name = (cat.name || cat.slug || "").toLowerCase();
  if (name.includes("math")) return "➗";
  if (name.includes("politic") || name.includes("social") || name.includes("civic")) return "🏛️";
  if (
    name.includes("web") ||
    name.includes("dev") ||
    name.includes("code") ||
    name.includes("tech") ||
    name.includes("comput") ||
    name.includes("program")
  ) {
    return "💻";
  }
  if (
    name.includes("sci") ||
    name.includes("bio") ||
    name.includes("phys") ||
    name.includes("chem")
  ) {
    return "🧪";
  }
  if (name.includes("eng") || name.includes("read") || name.includes("lit")) return "📖";
  if (name.includes("art") || name.includes("design") || name.includes("craft")) return "🎨";
  if (name.includes("music") || name.includes("audio")) return "🎵";
  if (name.includes("robot") || name.includes("ai") || name.includes("machine")) return "🤖";
  if (name.includes("lang")) return "🗣️";
  if (name.includes("general") || name.includes("knowledge")) return "🧠";
  return "📚";
}

const defaultSubjectCards = [
  {
    id: "default-math",
    name: "MATHEMATICS",
    description: "Interactive Math Courses",
    level: "All levels",
    emoji: "➗",
    bgColor: "bg-[#e0f2fe]/90 border-2 border-dashed border-cyan-400 shadow-sm",
    textColor: "text-blue-900",
  },
  {
    id: "default-pol",
    name: "Political Science",
    description: "Civics & Governance",
    level: "All levels",
    emoji: "🏛️",
    bgColor: "bg-[#dbeafe]/90 border border-blue-100",
    textColor: "text-blue-900",
  },
  {
    id: "default-web",
    name: "Web dev",
    description: "Modern Web Development",
    level: "All Levels",
    emoji: "💻",
    bgColor: "bg-[#cffaff]/90 border border-cyan-100",
    textColor: "text-cyan-900",
  },
];

export function SubjectsPage() {
  useDocumentMeta(
    "Subjects - EDVANZ",
    "Math, science, coding, art, music, robotics and more - pick a subject to dive in.",
  );

  const [categories, setCategories] = useState<KidzCategoryDTO[]>([]);

  useEffect(() => {
    let mounted = true;
    categoriesService
      .getCategories()
      .then((cats) => {
        if (mounted && cats.length > 0) {
          setCategories(cats);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const displayList =
    categories.length > 0
      ? categories.map((cat, idx) => {
          const theme = cardThemes[idx % cardThemes.length];
          return {
            id: cat.id,
            name: cat.name,
            description: cat.description || "Interactive lessons & quizzes",
            level: "All levels",
            emoji: getCategoryEmoji(cat),
            bgColor: theme.bgColor,
            textColor: theme.textColor,
          };
        })
      : defaultSubjectCards;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">PICK A LANE</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">Subjects</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Explore courses and projects by subject category.
        </p>
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {displayList.map((subject) => (
          <Link
            key={subject.id || subject.name}
            to={`/kidz/explore?categoryId=${encodeURIComponent(subject.id)}&subject=${encodeURIComponent(subject.name)}`}
            className={`flex items-center gap-4 rounded-3xl p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${subject.bgColor}`}
          >
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-xs">
              {subject.emoji}
            </div>
            <div>
              <h2 className={`text-base font-black ${subject.textColor}`}>{subject.name}</h2>
              <p className="text-xs font-bold text-slate-500">{subject.description}</p>
              <p className="text-xs font-semibold text-slate-400">{subject.level}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export const KidzSubjects = SubjectsPage;
export default KidzSubjects;
