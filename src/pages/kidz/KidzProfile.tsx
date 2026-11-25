import { Link } from "react-router-dom";
import { useMemo } from "react";
import { BookOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/kidz/kidz-app-state";
import { useAuth } from "@/contexts/kidz/KidzAuthContext";
import { useStudentCourses } from "@/hooks/kidz/useStudentCourses";
import { useDocumentMeta } from "@/lib/kidz/kidz-meta";
import { cn } from "@/lib/utils";

export interface InterestMeta {
  icon: string;
  className: string;
}

export const INTEREST_STYLES: Record<string, InterestMeta> = {
  // Core academic subjects (Figma design & Edit Profile defaults)
  math: { icon: "÷", className: "bg-[#e0e7ff] text-[#4338ca] border-indigo-200" },
  mathematics: { icon: "÷", className: "bg-[#e0e7ff] text-[#4338ca] border-indigo-200" },
  algebra: { icon: "÷", className: "bg-[#e0e7ff] text-[#4338ca] border-indigo-200" },
  geometry: { icon: "📐", className: "bg-[#e0e7ff] text-[#4338ca] border-indigo-200" },

  science: { icon: "🔬", className: "bg-[#ede9fe] text-[#6d28d9] border-purple-200" },
  physics: { icon: "⚛️", className: "bg-[#ede9fe] text-[#6d28d9] border-purple-200" },
  chemistry: { icon: "🧪", className: "bg-[#ede9fe] text-[#6d28d9] border-purple-200" },
  biology: { icon: "🧬", className: "bg-[#ede9fe] text-[#6d28d9] border-purple-200" },

  english: { icon: "📖", className: "bg-[#dbeafe] text-[#1d4ed8] border-blue-200" },
  reading: { icon: "📚", className: "bg-[#dbeafe] text-[#1d4ed8] border-blue-200" },
  writing: { icon: "✍️", className: "bg-[#dbeafe] text-[#1d4ed8] border-blue-200" },
  literature: { icon: "📖", className: "bg-[#dbeafe] text-[#1d4ed8] border-blue-200" },

  coding: { icon: "💻", className: "bg-[#fef3c7] text-[#b45309] border-amber-200" },
  programming: { icon: "💻", className: "bg-[#fef3c7] text-[#b45309] border-amber-200" },
  computer: { icon: "💻", className: "bg-[#fef3c7] text-[#b45309] border-amber-200" },
  robotics: { icon: "🤖", className: "bg-[#fef3c7] text-[#b45309] border-amber-200" },

  music: { icon: "🎶", className: "bg-[#fce7f3] text-[#be185d] border-pink-200" },
  "music & rhythm": { icon: "🎵", className: "bg-[#fce7f3] text-[#be185d] border-pink-200" },

  testing: { icon: "🧪", className: "bg-[#e0f2fe] text-[#0369a1] border-sky-200" },
  art: { icon: "🎨", className: "bg-[#fdf4ff] text-[#a21caf] border-fuchsia-200" },
  "making art": { icon: "🎨", className: "bg-[#fdf4ff] text-[#a21caf] border-fuchsia-200" },
  craft: { icon: "✂️", className: "bg-[#fdf4ff] text-[#a21caf] border-fuchsia-200" },

  // Activity & thematic interests
  "building things": { icon: "🛠️", className: "bg-[#ffedd5] text-[#c2410c] border-orange-200" },
  "solving puzzles": { icon: "🧩", className: "bg-[#ecfdf5] text-[#047857] border-emerald-200" },
  puzzle: { icon: "🧩", className: "bg-[#ecfdf5] text-[#047857] border-emerald-200" },
  puzzles: { icon: "🧩", className: "bg-[#ecfdf5] text-[#047857] border-emerald-200" },
  "creative stories": { icon: "✍️", className: "bg-[#fef3c7] text-[#b45309] border-amber-200" },
  "discovering nature": { icon: "🌱", className: "bg-[#f0fdf4] text-[#15803d] border-green-200" },
  nature: { icon: "🌱", className: "bg-[#f0fdf4] text-[#15803d] border-green-200" },

  history: { icon: "🏛️", className: "bg-[#fef2f2] text-[#b91c1c] border-red-200" },
  geography: { icon: "🌍", className: "bg-[#ecfeff] text-[#0e7490] border-cyan-200" },
  gaming: { icon: "🎮", className: "bg-[#f3e8ff] text-[#7e22ce] border-purple-200" },
  sports: { icon: "⚽", className: "bg-[#f0fdf4] text-[#166534] border-green-200" },
  space: { icon: "🚀", className: "bg-[#e0e7ff] text-[#4338ca] border-indigo-200" },
};

export const getInterestMeta = (interest: string): InterestMeta => {
  const key = (interest || "").trim().toLowerCase();
  return (
    INTEREST_STYLES[key] ?? {
      icon: "✨",
      className: "bg-slate-100 text-slate-700 border-slate-200",
    }
  );
};

export function ProfilePage() {
  useDocumentMeta(
    "Profile - EDVANZ",
    "Your EDVANZ profile: level, XP, interests, badges and certificates.",
  );

  const { profile, interests } = useAppState();
  const { user, profile: authProfile } = useAuth();
  const { enrolledCourses } = useStudentCourses();

  const studentName =
    user?.displayName ||
    [authProfile?.firstName, authProfile?.lastName].filter(Boolean).join(" ") ||
    profile.name;

  const isValidHttpUrl = (url?: unknown): url is string =>
    typeof url === "string" && /^https?:\/\//i.test(url.trim());

  const avatar =
    (user?.avatarUrl && isValidHttpUrl(user.avatarUrl))
      ? user.avatarUrl.trim()
      : (authProfile?.avatarUrl && isValidHttpUrl(authProfile.avatarUrl))
      ? authProfile.avatarUrl.trim()
      : "";

  const totalLessonsDone = enrolledCourses.reduce(
    (acc, curr) => acc + Math.round(((curr.progressPercentage ?? 0) / 100) * (curr.course?.totalLessons ?? 10)),
    0,
  );

  const completedCoursesCount = enrolledCourses.filter((c) => (c.progressPercentage ?? 0) === 100).length;
  const inProgressCoursesCount = enrolledCourses.filter((c) => (c.progressPercentage ?? 0) < 100).length;

  const stats = [
    { value: String(enrolledCourses.length), label: "Courses enrolled" },
    { value: String(inProgressCoursesCount), label: "In progress" },
    { value: String(totalLessonsDone), label: "Lessons done" },
    { value: String(completedCoursesCount), label: "Completed courses" },
  ];

  // Resolve user interests dynamically (strictly user-added)
  const displayInterests = useMemo(() => {
    const raw =
      (authProfile as any)?.interests ||
      profile?.preferredSubjects ||
      interests;
    if (Array.isArray(raw) && raw.length > 0) {
      const list = raw
        .map((item: any) =>
          typeof item === "string" ? item : item?.interest || item?.name,
        )
        .map((s: any) => String(s || "").trim())
        .filter(Boolean);
      if (list.length > 0) return Array.from(new Set(list));
    }
    return [];
  }, [authProfile, profile, interests]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-12">
      {/* Header */}
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-blue-600">YOU</p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">Profile</h1>
      </div>

      {/* Hero Banner Card */}
      <section className="relative flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-[#ddd6fe] bg-gradient-to-r from-[#c7d2fe]/90 via-[#ede9fe] to-[#e0e7ff] p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-orange-100 text-4xl shadow-md border-2 border-white overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={studentName} className="size-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-slate-700">
                {studentName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">{studentName}</h2>
            <p className="text-xs font-bold text-slate-600">
              {enrolledCourses.length} {enrolledCourses.length === 1 ? "course" : "courses"} enrolled · {completedCoursesCount} completed
            </p>
          </div>
        </div>

        <Button
          asChild
          className="rounded-full bg-white px-6 py-5 text-xs font-bold text-blue-600 shadow-sm hover:bg-slate-50 border-none active:scale-95"
        >
          <Link to="/kidz/profile/edit">Edit Profile</Link>
        </Button>
      </section>

      {/* 4 Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
            <p className="text-xs font-bold text-slate-400">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Interests Card */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Interesting Subjects</h3>
          <Link to="/kidz/profile/edit" className="text-xs font-bold text-blue-600 hover:underline">
            Manage
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {displayInterests.length > 0 ? (
            displayInterests.map((interest: string) => {
              const meta = getInterestMeta(interest);
              return (
                <span
                  key={interest}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold shadow-2xs transition-transform hover:scale-105",
                    meta.className
                  )}
                >
                  <span className="text-sm leading-none">{meta.icon}</span>
                  <span>{interest}</span>
                </span>
              );
            })
          ) : (
            <p className="text-xs font-semibold text-slate-400">
              No interests selected yet. Add interests in your profile settings!
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export const KidzProfile = ProfilePage;
export default KidzProfile;
